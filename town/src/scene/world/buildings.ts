// Houses, the four district buildings, the signal tower and the plaza, street
// lamps, benches, the elevated railway and its station.
import * as THREE from 'three'
import { BUILDING, DISTRICTS, GE, HOMES, HOT_DESKS, L, PLAZA, RAIL, REACH, toWorld } from '../layout'
import { Batcher, C, Frame, Mats, box, cone, cyl, gableEnds, rbox, roofPlanes, slab, sphere } from '../kit'
import { labelTexture } from '../textures'
import { makeRng } from '../../work/rng'
import type { Occupancy } from './ground'
import { DISTRICTS as DISTRICT_INFO } from '../../work/roles'

const WALLS = ['#f7ecda', '#d6f1e6', '#e3e0f4', '#d9e9f8', '#ffe6dc', '#f6e9d4', '#e8f6ef', '#fff6e6']
const ROOFS = ['#fe6a4a', '#2d3272', '#6f9fd8', '#9a94cc', '#f0866a', '#4fb394']
const FLOWERS = ['#fe6a4a', '#ffb3a1', '#ffd27a', '#b4b2d6', '#ffffff']

export interface Sign { mesh: THREE.Mesh }

/** A flat sign with text, facing the frame's +z. Returned as its own mesh (it has a texture). */
export function makeSign(text: string, sub: string | null, w: number, opts: { bg?: string; fg?: string; dot?: string } = {}): THREE.Mesh {
  const lines = [{ text, size: 76, color: opts.fg ?? C.paper, weight: 900 }]
  if (sub) lines.push({ text: sub, size: 34, color: opts.fg ?? C.paper, weight: 600 })
  const tex = labelTexture(lines, { w: 640, h: sub ? 220 : 170, bg: opts.bg ?? C.indigo, radius: 40, dot: opts.dot })
  const h = w * ((sub ? 220 : 170) / 640)
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6 }))
  m.castShadow = false
  return m
}

export interface WindowOpts { lit?: boolean; shutter?: string | null; box?: boolean; cross?: boolean }

/** A framed window on the frame's +z face at local (lx, ly, lz). */
export function windowAt(b: Batcher, f: Frame, lx: number, ly: number, lz: number, w: number, h: number, o: WindowOpts = {}) {
  f.put(b, 'paint', rbox(w + 0.22, h + 0.22, 0.12, 0.04), lx, ly, lz + 0.03, C.paper)
  f.put(b, o.lit ? 'lit' : 'glass', box(w, h, 0.04), lx, ly, lz + 0.075, '#bcdcf3')
  if (o.cross !== false) {
    f.put(b, 'paint', box(0.07, h, 0.05), lx, ly, lz + 0.1, C.paper)
    f.put(b, 'paint', box(w, 0.07, 0.05), lx, ly, lz + 0.1, C.paper)
  }
  f.put(b, 'paint', rbox(w + 0.5, 0.1, 0.26, 0.03), lx, ly - h / 2 - 0.16, lz + 0.12, C.paper)
  if (o.shutter) {
    for (const s of [-1, 1]) f.put(b, 'paint', rbox(w * 0.4, h + 0.06, 0.05, 0.02), lx + s * (w / 2 + 0.16 + w * 0.2), ly, lz + 0.04, o.shutter)
  }
  if (o.box) {
    f.put(b, 'wood', rbox(w + 0.25, 0.24, 0.32, 0.04), lx, ly - h / 2 - 0.36, lz + 0.22, C.wood)
    const rand = makeRng(Math.round((f.x + lx) * 97 + (f.z + ly) * 31))
    for (let i = 0; i < 5; i += 1) {
      f.put(b, 'leaf', sphere(0.11, 8, 6), lx - (w + 0.1) / 2 + ((w + 0.1) / 5) * (i + 0.5), ly - h / 2 - 0.17, lz + 0.24, FLOWERS[Math.floor(rand() * FLOWERS.length)])
    }
  }
}

export interface CottageOpts {
  x: number; z: number; ry: number
  w: number; d: number; h: number
  wall: string; roof: string; rise: number
  frontGable?: boolean
  chimney?: boolean
  base?: number
}

export interface Cottage { f: Frame; top: number; chimneyTop?: [number, number, number] }

