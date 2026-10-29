// Shared building blocks for the scene: palette, materials, geometry helpers
// and the Batcher that merges thousands of static parts into a handful of
// meshes (one per material).
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { asphaltTexture, grassTexture, plankTexture, plasterTexture, sandTexture, shingleTexture, tileTexture } from './textures'

export const C = {
  indigo: '#2d3272',
  indigoDeep: '#23275c',
  mint: '#cff0e6',
  mintDeep: '#9fdcc2',
  cream: '#f5ebd6',
  paper: '#fffaf0',
  coral: '#fe6a4a',
  coralSoft: '#ffb3a1',
  lavender: '#b4b2d6',
  sky: '#96c5ed',
  skyDeep: '#6f9fd8',
  sun: '#ffd27a',
  green: '#5fc4a6',
  leaf: '#8fd6bb',
  wood: '#e2b98a',
  woodDark: '#b39468',
  grass: '#c4e9d3',
  sand: '#f3e3bf',
  road: '#b3b1cf',
  walk: '#f4e8d0',
  curb: '#e3d2b0',
  glass: '#bcdcf3',
  stone: '#e9dcc0',
} as const

export type MatKey = 'plaster' | 'roof' | 'wood' | 'paint' | 'grass' | 'sand' | 'asphalt' | 'tiles' | 'glass' | 'lit' | 'lamp' | 'metal' | 'leaf' | 'water' | 'screen'

export interface MatSpec { material: THREE.Material; cast: boolean; receive: boolean; uvScale: number }

export class Mats {
  readonly spec: Record<MatKey, MatSpec>
  /** materials whose glow follows the time of day */
  readonly lit: THREE.MeshStandardMaterial
  readonly lamp: THREE.MeshStandardMaterial
  readonly signal: THREE.MeshStandardMaterial
  private cache = new Map<string, THREE.MeshStandardMaterial>()

  constructor() {
    const std = (o: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0, ...o })
    this.lit = std({ color: '#ffffff', vertexColors: true, roughness: 0.25, emissive: '#ffcf86', emissiveIntensity: 0 })
    this.lamp = std({ color: C.coral, emissive: '#ff8a5c', emissiveIntensity: 0.25, roughness: 0.4 })
    this.signal = std({ color: C.coral, emissive: C.coral, emissiveIntensity: 0.35, roughness: 0.35 })
    this.spec = {
      plaster: { material: std({ map: plasterTexture(), vertexColors: true, roughness: 0.9 }), cast: true, receive: true, uvScale: 2.5 },
      roof: { material: std({ map: shingleTexture(), vertexColors: true, roughness: 0.75 }), cast: true, receive: true, uvScale: 1.6 },
      wood: { material: std({ map: plankTexture(), vertexColors: true, roughness: 0.8 }), cast: true, receive: true, uvScale: 1.4 },
      paint: { material: std({ vertexColors: true, roughness: 0.7 }), cast: true, receive: true, uvScale: 1 },
      grass: { material: std({ map: grassTexture(), vertexColors: true, roughness: 0.95 }), cast: false, receive: true, uvScale: 9 },
      sand: { material: std({ map: sandTexture(), vertexColors: true, roughness: 0.95 }), cast: false, receive: true, uvScale: 7 },
      asphalt: { material: std({ map: asphaltTexture(), vertexColors: true, roughness: 0.92 }), cast: false, receive: true, uvScale: 5 },
      tiles: { material: std({ map: tileTexture(), vertexColors: true, roughness: 0.85 }), cast: false, receive: true, uvScale: 2.4 },
      glass: { material: std({ vertexColors: true, roughness: 0.15, metalness: 0.1, envMapIntensity: 1.2 }), cast: false, receive: true, uvScale: 1 },
      lit: { material: this.lit, cast: false, receive: true, uvScale: 1 },
      lamp: { material: this.lamp, cast: false, receive: false, uvScale: 1 },
      metal: { material: std({ vertexColors: true, roughness: 0.35, metalness: 0.5 }), cast: true, receive: true, uvScale: 1 },
      leaf: { material: std({ vertexColors: true, roughness: 0.9, flatShading: false }), cast: true, receive: true, uvScale: 1 },
      water: { material: std({ color: '#8fcbef', roughness: 0.1, metalness: 0.05, transparent: true, opacity: 0.88 }), cast: false, receive: true, uvScale: 1 },
      screen: { material: std({ vertexColors: true, roughness: 0.25, emissive: '#d6ecff', emissiveIntensity: 0.55 }), cast: false, receive: false, uvScale: 1 },
    }
  }

  /** A plain coloured material, cached by colour (for dynamic, non-batched meshes). */
  color(hex: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
    const key = hex + JSON.stringify(o)
    let m = this.cache.get(key)
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.75, metalness: 0, ...o })
      this.cache.set(key, m)
    }
    return m
  }
}

