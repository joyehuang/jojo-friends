// Traffic: cars on the road grid (they keep to their lane, queue, take turns
// at junctions and stop for anyone on a zebra crossing), the elevated train
// that loops the island and stops at 信号镇站, and sailing boats offshore.
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { C, cyl, slab, sphere } from './kit'
import { L, junctionKey, type Crossing } from './layout'
import type { Rail } from './world/buildings'
import { makeBoat } from './world/islets'
import type { Mats } from './kit'

export interface Pedestrian { x: number; z: number; crossing: Crossing | null }

const STOP = 6.6
const LANE = 1.25

interface Piece { pts: Array<[number, number]>; lens: number[]; len: number }

function mkPiece(pts: Array<[number, number]>): Piece {
  const lens = [0]
  for (let i = 1; i < pts.length; i += 1) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  return { pts, lens, len: lens[lens.length - 1] }
}

function along(p: Piece, s: number): [number, number, number] {
  const L2 = p.lens
  let i = 1
  while (i < L2.length - 1 && L2[i] < s) i += 1
  const seg = L2[i] - L2[i - 1] || 1
  const f = Math.max(0, Math.min(1, (s - L2[i - 1]) / seg))
  const A = p.pts[i - 1], B = p.pts[i]
  return [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, Math.atan2(B[0] - A[0], B[1] - A[1])]
}

const angDiff = (a: number, b: number) => {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

type CarState = 'drive' | 'wait' | 'turn'

interface Car {
  id: number
  g: THREE.Group
  a: number
  b: number
  next: number | undefined
  piece: Piece
  dist: number
  state: CarState
  v: number
  vmax: number
  x: number
  z: number
  heading: number
  waitT: number
  length: number
}

interface Part { g: THREE.BufferGeometry; x: number; y: number; z: number; c: string; sx?: number; sy?: number; sz?: number; rz?: number }

/** One vertex-coloured geometry from many small parts (a car is then one draw call). */
function merged(parts: Part[]): THREE.BufferGeometry {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color()
  const list = parts.map((p) => {
    const g = p.g.index ? p.g.toNonIndexed() : p.g.clone()
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name)
    g.clearGroups()
    e.set(0, 0, p.rz ?? 0)
    q.setFromEuler(e)
    m.compose(new THREE.Vector3(p.x, p.y, p.z), q, new THREE.Vector3(p.sx ?? 1, p.sy ?? 1, p.sz ?? 1))
    g.applyMatrix4(m)
    col.set(p.c)
    const n = g.getAttribute('position').count
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i += 1) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3))
    return g
  })
  return mergeGeometries(list)!
}

const CAR_COLORS = ['#fe6a4a', '#6f9fd8', '#5fc4a6', '#9a94cc', '#ffd27a', '#2d3272', '#f0866a', '#96c5ed']

export class Traffic {
  private nodes: Array<[number, number]> = []
  private adj: number[][] = []
  private index = new Map<string, number>()
  private reserved = new Map<number, number>()
  private cars: Car[] = []
  private rand: () => number
  private paintMat: THREE.MeshStandardMaterial
  private headMat: THREE.MeshStandardMaterial
  private tailMat: THREE.MeshStandardMaterial
  private train: { g: THREE.Group[]; s: number; v: number; dwell: number; lights: THREE.MeshStandardMaterial }
  private boats: Array<{ g: THREE.Group; cx: number; cz: number; r: number; a: number; w: number }> = []
  peds: Pedestrian[] = []