/** Plinth, plastered walls, corner boards, eaves, a tiled pitched roof with ridge cap, chimney. */
export function cottage(b: Batcher, occ: Occupancy | null, o: CottageOpts): Cottage {
  const base = o.base ?? 0.17
  const f = new Frame(o.x, base, o.z, o.ry)
  const { w, d, h } = o
  f.put(b, 'paint', slab(w + 0.34, d + 0.34, 0.32, 0.32, 0.05), 0, 0, 0, '#ebdfcc')
  f.put(b, 'plaster', slab(w, d, h, 0.2, 0.04), 0, 0.28, 0, o.wall)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.put(b, 'paint', rbox(0.2, h, 0.2, 0.05), sx * (w / 2 - 0.04), 0.28 + h / 2, sz * (d / 2 - 0.04), C.paper)
  f.put(b, 'paint', slab(w + 0.14, d + 0.14, 0.16, 0.25, 0.03), 0, 0.28 + h - 0.16, 0, C.paper)
  const top = 0.28 + h
  const ridgeY = top + o.rise + 0.2
  const shade = new THREE.Color(o.roof).multiplyScalar(0.78)
  if (o.frontGable) {
    f.put(b, 'roof', roofPlanes(d + 0.24, w, o.rise), 0, top - 0.02, 0, o.roof, Math.PI / 2)
    f.put(b, 'plaster', gableEnds(d, w, o.rise), 0, top, 0, o.wall, Math.PI / 2)
    f.put(b, 'paint', cyl(0.15, 0.15, d + 0.9, 10), 0, ridgeY, 0, shade, Math.PI / 2, Math.PI / 2)
  } else {
    f.put(b, 'roof', roofPlanes(w + 0.24, d, o.rise), 0, top - 0.02, 0, o.roof)
    f.put(b, 'plaster', gableEnds(w, d, o.rise), 0, top, 0, o.wall)
    f.put(b, 'paint', cyl(0.15, 0.15, w + 0.9, 10), 0, ridgeY, 0, shade, 0, 0, 1, 1, 1, Math.PI / 2)
  }
  let chimneyTop: [number, number, number] | undefined
  if (o.chimney !== false) {
    const cy = top + o.rise * 0.55
    f.put(b, 'plaster', rbox(0.62, 1.7, 0.62, 0.06), -w * 0.26, cy, -d * 0.16, '#efe2c8')
    f.put(b, 'paint', rbox(0.82, 0.18, 0.82, 0.05), -w * 0.26, cy + 0.9, -d * 0.16, '#d9cbb0')
    chimneyTop = f.at(-w * 0.26, cy + 1.05, -d * 0.16)
  }
  if (occ) {
    const c = Math.abs(Math.cos(o.ry)) > 0.5
    const hw = (c ? w : d) / 2 + 0.6, hd = (c ? d : w) / 2 + 0.6
    occ.rect(o.x - hw, o.z - hd, o.x + hw, o.z + hd)
  }
  return { f, top, chimneyTop }
}

/** Door with frame, glazing, knob, step, canopy and a little porch lamp. */
export function door(b: Batcher, f: Frame, lx: number, lz: number, color: string, wide = 1) {
  f.put(b, 'paint', rbox(1.2 * wide, 2.1, 0.12, 0.04), lx, 0.28 + 1.05, lz + 0.03, C.paper)
  f.put(b, 'paint', rbox(0.94 * wide, 1.88, 0.09, 0.03), lx, 0.28 + 0.96, lz + 0.08, color)
  f.put(b, 'glass', box(0.42 * wide, 0.42, 0.04), lx, 0.28 + 1.5, lz + 0.13, '#bcdcf3')
  f.put(b, 'metal', sphere(0.06, 8, 6), lx + 0.32 * wide, 0.28 + 0.95, lz + 0.15, C.sun)
  f.put(b, 'paint', slab(1.5 * wide, 0.8, 0.16, 0.1, 0.03), lx, 0, lz + 0.42, '#e6dcc6')
  f.put(b, 'paint', rbox(1.6 * wide, 0.1, 0.85, 0.03), lx, 0.28 + 2.32, lz + 0.4, color, 0, 0.3)
  f.put(b, 'paint', box(0.06, 0.06, 0.3), lx + 0.82 * wide, 0.28 + 1.95, lz + 0.15, C.indigo)
  f.put(b, 'lamp', sphere(0.12, 10, 8), lx + 0.82 * wide, 0.28 + 1.88, lz + 0.3, '#ffffff')
}

/* ------------------------------------------------------------------ */
/* homes                                                                */
/* ------------------------------------------------------------------ */

export interface HomeBuilt { door: [number, number]; face: number; chimney?: [number, number, number] }