/* ------------------------------------------------------------------ */
/* geometry helpers                                                     */
/* ------------------------------------------------------------------ */

export function rrShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape()
  const x = -w / 2, y = -h / 2
  r = Math.max(0.001, Math.min(r, w / 2, h / 2))
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false)
  s.lineTo(x + w, y + h - r)
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false)
  s.lineTo(x + r, y + h)
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false)
  s.lineTo(x, y + r)
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false)
  return s
}

const cache = new Map<string, THREE.BufferGeometry>()
const memo = (key: string, make: () => THREE.BufferGeometry) => {
  let g = cache.get(key)
  if (!g) { g = make(); cache.set(key, g) }
  return g
}
const k = (...n: number[]) => n.map((v) => v.toFixed(3)).join(',')

/** Share vertices between triangles (extrusions and rounded boxes come unindexed): about 4× fewer vertices. */
function shared(g: THREE.BufferGeometry): THREE.BufferGeometry {
  g.clearGroups()
  const out = mergeVertices(g, 1e-4)
  g.dispose()
  return out
}

/** Rounded-corner slab standing on y = 0 (plan w × d, height h). Small corners get fewer segments. */
export function slab(w: number, d: number, h: number, r: number, bevel = 0, segments = 6): THREE.BufferGeometry {
  const seg = Math.max(2, Math.min(segments, Math.round(2 + r * 4)))
  return memo('slab' + k(w, d, h, r, bevel, seg), () => {
    const b = Math.min(bevel, h / 2 - 0.001, w / 2 - 0.01, d / 2 - 0.01)
    const g = new THREE.ExtrudeGeometry(rrShape(w - 2 * Math.max(b, 0), d - 2 * Math.max(b, 0), Math.max(0.01, r - Math.max(b, 0))), {
      depth: Math.max(0.005, h - 2 * Math.max(b, 0)), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: b > 0.05 ? 3 : 2, curveSegments: seg,
    })
    g.rotateX(-Math.PI / 2)
    g.translate(0, Math.max(b, 0), 0)
    return shared(g)
  })
}

/** Rounded box centred on the origin (a plain box when the rounding would not show). */
export function rbox(w: number, h: number, d: number, r = 0.06, segments = 2): THREE.BufferGeometry {
  const rad = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)
  if (rad < 0.012) return box(w, h, d)
  const seg = rad < 0.035 ? 1 : segments
  return memo('rbox' + k(w, h, d, rad, seg), () => shared(new RoundedBoxGeometry(w, h, d, seg, rad)))
}

export function box(w: number, h: number, d: number): THREE.BufferGeometry {
  return memo('box' + k(w, h, d), () => new THREE.BoxGeometry(w, h, d))
}

export function cyl(rTop: number, rBottom: number, h: number, seg = 16): THREE.BufferGeometry {
  return memo('cyl' + k(rTop, rBottom, h, seg), () => new THREE.CylinderGeometry(rTop, rBottom, h, seg))
}