  constructor(scene: THREE.Object3D, private mats: Mats, private rail: Rail, seed = 7) {
    let s = seed
    this.rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 }
    const node = (x: number, z: number) => {
      const k = junctionKey(x, z)
      let i = this.index.get(k)
      if (i === undefined) { i = this.nodes.length; this.index.set(k, i); this.nodes.push([x, z]); this.adj.push([]) }
      return i
    }
    const link = (a: number, b: number) => { if (!this.adj[a].includes(b)) { this.adj[a].push(b); this.adj[b].push(a) } }
    for (const g of L) for (let i = 0; i < L.length - 1; i += 1) {
      link(node(L[i], g), node(L[i + 1], g))
      link(node(g, L[i]), node(g, L[i + 1]))
    }
    this.paintMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0 })
    this.headMat = new THREE.MeshStandardMaterial({ color: '#fffaf0', emissive: '#fff1c4', emissiveIntensity: 0.1, roughness: 0.3 })
    this.tailMat = new THREE.MeshStandardMaterial({ color: '#ff8a7a', emissive: '#ff4a3a', emissiveIntensity: 0.15, roughness: 0.3 })

    const kinds: Array<'car' | 'van' | 'bus'> = ['bus', 'van', 'van', ...Array<'car'>(11).fill('car')]
    kinds.forEach((kind, k) => {
      let a = 0, b = 0, d = 0, tries = 0
      do {
        a = Math.floor(this.rand() * this.nodes.length)
        b = this.adj[a][Math.floor(this.rand() * this.adj[a].length)]
        d = this.rand() * this.straight(a, b).len
        tries += 1
      } while (this.cars.some((o) => o.a === a && o.b === b && Math.abs(o.dist - d) < 9) && tries < 60)
      if (tries >= 60) return
      const { g, length } = this.vehicle(kind, CAR_COLORS[k % CAR_COLORS.length])
      scene.add(g)
      const piece = this.straight(a, b)
      const p = along(piece, d)
      this.cars.push({ id: k, g, a, b, next: undefined, piece, dist: d, state: 'drive', v: 3, vmax: kind === 'bus' ? 5 : 5.6 + this.rand() * 2, x: p[0], z: p[1], heading: p[2], waitT: 0, length })
    })

    // the train: an engine and two carriages
    const lights = new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: '#ffcf86', emissiveIntensity: 0.2, roughness: 0.3 })
    const trainG = [0, 1, 2].map((i) => this.carriage(i === 0, lights))
    trainG.forEach((g) => scene.add(g))
    this.train = { g: trainG, s: rail.stationS + 40, v: 8, dwell: 0, lights }

    // boats sailing loops in the open water between the islets
    const BOATS = ['#ffd27a', '#fe6a4a', '#5fc4a6', '#9a94cc']
    ;[[118, -118], [-118, 118], [-118, -118], [118, 118]].forEach(([cx, cz], i) => {
      const g = makeBoat(this.mats, BOATS[i])
      g.scale.setScalar(0.85)
      scene.add(g)
      this.boats.push({ g, cx, cz, r: 16 + i * 2, a: i * 1.7, w: (i % 2 ? -1 : 1) * 0.05 })
    })
  }

  private dirOf(a: number, b: number): [number, number] {
    const dx = this.nodes[b][0] - this.nodes[a][0], dz = this.nodes[b][1] - this.nodes[a][1]
    const l = Math.hypot(dx, dz)
    return [dx / l, dz / l]
  }

  private laneP(n: number, d: [number, number], at: number): [number, number] {
    // keep right: the lane is offset to the right of the direction of travel
    return [this.nodes[n][0] + d[0] * at - d[1] * LANE, this.nodes[n][1] + d[1] * at + d[0] * LANE]
  }

  private straight(a: number, b: number): Piece {
    const d = this.dirOf(a, b)
    return mkPiece([this.laneP(a, d, STOP), this.laneP(b, d, -STOP)])
  }

  private turn(a: number, b: number, c: number): Piece {
    const d1 = this.dirOf(a, b), d2 = this.dirOf(b, c)
    const p1 = this.laneP(b, d1, -STOP), q0 = this.laneP(b, d2, STOP)
    const det = d1[0] * d2[1] - d1[1] * d2[0]
    let ctrl: [number, number]
    if (Math.abs(det) < 1e-6) ctrl = [(p1[0] + q0[0]) / 2, (p1[1] + q0[1]) / 2]
    else {
      const rx = q0[0] - p1[0], rz = q0[1] - p1[1]
      const t = (rx * d2[1] - rz * d2[0]) / det
      ctrl = [p1[0] + d1[0] * t, p1[1] + d1[1] * t]
    }
    const pts: Array<[number, number]> = []
    for (let i = 0; i <= 16; i += 1) {
      const u = i / 16, v = 1 - u
      pts.push([v * v * p1[0] + 2 * u * v * ctrl[0] + u * u * q0[0], v * v * p1[1] + 2 * u * v * ctrl[1] + u * u * q0[1]])
    }
    return mkPiece(pts)
  }

  /* ---------------- vehicles ---------------- */

  private vehicle(kind: 'car' | 'van' | 'bus', color: string): { g: THREE.Group; length: number } {
    const body: Part[] = [], heads: Part[] = [], tails: Part[] = []
    const len = kind === 'bus' ? 5.4 : kind === 'van' ? 3.3 : 2.8
    const wid = kind === 'bus' ? 1.75 : 1.55
    const roofCol = color === C.indigo ? C.mint : C.paper
    const glass = '#bcdcf3'
    body.push({ g: slab(wid, len, 0.8, 0.5, 0.16), x: 0, y: 0.26, z: 0, c: color })
    if (kind === 'car') {
      body.push({ g: slab(wid - 0.22, 1.55, 0.6, 0.45, 0.14), x: 0, y: 1.04, z: -0.22, c: roofCol })
      body.push({ g: slab(wid - 0.18, 1.15, 0.34, 0.38, 0.05), x: 0, y: 1.15, z: -0.22, c: glass })
    } else if (kind === 'van') {
      body.push({ g: slab(wid - 0.1, len - 0.9, 1.1, 0.4, 0.14), x: 0, y: 1.0, z: -0.38, c: roofCol })
      body.push({ g: slab(wid - 0.06, 0.7, 0.42, 0.3, 0.05), x: 0, y: 1.25, z: len / 2 - 1.05, c: glass })
      for (const sx of [1, -1]) body.push({ g: slab(0.06, len - 1.4, 0.36, 0.03, 0.01), x: sx * (wid / 2 - 0.02), y: 1.38, z: -0.5, c: C.coral })
    } else {
      body.push({ g: slab(wid - 0.06, len - 0.3, 1.25, 0.5, 0.14), x: 0, y: 1.0, z: -0.05, c: C.paper })
      body.push({ g: slab(wid, len - 0.6, 0.48, 0.42, 0.05), x: 0, y: 1.45, z: 0, c: glass })
      body.push({ g: slab(wid - 0.4, len - 1.4, 0.12, 0.3, 0.04), x: 0, y: 2.24, z: 0, c: C.indigo })
      body.push({ g: slab(wid + 0.02, 0.3, 0.2, 0.08, 0.02), x: 0, y: 0.95, z: len / 2 - 0.3, c: C.coral })
    }
    body.push({ g: sphere(0.17, 14, 10), x: 0, y: kind === 'bus' ? 2.42 : kind === 'van' ? 2.2 : 1.78, z: kind === 'car' ? -0.35 : 0, c: C.coral })
    const wz = len / 2 - (kind === 'bus' ? 0.9 : 0.68)
    const wheel = cyl(0.31, 0.31, 0.24, 18)
    const hub = cyl(0.14, 0.14, 0.26, 12)
    for (const x of [-wid / 2 + 0.1, wid / 2 - 0.1]) for (const z of [-wz, wz]) {
      body.push({ g: wheel, x, y: 0.32, z, c: C.indigo, rz: Math.PI / 2 })
      body.push({ g: hub, x, y: 0.32, z, c: C.paper, rz: Math.PI / 2 })
    }
    for (const x of [-wid / 2 + 0.33, wid / 2 - 0.33]) {
      heads.push({ g: sphere(0.13, 12, 8), x, y: 0.72, z: len / 2 - 0.02, c: '#ffffff', sx: 1.1, sy: 0.85, sz: 0.45 })
      tails.push({ g: sphere(0.11, 10, 8), x, y: 0.74, z: -len / 2 + 0.02, c: '#ffffff', sx: 1.2, sy: 0.7, sz: 0.4 })
    }
    const g = new THREE.Group()
    const m = new THREE.Mesh(merged(body), this.paintMat)
    m.castShadow = true
    m.receiveShadow = true
    g.add(m, new THREE.Mesh(merged(heads), this.headMat), new THREE.Mesh(merged(tails), this.tailMat))
    return { g, length: len }
  }

  private carriage(engine: boolean, lights: THREE.MeshStandardMaterial): THREE.Group {
    const body: Part[] = [], glow: Part[] = [], heads: Part[] = []
    const shell = engine ? C.coral : C.paper
    body.push({ g: slab(2.1, 6.2, 2.1, 0.7, 0.2), x: 0, y: 0.2, z: 0, c: shell })
    glow.push({ g: slab(2.16, 5.6, 0.62, 0.5, 0.06), x: 0, y: 1.1, z: 0, c: '#ffffff' })
    for (let i = -2; i <= 2; i += 1) body.push({ g: slab(2.2, 0.12, 0.66, 0.04, 0.01), x: 0, y: 1.08, z: i * 1.15, c: shell })
    body.push({ g: slab(1.8, 5.6, 0.22, 0.6, 0.06), x: 0, y: 2.28, z: 0, c: C.indigo })
    body.push({ g: slab(2.14, 6.0, 0.2, 0.6, 0.04), x: 0, y: 0.5, z: 0, c: engine ? C.indigo : C.mint })
    if (engine) {
      body.push({ g: sphere(0.22, 14, 10), x: 0, y: 2.55, z: 1.6, c: C.coral })
      body.push({ g: slab(1.6, 0.6, 1.0, 0.3, 0.12), x: 0, y: 0.5, z: 3.15, c: C.indigo })
      for (const x of [-0.55, 0.55]) heads.push({ g: sphere(0.16, 12, 8), x, y: 0.95, z: 3.12, c: '#ffffff', sx: 1, sy: 0.8, sz: 0.4 })
    }
    const g = new THREE.Group()
    const m = new THREE.Mesh(merged(body), this.paintMat)
    m.castShadow = true
    g.add(m, new THREE.Mesh(merged(glow), lights))
    if (heads.length) g.add(new THREE.Mesh(merged(heads), this.headMat))
    return g
  }

  /* ---------------- logic ---------------- */

  /** A crossing is busy when a car is turning through it, has waited too long to wait more, or is about to drive over it. */
  crossingBusy(c: Crossing): boolean {
    const node = this.index.get(c.junction)
    return this.cars.some((car) =>
      (car.state === 'turn' && car.b === node) ||
      (car.state === 'wait' && car.b === node && car.waitT > 2.5) ||
      (car.state !== 'wait' && segDist(car.x, car.z, c) < 2.8))
  }

  private aheadBlocked(c: Car, ignoreWaiting: boolean): boolean {
    const fx = Math.sin(c.heading), fz = Math.cos(c.heading)
    const hit = (x: number, z: number, lim: number, lat: number) => {
      const rx = x - c.x, rz = z - c.z
      const ah = rx * fx + rz * fz
      const la = Math.abs(rx * fz - rz * fx)
      return ah > 0.2 && ah < lim && la < lat
    }
    if (this.peds.some((p) => hit(p.x, p.z, c.length / 2 + 2.6, 1.5))) return true
    return this.cars.some((o) => o !== c && !(ignoreWaiting && o.state === 'wait') && hit(o.x, o.z, (c.length + o.length) / 2 + 1.6, 1.35))
  }

  private canEnter(c: Car): boolean {
    const r = this.reserved.get(c.b)
    if (r !== undefined && r !== c.id) return false
    const key = junctionKey(...this.nodes[c.b])
    if (this.peds.some((p) => p.crossing && p.crossing.junction === key)) return false
    return !this.cars.some((o) => o !== c && o.a === c.b && o.b === c.next && o.state !== 'turn' && o.dist < 7 + o.length / 2)
  }

  private stepCar(c: Car, dt: number) {
    if (c.state === 'wait') {
      c.v = 0
      c.waitT += dt
      if (c.next === undefined) {
        const opts = this.adj[c.b].filter((n) => n !== c.a)
        c.next = opts.length ? opts[Math.floor(this.rand() * opts.length)] : c.a
      }
      if (this.canEnter(c)) {
        this.reserved.set(c.b, c.id)
        c.piece = this.turn(c.a, c.b, c.next)
        c.dist = 0
        c.state = 'turn'
        c.waitT = 0
      }
    } else {
      let target = c.vmax
      if (c.state === 'turn') target = Math.min(target, 3.6)
      if (this.aheadBlocked(c, c.state === 'turn')) target = 0
      if (c.state === 'drive') target = Math.min(target, Math.max(0.6, (c.piece.len - c.dist) * 1.4))
      c.v += Math.max(-dt * 12, Math.min(dt * 4, target - c.v))
      c.dist += c.v * dt
      if (c.dist >= c.piece.len) {
        if (c.state === 'drive') {
          c.dist = c.piece.len
          c.state = 'wait'
        } else {
          this.reserved.delete(c.b)
          c.a = c.b
          c.b = c.next!
          c.next = undefined
          c.piece = this.straight(c.a, c.b)
          c.dist = 0
          c.state = 'drive'
        }
      }
    }
    const p = along(c.piece, c.dist)
    c.x = p[0]
    c.z = p[1]
    if (c.v > 0.05) c.heading += angDiff(c.heading, p[2]) * Math.min(1, dt * 10)
    c.g.position.set(c.x, 0.05, c.z)
    c.g.rotation.y = c.heading
  }

  update(t: number, dt: number, night: number) {
    const step = Math.min(dt, 0.05)
    for (const c of this.cars) this.stepCar(c, step)
    this.headMat.emissiveIntensity = 0.1 + night * 1.6
    this.tailMat.emissiveIntensity = 0.15 + night * 1.0

    // train: cruise, brake into the station, wait, pull away
    const tr = this.train
    const total = this.rail.total
    const toStation = (((this.rail.stationS - tr.s) % total) + total) % total
    if (tr.dwell > 0) {
      tr.dwell -= step
      tr.v = 0
      if (tr.dwell <= 0) tr.s += 0.5
    } else {
      const want = toStation < 40 ? Math.max(0.8, toStation * 0.32) : 9
      tr.v += Math.max(-step * 3, Math.min(step * 1.6, want - tr.v))
      tr.s += tr.v * step
      if (toStation < 0.4) tr.dwell = 7
    }
    tr.g.forEach((g, i) => {
      const s = tr.s - i * 6.6
      const a = this.rail.at(s - 2.6), b = this.rail.at(s + 2.6)
      g.position.set((a[0] + b[0]) / 2, 5.62, (a[1] + b[1]) / 2)
      g.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1])
    })
    tr.lights.emissiveIntensity = 0.2 + night * 1.3

    for (const bt of this.boats) {
      bt.a += bt.w * step * 2
      const x = bt.cx + Math.cos(bt.a) * bt.r, z = bt.cz + Math.sin(bt.a) * bt.r * 0.7
      bt.g.position.set(x, -0.35 + Math.sin(t * 1.3 + bt.cx) * 0.08, z)
      const dx = -Math.sin(bt.a) * bt.r * Math.sign(bt.w), dz = Math.cos(bt.a) * bt.r * 0.7 * Math.sign(bt.w)
      bt.g.rotation.y = Math.atan2(dx, dz)
      bt.g.rotation.z = Math.sin(t * 0.9 + bt.cz) * 0.05
    }
  }
}

function segDist(x: number, z: number, e: Crossing): number {
  const vx = e.x1 - e.x0, vz = e.z1 - e.z0
  const L2 = vx * vx + vz * vz || 1
  const t = Math.max(0, Math.min(1, ((x - e.x0) * vx + (z - e.z0) * vz) / L2))
  return Math.hypot(x - (e.x0 + vx * t), z - (e.z0 + vz * t))
}