export function buildHomes(b: Batcher, occ: Occupancy): HomeBuilt[] {
  const rand = makeRng(4242)
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)]
  return HOMES.map((hm) => {
    const w = 4.6 + rand() * 0.7, d = 3.8 + rand() * 0.5
    const two = rand() < 0.4
    const h = two ? 4.6 : 3.0 + rand() * 0.3
    const roof = pick(ROOFS)
    const wall = pick(WALLS)
    const frontGable = rand() < 0.35
    const c = cottage(b, occ, { x: hm.x, z: hm.z, ry: hm.ry, w, d, h, wall, roof, rise: 1.6 + rand() * 0.5, frontGable })
    const f = c.f
    const side = rand() < 0.5 ? -1 : 1
    const dx = side * w * 0.22
    door(b, f, dx, d / 2, pick(['#2d3272', roof, '#4fb394', '#fe6a4a']))
    const shut = rand() < 0.6 ? roof : null
    windowAt(b, f, -side * w * 0.2, 0.28 + 1.5, d / 2, 1.05, 0.95, { lit: rand() < 0.55, shutter: shut, box: true })
    if (two) {
      windowAt(b, f, -w * 0.22, 0.28 + 3.45, d / 2, 0.95, 0.85, { lit: rand() < 0.5, shutter: shut })
      windowAt(b, f, w * 0.22, 0.28 + 3.45, d / 2, 0.95, 0.85, { lit: rand() < 0.5, shutter: shut })
    }
    for (const t of [Math.PI / 2, -Math.PI / 2]) {
      const sf = new Frame(hm.x, f.y, hm.z, hm.ry + t)
      windowAt(b, sf, 0, 0.28 + (two ? 3.45 : 1.6), w / 2, 0.9, 0.85, { lit: rand() < 0.5 })
    }
    // a mailbox with a signal-dot flag by the path
    const mb = f.at(side * w * 0.5 + side * 0.4, 0, d / 2 + 1.5)
    b.put('paint', cyl(0.06, 0.06, 1.0, 8), mb[0], 0.5 + f.y, mb[2], C.indigo)
    b.put('paint', rbox(0.5, 0.36, 0.34, 0.12), mb[0], 1.12 + f.y, mb[2], pick(['#fe6a4a', '#6f9fd8', '#5fc4a6', '#ffd27a']), hm.ry)
    b.put('paint', sphere(0.08, 8, 6), mb[0], 1.38 + f.y, mb[2], C.coral)
    // stepping stones from the sidewalk to the door
    for (let i = 0; i < 3; i += 1) {
      const p = f.at(dx, 0, d / 2 + 1.3 + i * 0.75)
      b.put('paint', cyl(0.32, 0.34, 0.06, 12), p[0], f.y + 0.03, p[2], '#efe4cf')
    }
    if (hm.outer) {
      // a picket fence round the yard, open at the gate
      const fx = w + 2.4, fz = d + 3.4
      const pc = f.at(0, 0, 0.9)
      const yard = new Frame(pc[0], 0, pc[2], hm.ry)
      b.put('grass', slab(fx + 0.3, fz + 0.3, 0.17, 0.6, 0.03), pc[0], 0, pc[2], '#c8ebd6', hm.ry)
      const pk = (lx: number, lz: number) => yard.put(b, 'paint', rbox(0.11, 0.78, 0.1, 0.03), lx, 0.52, lz, C.paper)
      for (let u = -fx / 2; u <= fx / 2 + 0.01; u += 0.55) { pk(u, -fz / 2); if (Math.abs(u - dx) > 1.0) pk(u, fz / 2) }
      for (let v = -fz / 2 + 0.55; v < fz / 2 - 0.1; v += 0.55) { pk(-fx / 2, v); pk(fx / 2, v) }
      const rail = (x0: number, z0: number, x1: number, z1: number) => yard.put(b, 'paint', box(Math.abs(x1 - x0) + 0.08, 0.07, Math.abs(z1 - z0) + 0.08), (x0 + x1) / 2, 0.7, (z0 + z1) / 2, C.paper)
      rail(-fx / 2, -fz / 2, fx / 2, -fz / 2)
      rail(-fx / 2, -fz / 2, -fx / 2, fz / 2)
      rail(fx / 2, -fz / 2, fx / 2, fz / 2)
      rail(-fx / 2, fz / 2, dx - 1.0, fz / 2)
      rail(dx + 1.0, fz / 2, fx / 2, fz / 2)
      const c2 = Math.abs(Math.cos(hm.ry)) > 0.5
      const hw = (c2 ? fx : fz) / 2 + 0.4, hd = (c2 ? fz : fx) / 2 + 0.4
      occ.rect(pc[0] - hw, pc[2] - hd, pc[0] + hw, pc[2] + hd)
    }
    const dp = f.at(dx, 0, d / 2 + 1.05)
    return { door: [dp[0], dp[2]], face: hm.ry + Math.PI, chimney: c.chimneyTop }
  })
}

/* ------------------------------------------------------------------ */
/* the district buildings                                               */
/* ------------------------------------------------------------------ */

export interface DistrictBuilt { radar?: THREE.Object3D; gear?: THREE.Object3D; telescope?: THREE.Object3D; beacon?: THREE.Mesh; chimneys: Array<[number, number, number]>; signs: THREE.Mesh[] }