export function sphere(r: number, w = 16, h = 12): THREE.BufferGeometry {
  return memo('sph' + k(r, w, h), () => new THREE.SphereGeometry(r, w, h))
}

export function cone(r: number, h: number, seg = 16): THREE.BufferGeometry {
  return memo('cone' + k(r, h, seg), () => new THREE.ConeGeometry(r, h, seg))
}

export function torus(r: number, tube: number, arc = Math.PI * 2, rs = 10, ts = 32): THREE.BufferGeometry {
  return memo('tor' + k(r, tube, arc, rs, ts), () => new THREE.TorusGeometry(r, tube, rs, ts, arc))
}

/** Flat shape extruded `depth` along +z (front face at z = depth). */
export function extrude(shape: THREE.Shape, depth: number, bevel = 0, key?: string): THREE.BufferGeometry {
  const make = () => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 12 })
  return key ? memo('ext' + key, make) : make()
}

/**
 * A pitched roof with real thickness and overhang: two sloped planes meeting
 * at a ridge along x, eaves at y = 0. `span` is the wall depth it covers.
 */
export function roofPlanes(len: number, span: number, rise: number, thick = 0.16, overhang = 0.42): THREE.BufferGeometry {
  return memo('roof' + k(len, span, rise, thick, overhang), () => {
    const half = span / 2
    const a = Math.atan2(rise, half)
    const run = half + overhang
    const L = run / Math.cos(a)
    const parts: THREE.BufferGeometry[] = []
    for (const side of [1, -1]) {
      const g = new THREE.BoxGeometry(len + overhang * 1.2, thick, L)
      g.translate(0, 0, (side * L) / 2)
      g.rotateX(side * a)
      g.translate(0, rise + thick / 2, 0)
      parts.push(g.toNonIndexed())
    }
    const m = mergeGeometries(parts)!
    // shift down so the eave sits at y = -overhang·tan(a) below the wall top line
    return m
  })
}

/** The two triangular gable walls under a pitched roof (ridge along x). */
export function gableEnds(len: number, span: number, rise: number): THREE.BufferGeometry {
  return memo('gable' + k(len, span, rise), () => {
    const s = new THREE.Shape()
    s.moveTo(-span / 2, 0)
    s.lineTo(span / 2, 0)
    s.lineTo(0, rise)
    s.lineTo(-span / 2, 0)
    const parts: THREE.BufferGeometry[] = []
    for (const side of [1, -1]) {
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false })
      g.rotateY(Math.PI / 2)
      g.translate(side * (len / 2) - 0.06, 0, 0)
      parts.push(g)
    }
    return mergeGeometries(parts)!
  })
}

/* ------------------------------------------------------------------ */
/* Batcher                                                              */
/* ------------------------------------------------------------------ */

const tmpN = new THREE.Vector3()

/** Box-projected UVs from local positions, so textures keep their size on any part. */
export function boxUV(g: THREE.BufferGeometry, scale: number) {
  const pos = g.getAttribute('position')
  const nor = g.getAttribute('normal')
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i += 1) {
    tmpN.set(Math.abs(nor.getX(i)), Math.abs(nor.getY(i)), Math.abs(nor.getZ(i)))
    let u: number, v: number
    if (tmpN.y >= tmpN.x && tmpN.y >= tmpN.z) { u = pos.getX(i); v = pos.getZ(i) }
    else if (tmpN.x >= tmpN.z) { u = pos.getZ(i); v = pos.getY(i) }
    else { u = pos.getX(i); v = pos.getY(i) }
    uv[i * 2] = u / scale
    uv[i * 2 + 1] = v / scale
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
}

const KEEP = new Set(['position', 'normal', 'uv'])

export class Batcher {
  /** parts by material; indexed and non-indexed geometry merge separately (merging needs one or the other) */
  private parts = new Map<string, { key: MatKey; list: THREE.BufferGeometry[] }>()
  private m = new THREE.Matrix4()
  private q = new THREE.Quaternion()
  private e = new THREE.Euler(0, 0, 0, 'YXZ')
  private col = new THREE.Color()
  vertices = 0
  constructor(readonly mats: Mats) {}

