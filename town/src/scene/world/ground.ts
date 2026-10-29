// The ground layer: islands and sea, roads with markings and zebra crossings,
// sidewalks with kerbs, paved yards, shore paths, bridges and the pier.
import * as THREE from 'three'
import { BRIDGES, CELLS, GE, ISLAND, ISLET, ISLETS, L, PIER, REACH, RING, ROAD, SO, toWorld, DISTRICTS, BACK_Z, DESK_Z } from '../layout'
import { Batcher, C, box, cyl, slab } from '../kit'
import { shoreMask } from '../textures'

/** A coarse occupancy grid so decorations never land on roads, paths or buildings. */
export class Occupancy {
  readonly size = 440
  readonly res = 0.5
  private grid: Uint8Array
  private n: number
  constructor() {
    this.n = Math.round(this.size / this.res)
    this.grid = new Uint8Array(this.n * this.n)
  }
  private ix(x: number) { return Math.floor((x + this.size / 2) / this.res) }
  rect(x0: number, z0: number, x1: number, z1: number) {
    const a = Math.max(0, this.ix(Math.min(x0, x1))), b = Math.min(this.n - 1, this.ix(Math.max(x0, x1)))
    const c = Math.max(0, this.ix(Math.min(z0, z1))), d = Math.min(this.n - 1, this.ix(Math.max(z0, z1)))
    for (let j = c; j <= d; j += 1) for (let i = a; i <= b; i += 1) this.grid[j * this.n + i] = 1
  }
  circle(x: number, z: number, r: number) {
    const a = Math.max(0, this.ix(x - r)), b = Math.min(this.n - 1, this.ix(x + r))
    const c = Math.max(0, this.ix(z - r)), d = Math.min(this.n - 1, this.ix(z + r))
    for (let j = c; j <= d; j += 1) for (let i = a; i <= b; i += 1) {
      const cx = (i + 0.5) * this.res - this.size / 2, cz = (j + 0.5) * this.res - this.size / 2
      if (Math.hypot(cx - x, cz - z) <= r) this.grid[j * this.n + i] = 1
    }
  }
  /** a thick line segment */
  line(x0: number, z0: number, x1: number, z1: number, halfWidth: number) {
    const len = Math.hypot(x1 - x0, z1 - z0)
    const steps = Math.max(1, Math.ceil(len / (this.res * 0.8)))
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps
      this.circle(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, halfWidth)
    }
  }
  free(x: number, z: number, r: number): boolean {
    const a = this.ix(x - r), b = this.ix(x + r), c = this.ix(z - r), d = this.ix(z + r)
    if (a < 0 || c < 0 || b >= this.n || d >= this.n) return false
    for (let j = c; j <= d; j += 1) for (let i = a; i <= b; i += 1) if (this.grid[j * this.n + i]) return false
    return true
  }
}

export function inRounded(x: number, z: number, cx: number, cz: number, half: number, corner: number, margin = 0): boolean {
  const lim = half - margin
  const ax = Math.abs(x - cx), az = Math.abs(z - cz)
  if (ax > lim || az > lim) return false
  const c = lim - corner
  if (ax > c && az > c) return Math.hypot(ax - c, az - c) <= corner
  return true
}

export function onLand(x: number, z: number, margin = 0): boolean {
  if (inRounded(x, z, 0, 0, ISLAND.half, ISLAND.corner, margin)) return true
  return ISLETS.some((s) => inRounded(x, z, s.x, s.z, ISLET.half, ISLET.corner, margin))
}

export function bridgeAt(x: number, z: number): { t: number } | null {
  for (const b of BRIDGES) {
    const u = b.axis === 'z' ? z : x, v = b.axis === 'z' ? x : z
    const lo = Math.min(b.u0, b.u1), hi = Math.max(b.u0, b.u1)
    if (u > lo && u < hi && Math.abs(v - b.at) < 1.6) return { t: (u - b.u0) / (b.u1 - b.u0) }
  }
  return null
}

export const deckY = (t: number) => 0.32 + Math.sin(Math.PI * Math.max(0, Math.min(1, t))) * 1.4

/* ------------------------------------------------------------------ */
/* water                                                                */
/* ------------------------------------------------------------------ */