export function buildDistricts(b: Batcher, occ: Occupancy, mats: Mats, scene: THREE.Object3D): DistrictBuilt {
  const out: DistrictBuilt = { signs: [], chimneys: [] }
  for (const d of DISTRICTS) {
    if (d.id === 'center') continue
    const [bx, bz] = toWorld(d.cx, d.cz, d.ry, 0, BUILDING.z)
    const W = BUILDING.w, D = BUILDING.d
    const info = DISTRICT_INFO[d.id]
    const sign = (text: string, sub: string, ly: number, bg: string) => {
      const m = makeSign(text, sub, 4.6, { bg, dot: C.coral })
      const p = new Frame(bx, 0.17, bz, d.ry).at(0, ly, D / 2 + 0.16)
      m.position.set(p[0], p[1], p[2])
      m.rotation.y = d.ry
      scene.add(m)
      out.signs.push(m)
    }
    if (d.id === 'north') {
      // 创作工作室: a two-storey studio with tall windows
      const c = cottage(b, occ, { x: bx, z: bz, ry: d.ry, w: W, d: D, h: 6.6, wall: '#fff1dc', roof: C.coral, rise: 2.6, chimney: true })
      door(b, c.f, 0, D / 2, C.indigo, 1.3)
      for (const lx of [-5.2, -2.6, 2.6, 5.2]) windowAt(b, c.f, lx, 0.28 + 1.75, D / 2, 1.5, 2.2, { lit: true, cross: true })
      for (const lx of [-5.6, -3.4, -1.1, 1.1, 3.4, 5.6]) windowAt(b, c.f, lx, 0.28 + 5.0, D / 2, 1.1, 1.25, { lit: Math.abs(lx) > 2, shutter: '#fe6a4a' })
      for (const lx of [-3.6, 3.6]) {
        c.f.put(b, 'roof', roofPlanes(2.2, 1.8, 0.8, 0.12, 0.2), lx, c.top + 0.9, D / 2 - 1.1, C.coral, Math.PI / 2)
        c.f.put(b, 'plaster', rbox(1.7, 1.2, 1.6, 0.05), lx, c.top + 0.4, D / 2 - 1.0, '#fff1dc')
        windowAt(b, c.f, lx, c.top + 0.45, D / 2 - 0.2, 0.9, 0.7, { lit: true })
      }
      sign(info.building, '内容 · 设计 · 分享', 0.28 + 3.55, C.indigo)
      if (c.chimneyTop) out.chimneys.push(c.chimneyTop)
    } else if (d.id === 'east') {
      // 研究院: flat roof, parapet and an observatory dome with a telescope
      const f = new Frame(bx, 0.17, bz, d.ry)
      f.put(b, 'paint', slab(W + 0.34, D + 0.34, 0.32, 0.32, 0.05), 0, 0, 0, '#ebdfcc')
      f.put(b, 'plaster', slab(W, D, 6.2, 0.4, 0.05), 0, 0.28, 0, '#e6e1f5')
      f.put(b, 'paint', slab(W + 0.3, D + 0.3, 0.5, 0.5, 0.06), 0, 6.45, 0, C.paper)
      f.put(b, 'paint', slab(W - 0.4, D - 0.4, 0.3, 0.3, 0.04), 0, 6.6, 0, '#d8d3ee')
      for (let i = -3; i <= 3; i += 1) f.put(b, 'paint', box(0.16, 6.1, 0.16), i * 2.1, 0.28 + 3.05, D / 2 + 0.06, C.paper)
      door(b, f, 0, D / 2, '#6f9fd8', 1.3)
      for (const lx of [-5.25, -3.15, 3.15, 5.25]) windowAt(b, f, lx, 0.28 + 1.7, D / 2, 1.4, 1.9, { lit: true, cross: false })
      for (const lx of [-5.25, -3.15, -1.05, 1.05, 3.15, 5.25]) windowAt(b, f, lx, 0.28 + 4.6, D / 2, 1.4, 1.4, { lit: Math.abs(lx) < 4, cross: false })
      f.put(b, 'paint', cyl(2.9, 2.9, 0.5, 32), 2.8, 6.9, -0.4, C.paper)
      const dome = new THREE.Mesh(new THREE.SphereGeometry(2.7, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mats.color('#f3f4fb', { roughness: 0.35, metalness: 0.3 }))
      const dp = f.at(2.8, 7.15, -0.4)
      dome.position.set(dp[0], dp[1], dp[2])
      dome.castShadow = true
      scene.add(dome)
      const scope = new THREE.Group()
      scope.position.set(dp[0], dp[1] + 1.2, dp[2])
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.46, 3.6, 16), mats.color(C.indigo))
      tube.rotation.x = Math.PI / 2.8
      tube.position.set(0, 0.6, 1.0)
      tube.castShadow = true
      scope.add(tube)
      scope.rotation.y = d.ry + 0.5
      scene.add(scope)
      out.telescope = scope
      sign(info.building, '资讯 · 研究 · 增长', 0.28 + 3.2, '#6f9fd8')
      occ.rect(bx - 8.5, bz - 8.5, bx + 8.5, bz + 8.5)
    } else if (d.id === 'south') {
      // 工程坊: a sawtooth-roofed workshop with a roller door and a gear sign
      const f = new Frame(bx, 0.17, bz, d.ry)
      f.put(b, 'paint', slab(W + 0.34, D + 0.34, 0.32, 0.32, 0.05), 0, 0, 0, '#ebdfcc')
      f.put(b, 'plaster', slab(W, D, 5.0, 0.3, 0.05), 0, 0.28, 0, '#e3f4ec')
      for (let i = 0; i < 4; i += 1) {
        const lx = -W / 2 + W / 8 + (i * W) / 4
        const s = new THREE.Shape()
        s.moveTo(-D / 2, 0); s.lineTo(D / 2, 0); s.lineTo(D / 2, 1.8); s.lineTo(-D / 2, 0)
        const g = new THREE.ExtrudeGeometry(s, { depth: W / 4 - 0.1, bevelEnabled: false })
        g.rotateY(Math.PI / 2)
        f.put(b, 'roof', g, lx - (W / 4 - 0.1) / 2, 5.28, 0, '#4fb394', 0)
        f.put(b, 'glass', box(W / 4 - 0.3, 1.5, 0.08), lx, 5.28 + 0.85, D / 2 - 0.05, '#bcdcf3')
      }
      f.put(b, 'paint', rbox(5.2, 3.6, 0.2, 0.08), -2.6, 0.28 + 1.8, D / 2 + 0.06, C.paper)
      for (let k = 0; k < 9; k += 1) f.put(b, 'metal', box(4.8, 0.32, 0.08), -2.6, 0.28 + 0.3 + k * 0.38, D / 2 + 0.18, '#c9d6e8')
      door(b, f, 3.0, D / 2, C.indigo)
      windowAt(b, f, 5.6, 0.28 + 1.8, D / 2, 1.3, 1.4, { lit: true })
      windowAt(b, f, 3.0, 0.28 + 3.9, D / 2, 2.6, 0.9, { lit: true, cross: false })
      // a gear on the facade, turning while the workshop works
      const gear = new THREE.Group()
      const gp = f.at(-2.6, 4.5, D / 2 + 0.25)
      gear.position.set(gp[0], gp[1], gp[2])
      gear.rotation.y = d.ry
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.2, 10, 28), mats.color(C.coral))
      gear.add(ring)
      for (let t = 0; t < 8; t += 1) {
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.26), mats.color(C.coral))
        const a = (t / 8) * Math.PI * 2
        tooth.position.set(Math.cos(a) * 0.86, Math.sin(a) * 0.86, 0)
        tooth.rotation.z = a
        gear.add(tooth)
      }
      gear.traverse((o) => { o.castShadow = true })
      scene.add(gear)
      out.gear = gear
      // a brick chimney stack with smoke
      f.put(b, 'plaster', rbox(1.0, 3.2, 1.0, 0.08), 6.2, 5.28 + 1.4, -1.8, '#f0d9c4')
      f.put(b, 'paint', rbox(1.2, 0.22, 1.2, 0.06), 6.2, 5.28 + 3.05, -1.8, '#d9cbb0')
      out.chimneys.push(f.at(6.2, 5.28 + 3.3, -1.8))
      sign(info.building, '开发 · 审查 · 测试', 0.28 + 4.35, '#3e9f7e')
      occ.rect(bx - 8.5, bz - 8.5, bx + 8.5, bz + 8.5)
    } else {
      // 运营中心: flat roof, a radar dish and an antenna with a blinking light
      const f = new Frame(bx, 0.17, bz, d.ry)
      f.put(b, 'paint', slab(W + 0.34, D + 0.34, 0.32, 0.32, 0.05), 0, 0, 0, '#ebdfcc')
      f.put(b, 'plaster', slab(W, D, 5.6, 0.4, 0.05), 0, 0.28, 0, '#dfeaf8')
      f.put(b, 'paint', slab(W + 0.3, D + 0.3, 0.45, 0.5, 0.06), 0, 5.85, 0, C.paper)
      door(b, f, 0, D / 2, '#9a94cc', 1.3)
      for (const lx of [-5.4, -3.3, 3.3, 5.4]) windowAt(b, f, lx, 0.28 + 1.7, D / 2, 1.5, 1.6, { lit: true, shutter: '#9a94cc' })
      for (const lx of [-5.4, -3.3, -1.1, 1.1, 3.3, 5.4]) windowAt(b, f, lx, 0.28 + 4.1, D / 2, 1.3, 1.2, { lit: true })
      const radar = new THREE.Group()
      const rp = f.at(-3.8, 6.3, -0.6)
      radar.position.set(rp[0], rp[1], rp[2])
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.6, 12), mats.color(C.indigo))
      mast.position.y = 0.8
      radar.add(mast)
      const dish = new THREE.Mesh(new THREE.SphereGeometry(1.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 3), mats.color(C.paper, { side: THREE.DoubleSide }))
      dish.rotation.x = Math.PI / 2.3
      dish.position.set(0, 1.9, 0.2)
      radar.add(dish)
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mats.signal)
      tip.position.set(0, 2.3, 1.0)
      radar.add(tip)
      radar.traverse((o) => { o.castShadow = true })
      scene.add(radar)
      out.radar = radar
      f.put(b, 'metal', cyl(0.08, 0.12, 4.2, 8), 4.6, 6.3 + 2.1, -1.2, '#c9d6e8')
      for (let k = 0; k < 3; k += 1) f.put(b, 'metal', box(0.9 - k * 0.2, 0.06, 0.06), 4.6, 7.2 + k * 1.0, -1.2, '#c9d6e8')
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), mats.signal.clone())
      const bp = f.at(4.6, 10.55, -1.2)
      beacon.position.set(bp[0], bp[1], bp[2])
      scene.add(beacon)
      out.beacon = beacon
      sign(info.building, '值班 · 邮件 · 文档 · 数据', 0.28 + 2.95, '#7d77b8')
      occ.rect(bx - 8.5, bz - 8.5, bx + 8.5, bz + 8.5)
    }
    occ.rect(bx - 8, bz - 8, bx + 8, bz + 8)
  }
  return out
}