  /** Add a part. `uv`: 'box' re-projects UVs in the part's local frame (default for textured materials). */
  add(key: MatKey, geo: THREE.BufferGeometry, matrix: THREE.Matrix4, color: THREE.ColorRepresentation = '#ffffff', uv: 'box' | 'keep' = 'box') {
    const g = geo.clone()
    for (const name of Object.keys(g.attributes)) if (!KEEP.has(name)) g.deleteAttribute(name)
    g.morphAttributes = {}
    g.clearGroups()
    if (!g.getAttribute('normal')) g.computeVertexNormals()
    const spec = this.mats.spec[key]
    if (uv === 'box' || !g.getAttribute('uv')) boxUV(g, spec.uvScale)
    g.applyMatrix4(matrix)
    this.col.set(color)
    const n = g.getAttribute('position').count
    const c = new Float32Array(n * 3)
    for (let i = 0; i < n; i += 1) { c[i * 3] = this.col.r; c[i * 3 + 1] = this.col.g; c[i * 3 + 2] = this.col.b }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3))
    const bucket = `${key}|${g.index ? 'i' : 'n'}`
    let entry = this.parts.get(bucket)
    if (!entry) { entry = { key, list: [] }; this.parts.set(bucket, entry) }
    entry.list.push(g)
    this.vertices += n
  }

  /** Convenience: position / Y-rotation / optional X-rotation / scale. */
  put(key: MatKey, geo: THREE.BufferGeometry, x: number, y: number, z: number, color: THREE.ColorRepresentation, ry = 0, rx = 0, sx = 1, sy = 1, sz = 1, rz = 0) {
    this.e.set(rx, ry, rz, 'YXZ')
    this.q.setFromEuler(this.e)
    this.m.compose(new THREE.Vector3(x, y, z), this.q, new THREE.Vector3(sx, sy, sz))
    this.add(key, geo, this.m, color)
  }

  /** Merge everything into the scene. */
  build(parent: THREE.Object3D): THREE.Mesh[] {
    const out: THREE.Mesh[] = []
    for (const { key, list } of this.parts.values()) {
      if (!list.length) continue
      // merge in chunks so no single buffer gets huge
      for (let i = 0; i < list.length; i += 3000) {
        const merged = mergeGeometries(list.slice(i, i + 3000), false)
        if (!merged) continue
        merged.computeBoundingSphere()
        const spec = this.mats.spec[key]
        const mesh = new THREE.Mesh(merged, spec.material)
        mesh.castShadow = spec.cast
        mesh.receiveShadow = spec.receive
        mesh.matrixAutoUpdate = false
        mesh.updateMatrix()
        parent.add(mesh)
        out.push(mesh)
      }
      list.forEach((g) => g.dispose())
    }
    this.parts.clear()
    return out
  }
}

/** A transform helper for building parts relative to a placed object (x, z, facing). */
export class Frame {
  constructor(readonly x: number, readonly y: number, readonly z: number, readonly ry: number) {}
  /** local (lx, ly, lz) → world */
  at(lx: number, ly: number, lz: number): [number, number, number] {
    const c = Math.cos(this.ry), s = Math.sin(this.ry)
    return [this.x + lx * c + lz * s, this.y + ly, this.z - lx * s + lz * c]
  }
  put(b: Batcher, key: MatKey, geo: THREE.BufferGeometry, lx: number, ly: number, lz: number, color: THREE.ColorRepresentation, ry = 0, rx = 0, sx = 1, sy = 1, sz = 1, rz = 0) {
    const [x, y, z] = this.at(lx, ly, lz)
    b.put(key, geo, x, y, z, color, this.ry + ry, rx, sx, sy, sz, rz)
  }
}