export function makeWater(): { mesh: THREE.Mesh; tick: (t: number) => void } {
  const span = 440
  const islands = [{ x: 0, z: 0, half: ISLAND.half + 4, corner: ISLAND.corner + 4 }, ...ISLETS.map((s) => ({ x: s.x, z: s.z, half: ISLET.half + 4, corner: ISLET.corner + 4 }))]
  const mask = shoreMask(islands, span)
  const uniforms = { uMask: { value: mask }, uTime: { value: 0 }, uSpan: { value: span } }
  const mat = new THREE.MeshStandardMaterial({ color: '#7cc3ec', roughness: 0.18, metalness: 0.0 })
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldP;\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 wp0 = modelMatrix * vec4(transformed, 1.0);
        transformed.z += (sin(wp0.x * 0.08 + uTime * 0.9) + sin(wp0.z * 0.11 - uTime * 0.7)) * 0.06;`)
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldP;\nuniform sampler2D uMask;\nuniform float uTime;\nuniform float uSpan;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 muv = vWorldP.xz / uSpan + 0.5;
        float shore = (muv.x > 0.0 && muv.x < 1.0 && muv.y > 0.0 && muv.y < 1.0) ? texture2D(uMask, vec2(muv.x, 1.0 - muv.y)).r : 0.0;
        vec3 deep = vec3(0.24, 0.55, 0.80);
        vec3 shallow = vec3(0.55, 0.86, 0.90);
        diffuseColor.rgb = mix(deep, shallow, smoothstep(0.05, 0.75, shore));
        float band = sin(shore * 28.0 - uTime * 1.6) * 0.5 + 0.5;
        float foam = smoothstep(0.55, 0.8, shore) * smoothstep(0.55, 0.95, band) * 0.55 + smoothstep(0.82, 0.95, shore) * 0.6;
        float sparkle = pow(max(0.0, sin(vWorldP.x * 0.9 + uTime * 1.3) * sin(vWorldP.z * 0.8 - uTime * 1.1)), 18.0) * 0.35;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), clamp(foam + sparkle, 0.0, 0.9));`)
  }
  // the plane stays in XY (the shader wobbles local z); the mesh lays it down
  const geo = new THREE.PlaneGeometry(2600, 2600, 160, 160)
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = -0.62
  mesh.receiveShadow = true
  return { mesh, tick: (t) => { uniforms.uTime.value = t } }
}

/* ------------------------------------------------------------------ */
/* islands, roads, sidewalks                                            */
/* ------------------------------------------------------------------ */