/* ------------------------------------------------------------------ */
/* plaza and the signal tower                                           */
/* ------------------------------------------------------------------ */

export interface PlazaBuilt { beacon: THREE.Mesh; halo: THREE.Mesh }

export function buildPlaza(b: Batcher, occ: Occupancy, mats: Mats, scene: THREE.Object3D): PlazaBuilt {
  const y = 0.17
  b.put('tiles', cyl(11.2, 11.2, 0.03, 64), 0, y + 0.015, 0, '#f1e3c6')
  b.put('tiles', cyl(9.6, 9.6, 0.035, 64), 0, y + 0.02, 0, '#f8eedb')
  b.put('paint', cyl(3.4, 3.6, 0.36, 48), 0, y + 0.18, 0, '#efe1c6')
  // the tower
  b.put('paint', cyl(2.2, 2.4, 1.1, 40), 0, y + 0.9, 0, C.cream)
  b.put('paint', cyl(1.25, 1.45, 9.0, 32), 0, y + 5.9, 0, C.indigo)
  for (const ty of [3.6, 6.0, 8.4]) b.put('paint', cyl(1.42, 1.42, 0.36, 32), 0, y + ty, 0, C.mint)
  for (let k = 0; k < 8; k += 1) {
    const a = (k / 8) * Math.PI * 2
    b.put('glass', box(0.18, 0.9, 0.1), Math.cos(a) * 1.37, y + 7.2, Math.sin(a) * 1.37, '#bcdcf3', -a + Math.PI / 2)
  }
  b.put('paint', cyl(2.0, 1.8, 0.46, 36), 0, y + 10.6, 0, C.cream)
  for (let k = 0; k < 6; k += 1) {
    const a = (k / 6) * Math.PI * 2
    b.put('paint', cyl(0.07, 0.07, 1.8, 6), Math.cos(a) * 1.6, y + 11.7, Math.sin(a) * 1.6, C.paper)
  }
  b.put('paint', cone(2.0, 1.0, 36), 0, y + 13.1, 0, C.indigo)
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.0, 32, 20), mats.signal)
  beacon.position.set(0, y + 11.85, 0)
  beacon.castShadow = true
  scene.add(beacon)
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.12, 10, 48), mats.color(C.paper))
  halo.rotation.x = Math.PI / 2
  halo.position.set(0, y + 11.85, 0)
  scene.add(halo)
  occ.circle(0, 0, 3.8)

  // benches facing the tower, planters in the corners, the coffee cart
  for (const p of PLAZA.benches) {
    bench(b, p.x, y, p.z, Math.atan2(-p.x, -p.z))
    occ.circle(p.x, p.z, 1.3)
  }
  for (const [x, z] of [[11, 11], [-11, 11], [11, -11], [-11, -11]] as const) {
    b.put('paint', cyl(1.3, 1.2, 0.6, 24), x, y + 0.3, z, C.cream)
    b.put('grass', cyl(1.12, 1.12, 0.1, 24), x, y + 0.6, z, '#9fdcc2')
    occ.circle(x, z, 1.6)
  }
  const cart = new Frame(PLAZA.coffee.x, y, PLAZA.coffee.z, Math.PI / 2)
  cart.put(b, 'paint', rbox(1.4, 1.0, 2.2, 0.15), 0, 0.85, 0, '#ffe6dc')
  cart.put(b, 'wood', rbox(1.5, 0.12, 2.3, 0.04), 0, 1.4, 0, C.wood)
  for (const s of [-0.8, 0.8]) cart.put(b, 'paint', cyl(0.28, 0.28, 0.12, 14), 0.72, 0.3, s, C.indigo, 0, 0, 1, 1, 1, Math.PI / 2)
  cart.put(b, 'paint', cyl(0.05, 0.05, 2.0, 8), 0, 2.3, 0, C.indigo)
  cart.put(b, 'paint', cone(1.5, 0.6, 16), 0, 3.35, 0, C.coral)
  cart.put(b, 'paint', cyl(0.16, 0.13, 0.3, 12), 0.2, 1.62, 0.6, C.paper)
  cart.put(b, 'paint', cyl(0.16, 0.13, 0.3, 12), 0.2, 1.62, 0.15, C.paper)
  occ.circle(PLAZA.coffee.x, PLAZA.coffee.z, 1.6)
  for (const [x, z] of [[12.2, 6], [12.2, -6], [-12.2, 6], [-12.2, -6], [6, 12.2], [-6, 12.2], [6, -12.2], [-6, -12.2]] as const) lamp(b, x, y, z)
  // standing desks for anyone working without a desk of their own
  for (const h of HOT_DESKS) {
    const f = new Frame(h.x, y, h.z, h.face)
    f.put(b, 'paint', cyl(0.3, 0.34, 0.05, 20), 0, 0.025, 0.95, C.indigo)
    f.put(b, 'paint', cyl(0.045, 0.055, 1.0, 10), 0, 0.52, 0.95, C.indigo)
    f.put(b, 'wood', rbox(1.1, 0.06, 0.62, 0.03), 0, 1.04, 0.95, C.wood)
    f.put(b, 'paint', rbox(0.44, 0.02, 0.3, 0.01), 0, 1.08, 0.9, '#d9dcee')
    f.put(b, 'paint', rbox(0.44, 0.28, 0.02, 0.01), 0, 1.23, 1.06, '#d9dcee', 0, 0.22)
    f.put(b, 'screen', box(0.39, 0.23, 0.005), 0, 1.23, 1.045, '#cfe6ff', Math.PI, -0.22)
    const p = f.at(0, 0, 0.95)
    occ.circle(p[0], p[2], 0.8)
  }
  // the square is paved: nothing grows on it but the planters
  occ.rect(-12.6, -12.6, 12.6, 12.6)
  return { beacon, halo }
}

export function bench(b: Batcher, x: number, y: number, z: number, ry: number) {
  const f = new Frame(x, y, z, ry)
  for (let i = 0; i < 3; i += 1) f.put(b, 'wood', rbox(2.0, 0.08, 0.2, 0.03), 0, 0.5, -0.22 + i * 0.22, C.wood)
  for (let i = 0; i < 2; i += 1) f.put(b, 'wood', rbox(2.0, 0.18, 0.06, 0.03), 0, 0.78 + i * 0.24, -0.38, C.wood, 0, -0.18)
  for (const sx of [-0.85, 0.85]) {
    f.put(b, 'paint', rbox(0.08, 0.5, 0.6, 0.02), sx, 0.25, -0.05, C.indigo)
    f.put(b, 'paint', rbox(0.08, 0.6, 0.08, 0.02), sx, 0.75, -0.38, C.indigo)
  }
}

export function lamp(b: Batcher, x: number, y: number, z: number) {
  b.put('paint', cyl(0.13, 0.16, 0.3, 12), x, y + 0.15, z, C.indigo)
  b.put('paint', cyl(0.06, 0.08, 3.4, 10), x, y + 1.9, z, C.indigo)
  b.put('paint', cyl(0.36, 0.3, 0.12, 16), x, y + 3.62, z, C.paper)
  b.put('lamp', sphere(0.3, 16, 12), x, y + 3.92, z, '#ffffff')
  b.put('paint', cyl(0.05, 0.05, 0.12, 8), x, y + 4.26, z, C.indigo)
}