export function buildGround(b: Batcher, occ: Occupancy) {
  // islands: sand shelf, then the grass top at y = 0
  const island = (x: number, z: number, half: number, corner: number) => {
    b.put('sand', slab(half * 2 + 12, half * 2 + 12, 1.2, corner + 7, 0.6, 12), x, -1.45, z, C.sand)
    b.put('grass', slab(half * 2, half * 2, 1.25, corner, 0.4, 12), x, -1.25, z, C.grass)
  }
  island(0, 0, ISLAND.half, ISLAND.corner)
  for (const s of ISLETS) island(s.x, s.z, ISLET.half, ISLET.corner)

  // roads
  for (const g of L) {
    b.put('asphalt', box(REACH * 2, 0.1, ROAD * 2), 0, 0, g, C.road)
    b.put('asphalt', box(ROAD * 2, 0.104, REACH * 2), g, 0, 0, C.road)
    occ.rect(-REACH, g - GE, REACH, g + GE)
    occ.rect(g - GE, -REACH, g + GE, REACH)
  }
  const paint = '#fbf7ee'
  // centre dashes, skipping junctions and crossings
  for (const g of L) {
    for (let s = -REACH + 1.5; s <= REACH - 1.5; s += 3.2) {
      if (L.some((g2) => Math.abs(s - g2) < 7.4)) continue
      b.put('paint', box(0.16, 0.02, 1.6), g, 0.06, s, paint)
      b.put('paint', box(1.6, 0.02, 0.16), s, 0.06, g, paint)
    }
  }
  // zebra crossings and stop lines at every arm of every junction
  for (const gx of L) for (const gz of L) {
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const ax = gx + dx * SO, az = gz + dz * SO
      if (Math.abs(ax) > REACH || Math.abs(az) > REACH) continue
      for (let k = -2; k <= 2; k += 1) {
        if (dx !== 0) b.put('paint', box(1.5, 0.02, 0.55), ax, 0.061, gz + k * 0.95, paint)
        else b.put('paint', box(0.55, 0.02, 1.5), gx + k * 0.95, 0.061, az, paint)
      }
    }
  }

  // sidewalk blocks with kerbs; grass or paving inside
  for (const [x0, x1] of CELLS) for (const [z0, z1] of CELLS) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
    const w = x1 - x0 - ROAD * 2, d = z1 - z0 - ROAD * 2
    b.put('paint', slab(w, d, 0.15, 1.2, 0.03), cx, 0, cz, C.curb)
    b.put('tiles', slab(w - 0.5, d - 0.5, 0.152, 1.0, 0.02), cx, 0, cz, C.walk)
    const plaza = cx === 0 && cz === 0
    const iw = x1 - x0 - GE * 2, id = z1 - z0 - GE * 2
    if (plaza) b.put('tiles', slab(iw, id, 0.17, 1.2, 0.02), cx, 0, cz, '#f8eedb')
    else b.put('grass', slab(iw, id, 0.17, 1.2, 0.03), cx, 0, cz, C.grass)
  }
  // the outer ring sidewalk
  for (const s of [-1, 1]) {
    b.put('paint', box(RING * 2 + 3, 0.15, 3), 0, 0.075, s * RING, C.curb)
    b.put('paint', box(3, 0.15, RING * 2 + 3), s * RING, 0.075, 0, C.curb)
    b.put('tiles', box(RING * 2 + 2.6, 0.156, 2.6), 0, 0.078, s * RING, C.walk)
    b.put('tiles', box(2.6, 0.157, RING * 2 + 2.6), s * RING, 0.078, 0, C.walk)
    occ.rect(-RING - 2, s * RING - 2, RING + 2, s * RING + 2)
    occ.rect(s * RING - 2, -RING - 2, s * RING + 2, RING + 2)
  }

  // paved work yards in front of each district building
  for (const d of DISTRICTS) {
    if (d.id === 'center') continue
    const a = toWorld(d.cx, d.cz, d.ry, -12.2, BACK_Z - 1.4)
    const c = toWorld(d.cx, d.cz, d.ry, 12.2, DESK_Z + 1.6)
    const w = Math.abs(c[0] - a[0]), dd = Math.abs(c[1] - a[1])
    b.put('tiles', slab(w, dd, 0.19, 0.6, 0.02), (a[0] + c[0]) / 2, 0, (a[1] + c[1]) / 2, '#f3e6cc')
    occ.rect(a[0], a[1], c[0], c[1])
  }

  // shore paths, the pier path, islet ring paths
  const strip = (x0: number, z0: number, x1: number, z1: number, w = 2.6) => {
    b.put('tiles', slab(Math.abs(x1 - x0) + w, Math.abs(z1 - z0) + w, 0.1, w / 2, 0.02), (x0 + x1) / 2, 0, (z0 + z1) / 2, C.walk)
    occ.rect(Math.min(x0, x1) - w / 2 - 0.6, Math.min(z0, z1) - w / 2 - 0.6, Math.max(x0, x1) + w / 2 + 0.6, Math.max(z0, z1) + w / 2 + 0.6)
  }
  strip(0, -RING - 1.4, 0, -66)
  strip(RING + 1.4, 0, 66, 0)
  strip(-RING - 1.4, 0, -66, 0)
  strip(0, RING + 1.4, 0, 66)
  for (const s of ISLETS) {
    const R = ISLET.ring
    strip(s.x - R, s.z - R, s.x + R, s.z - R)
    strip(s.x - R, s.z + R, s.x + R, s.z + R)
    strip(s.x - R, s.z - R, s.x - R, s.z + R)
    strip(s.x + R, s.z - R, s.x + R, s.z + R)
  }
  strip(0, -98, 0, -124 + ISLET.ring)
  strip(98, 0, 124 - ISLET.ring, 0)
  strip(-98, 0, -124 + ISLET.ring, 0)

  // arched wooden bridges
  for (const br of BRIDGES) {
    const N = 22
    const ry = br.axis === 'z' ? 0 : Math.PI / 2
    const seg = Math.abs(br.u1 - br.u0) / N
    for (let i = 0; i < N; i += 1) {
      const t0 = i / N, t1 = (i + 1) / N
      const u0 = br.u0 + (br.u1 - br.u0) * t0, u1 = br.u0 + (br.u1 - br.u0) * t1
      const y0 = deckY(t0), y1 = deckY(t1)
      const um = (u0 + u1) / 2, ym = (y0 + y1) / 2 - 0.13
      const rx = -Math.atan((y1 - y0) / (u1 - u0))
      const x = br.axis === 'z' ? br.at : um, z = br.axis === 'z' ? um : br.at
      b.put('wood', box(3.4, 0.26, seg * 1.04), x, ym, z, i % 2 ? C.wood : '#dbb083', ry, rx)
      for (const o of [-1.6, 1.6]) {
        const px = br.axis === 'z' ? br.at + o : um, pz = br.axis === 'z' ? um : br.at + o
        b.put('paint', box(0.12, 0.12, seg * 1.04), px, ym + 0.95, pz, C.paper, ry, rx)
        const qx = br.axis === 'z' ? br.at + o : u0, qz = br.axis === 'z' ? u0 : br.at + o
        b.put('paint', box(0.16, 0.95, 0.16), qx, y0 + 0.4, qz, C.indigo)
      }
    }
    for (const t of [0.25, 0.5, 0.75]) {
      for (const o of [-1.2, 1.2]) {
        const u = br.u0 + (br.u1 - br.u0) * t
        const x = br.axis === 'z' ? br.at + o : u, z = br.axis === 'z' ? u : br.at + o
        const top = deckY(t) - 0.25
        b.put('wood', cyl(0.28, 0.32, top + 1.6, 12), x, (top - 1.6) / 2, z, C.woodDark)
      }
    }
  }

  // the pier
  b.put('wood', slab(3.4, PIER.z1 - PIER.z0 + 2, 0.3, 0.3, 0.05), 0, -0.12, (PIER.z0 + PIER.z1) / 2 + 1, C.wood)
  for (let z = PIER.z0 + 2; z <= PIER.z1 + 1; z += 3) for (const x of [-1.4, 1.4]) b.put('wood', cyl(0.2, 0.22, 1.6, 10), x, -0.6, z, C.woodDark)
}