/** Lamps along the kerbs of every road, off the walking lines and the crossings. */
export function buildStreetLamps(b: Batcher, occ: Occupancy) {
  for (const g of L) {
    for (let i = 0; i < L.length - 1; i += 1) {
      const mid = (L[i] + L[i + 1]) / 2
      for (const o of [-6, 6]) {
        const side = Math.sign(o)
        const u = mid + o
        // on the grass edge, clear of both walking lanes on the sidewalk
        const off = g + side * (GE + 0.35)
        if (Math.abs(off) > REACH + 1.5) continue
        lamp(b, u, 0.15, off)
        lamp(b, off, 0.15, u)
        occ.circle(u, off, 0.4)
        occ.circle(off, u, 0.4)
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* the elevated railway                                                 */
/* ------------------------------------------------------------------ */

export interface Rail { pts: Array<[number, number]>; lens: number[]; total: number; at: (s: number) => [number, number, number]; stationS: number }

export function railPath(): Rail {
  const pts: Array<[number, number]> = []
  const h = RAIL.half, r = RAIL.r, c = h - r
  const line = (x0: number, z0: number, x1: number, z1: number) => {
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 1.5)
    for (let i = 0; i < n; i += 1) { const t = i / n; pts.push([x0 + (x1 - x0) * t, z0 + (z1 - z0) * t]) }
  }
  const arc = (cx: number, cz: number, a0: number, a1: number) => {
    for (let i = 0; i < 16; i += 1) { const a = a0 + ((a1 - a0) * i) / 16; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]) }
  }
  line(-c, -h, c, -h); arc(c, -c, -Math.PI / 2, 0)
  line(h, -c, h, c); arc(c, c, 0, Math.PI / 2)
  line(c, h, -c, h); arc(-c, c, Math.PI / 2, Math.PI)
  line(-h, c, -h, -c); arc(-c, -c, Math.PI, Math.PI * 1.5)
  const lens = [0]
  for (let i = 1; i <= pts.length; i += 1) {
    const a = pts[i - 1], q = pts[i % pts.length]
    lens.push(lens[i - 1] + Math.hypot(q[0] - a[0], q[1] - a[1]))
  }
  const total = lens[lens.length - 1]
  const at = (s: number): [number, number, number] => {
    s = ((s % total) + total) % total
    let lo = 0, hi = lens.length - 1
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (lens[m] <= s) lo = m; else hi = m }
    const a = pts[lo], q = pts[(lo + 1) % pts.length]
    const t = (s - lens[lo]) / (lens[lo + 1] - lens[lo] || 1)
    return [a[0] + (q[0] - a[0]) * t, a[1] + (q[1] - a[1]) * t, Math.atan2(q[0] - a[0], q[1] - a[1])]
  }
  let stationS = 0, bd = Infinity
  for (let s = 0; s < total; s += 0.25) { const p = at(s); const d = Math.hypot(p[0] - h, p[1]); if (d < bd) { bd = d; stationS = s } }
  return { pts, lens, total, at, stationS }
}

export function buildRail(b: Batcher, occ: Occupancy, rail: Rail, scene: THREE.Object3D) {
  const Y = RAIL.y
  for (let i = 0; i < rail.pts.length; i += 1) {
    const a = rail.pts[i], q = rail.pts[(i + 1) % rail.pts.length]
    const len = Math.hypot(q[0] - a[0], q[1] - a[1])
    const ry = Math.atan2(q[0] - a[0], q[1] - a[1])
    b.put('paint', box(1.5, 0.55, len + 0.05), (a[0] + q[0]) / 2, Y - 0.28, (a[1] + q[1]) / 2, C.paper, ry)
    b.put('paint', box(1.56, 0.14, len + 0.05), (a[0] + q[0]) / 2, Y - 0.42, (a[1] + q[1]) / 2, C.coral, ry)
    b.put('metal', box(0.3, 0.12, len + 0.05), (a[0] + q[0]) / 2, Y + 0.04, (a[1] + q[1]) / 2, '#c9d6e8', ry)
  }
  for (let s = 5; s < rail.total; s += 11) {
    const p = rail.at(s)
    if ((Math.abs(p[0]) < 6 && Math.abs(p[1]) > 40) || (Math.abs(p[1]) < 11 && Math.abs(p[0]) > 40)) continue
    b.put('paint', cyl(0.38, 0.46, Y - 0.55, 14), p[0], (Y - 0.55) / 2, p[1], '#dcd9f0')
    b.put('paint', rbox(1.5, 0.3, 1.0, 0.06), p[0], Y - 0.7, p[1], '#dcd9f0', p[2])
    occ.circle(p[0], p[1], 0.9)
  }
  // 信号镇站 on the east side
  const px = RAIL.half - 2.3
  b.put('tiles', slab(2.6, 20, 0.4, 0.4, 0.06), px, Y - 0.62, 0, C.walk)
  for (const z of [-9, -3, 3, 9]) b.put('paint', cyl(0.3, 0.34, Y - 0.62, 12), px, (Y - 0.62) / 2, z, '#dcd9f0')
  for (const z of [-7, 0, 7]) b.put('paint', cyl(0.07, 0.07, 2.8, 8), px - 0.9, Y + 1.2, z, C.indigo)
  b.put('roof', slab(3.4, 17, 0.25, 0.6, 0.08), px - 0.4, Y + 2.55, 0, C.coral)
  for (let k = 0; k < 14; k += 1) {
    const yy = Y - 0.62 - (k + 1) * ((Y - 0.62) / 14)
    b.put('tiles', box(2.4, 0.36, 0.7), px, yy + 0.18, -10.4 - k * 0.66, C.walk)
  }
  for (let k = 0; k < 2; k += 1) b.put('paint', box(0.08, 0.08, 9.4), px + (k ? 1.2 : -1.2), Y / 2 + 0.8, -15.0, C.paper, 0, -Math.atan2(Y, 9.2))
  occ.rect(px - 2, -20, px + 2, 11)
  const s = makeSign('信号镇站', 'SIGNAL TOWN', 3.2, { bg: C.coral })
  s.position.set(px - 1.6, Y + 1.65, -9.6)
  s.rotation.y = -Math.PI / 2
  scene.add(s)
}
