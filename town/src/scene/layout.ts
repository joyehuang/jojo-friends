// The town plan: every coordinate the world, the walkers and the cars share.
// Units are metres; y is up; the plaza is at the origin; "north" is −z.
import { ROLES, rolesIn } from '../work/roles'
import type { DistrictId } from '../work/types'

export const ROAD = 2.5 // half width of a road
export const SO = 4 // sidewalk centre line, from the road centre
export const GE = 5.5 // grass starts here, from the road centre
export const L = [-46, -18, 18, 46] as const
export const REACH = 46 + ROAD
export const RING = 46 + SO // the outer ring sidewalk
export const CELLS: ReadonlyArray<readonly [number, number]> = [[-46, -18], [-18, 18], [18, 46]]
export const ISLAND = { half: 68, corner: 24 }
export const ISLET = { half: 28, corner: 14, ring: 15 }
export const ISLETS = [
  { key: 'fun' as const, name: '游乐岛', x: 0, z: -124 },
  { key: 'farm' as const, name: '农场岛', x: -124, z: 0 },
  { key: 'harbor' as const, name: '港口岛', x: 124, z: 0 },
]
export interface Bridge { axis: 'x' | 'z'; at: number; u0: number; u1: number }
export const BRIDGES: readonly Bridge[] = [
  { axis: 'z', at: 0, u0: -66, u1: -98 },
  { axis: 'x', at: 0, u0: 66, u1: 98 },
  { axis: 'x', at: 0, u0: -66, u1: -98 },
]
export const PIER = { x: 0, z0: 66, z1: 81 }
export const RAIL = { half: 62, r: 16, y: 5.6 }
export const GROUND = { road: 0.05, walk: 0.15, cell: 0.17, path: 0.1, island: 0 }

/* ------------------------------------------------------------------ */
/* districts and stations                                               */
/* ------------------------------------------------------------------ */

export interface StationSlot {
  role: string
  district: DistrictId
  /** desk centre, world */
  x: number
  z: number
  /** the direction the desk faces (towards the plaza) */
  ry: number
  /** where the employee stands while working */
  spot: [number, number]
  /** where the station joins the walking graph */
  node: [number, number]
  /** waypoints from the node to the spot */
  via: Array<[number, number]>
}

export interface DistrictPlan {
  id: DistrictId
  cx: number
  cz: number
  /** local +z points at the plaza road */
  ry: number
  stations: StationSlot[]
}

/** local (lx, lz) in a frame at (cx, cz) facing ry → world */
export function toWorld(cx: number, cz: number, ry: number, lx: number, lz: number): [number, number] {
  const c = Math.cos(ry), s = Math.sin(ry)
  return [cx + lx * c + lz * s, cz - lx * s + lz * c]
}

const r2 = (v: number) => Math.round(v * 100) / 100

/** District frames: cell centre and the facing that points at the plaza. */
const DISTRICT_FRAMES: Record<Exclude<DistrictId, 'center'>, { cx: number; cz: number; ry: number }> = {
  north: { cx: 0, cz: -32, ry: 0 },
  south: { cx: 0, cz: 32, ry: Math.PI },
  east: { cx: 32, cz: 0, ry: -Math.PI / 2 },
  west: { cx: -32, cz: 0, ry: Math.PI / 2 },
}

/** in district-local metres */
export const DESK_Z = 5.4
export const WORK_Z = 3.9
export const BACK_Z = 2.5
export const BUILDING = { z: -4.7, w: 15, d: 6.6 }

function districtPlan(id: Exclude<DistrictId, 'center'>): DistrictPlan {
  const f = DISTRICT_FRAMES[id]
  const roles = rolesIn(id)
  const n = roles.length
  const spacing = n > 5 ? 4.5 : 5
  const stations = roles.map((role, i) => {
    const lx = (i - (n - 1) / 2) * spacing
    const [x, z] = toWorld(f.cx, f.cz, f.ry, lx, DESK_Z)
    const spot = toWorld(f.cx, f.cz, f.ry, lx, WORK_Z)
    const node = toWorld(f.cx, f.cz, f.ry, lx, BACK_Z)
    return { role: role.id, district: id, x: r2(x), z: r2(z), ry: f.ry, spot: [r2(spot[0]), r2(spot[1])] as [number, number], node: [r2(node[0]), r2(node[1])] as [number, number], via: [] }
  })
  return { id, cx: f.cx, cz: f.cz, ry: f.ry, stations }
}

/** The plaza: Jojo's dispatch desk sits south of the signal tower. */
const DISPATCH: StationSlot = {
  role: 'dispatch',
  district: 'center',
  x: 0,
  z: 6.3,
  ry: 0,
  spot: [0, 4.9],
  node: [14, 0],
  via: [[7.6, 3.0], [3.6, 5.2]],
}

export const DISTRICTS: DistrictPlan[] = [
  { id: 'center', cx: 0, cz: 0, ry: 0, stations: [DISPATCH] },
  ...(['north', 'east', 'south', 'west'] as const).map(districtPlan),
]

export const STATIONS: Record<string, StationSlot> = Object.fromEntries(DISTRICTS.flatMap((d) => d.stations).map((s) => [s.role, s]))

// every role must have a desk
for (const r of ROLES) if (!STATIONS[r.id]) throw new Error(`no station for role ${r.id}`)

/** where each district's back path joins the side sidewalks (world, on the sidewalk lines) */
function backPathLine(id: Exclude<DistrictId, 'center'>): Array<[number, number]> {
  const f = DISTRICT_FRAMES[id]
  const xs = [-14, ...DISTRICTS.find((d) => d.id === id)!.stations.map((s) => {
    const c = Math.cos(f.ry), sn = Math.sin(f.ry)
    const dx = s.node[0] - f.cx, dz = s.node[1] - f.cz
    return dx * c - dz * sn
  }), 14]
  return xs.map((lx) => {
    const [x, z] = toWorld(f.cx, f.cz, f.ry, lx, BACK_Z)
    return [r2(x), r2(z)] as [number, number]
  })
}

/* ------------------------------------------------------------------ */
/* homes                                                                */
/* ------------------------------------------------------------------ */

export interface HomePlan { x: number; z: number; ry: number; node: [number, number]; addr: string; outer: boolean }

export const HOMES: HomePlan[] = (() => {
  const out: HomePlan[] = []
  const corner: Array<[number, number, string]> = [[-1, -1, '西北'], [1, -1, '东北'], [-1, 1, '西南'], [1, 1, '东南']]
  for (const [sx, sz, name] of corner) {
    let n = 1
    for (const oz of [-1, 1]) for (const ox of [-1, 1]) {
      const cx = sx * 32, cz = sz * 32
      out.push({ x: cx + ox * 4.3, z: cz + oz * 4.3, ry: oz > 0 ? 0 : Math.PI, node: [cx, cz + oz * 10], addr: `${name}小区 ${n} 号`, outer: false })
      n += 1
    }
  }
  ;[-32, -11, 11, 32].forEach((z, i) => out.push({ x: -57.5, z, ry: Math.PI / 2, node: [-RING, z], addr: `西岸 ${i + 1} 号`, outer: true }))
  ;[-32, 32].forEach((z, i) => out.push({ x: 57.5, z, ry: -Math.PI / 2, node: [RING, z], addr: `东岸 ${i + 1} 号`, outer: true }))
  ;[-32, 32].forEach((x, i) => out.push({ x, z: -57.5, ry: 0, node: [x, -RING], addr: `北岸 ${i + 1} 号`, outer: true }))
  ;[-32, 32].forEach((x, i) => out.push({ x, z: 57.5, ry: Math.PI, node: [x, RING], addr: `南岸 ${i + 1} 号`, outer: true }))
  return out
})()

/* ------------------------------------------------------------------ */
/* walking graph                                                        */
/* ------------------------------------------------------------------ */

export interface Crossing {
  /** the road intersection this crossing belongs to (car graph node key) */
  junction: string
  x0: number; z0: number; x1: number; z1: number
}

export class NavGraph {
  nodes: Array<[number, number]> = []
  adj: number[][] = []
  edges = new Map<string, Crossing | null>()
  private index = new Map<string, number>()

  node(x: number, z: number): number {
    const key = `${r2(x)},${r2(z)}`
    let i = this.index.get(key)
    if (i === undefined) {
      i = this.nodes.length
      this.index.set(key, i)
      this.nodes.push([r2(x), r2(z)])
      this.adj.push([])
    }
    return i
  }

  has(x: number, z: number): boolean {
    return this.index.has(`${r2(x)},${r2(z)}`)
  }

  static key(a: number, b: number) {
    return a < b ? `${a}-${b}` : `${b}-${a}`
  }

  link(a: number, b: number, crossing: Crossing | null = null) {
    if (a === b || this.adj[a].includes(b)) return
    this.adj[a].push(b)
    this.adj[b].push(a)
    this.edges.set(NavGraph.key(a, b), crossing)
  }

  crossing(a: number, b: number): Crossing | null {
    return this.edges.get(NavGraph.key(a, b)) ?? null
  }

  /** A* on straight-line distance. Returns node indices from a to b (inclusive), or null. */
  path(a: number, b: number): number[] | null {
    if (a === b) return [a]
    const N = this.nodes
    const h = (i: number) => Math.hypot(N[i][0] - N[b][0], N[i][1] - N[b][1])
    const g = new Map<number, number>([[a, 0]])
    const came = new Map<number, number>()
    const open = new Set<number>([a])
    const f = new Map<number, number>([[a, h(a)]])
    while (open.size) {
      let cur = -1
      let best = Infinity
      for (const i of open) { const v = f.get(i)!; if (v < best) { best = v; cur = i } }
      if (cur === b) {
        const out = [b]
        while (came.has(out[0])) out.unshift(came.get(out[0])!)
        return out
      }
      open.delete(cur)
      for (const nb of this.adj[cur]) {
        // crossings cost a little extra, so walkers prefer staying on one side
        const extra = this.crossing(cur, nb) ? 6 : 0
        const t = g.get(cur)! + Math.hypot(N[nb][0] - N[cur][0], N[nb][1] - N[cur][1]) + extra
        if (t < (g.get(nb) ?? Infinity)) {
          came.set(nb, cur)
          g.set(nb, t)
          f.set(nb, t + h(nb))
          open.add(nb)
        }
      }
    }
    return null
  }

  nearest(x: number, z: number): number {
    let best = 0
    let bd = Infinity
    this.nodes.forEach((n, i) => {
      const d = Math.hypot(n[0] - x, n[1] - z)
      if (d < bd) { bd = d; best = i }
    })
    return best
  }
}

export const SWL: readonly number[] = L.flatMap((g) => [g - SO, g + SO]).sort((a, b) => a - b)
const MIDS = [-32, 0, 32]

export const junctionKey = (x: number, z: number) => `${x},${z}`

export function buildNav(): NavGraph {
  const nav = new NavGraph()
  const extras = new Map<string, number[]>()
  const addExtra = (axis: 'x' | 'z', line: number, v: number) => {
    const key = axis + line
    extras.set(key, [...(extras.get(key) ?? []), v])
  }
  // district back paths join the side sidewalks
  for (const id of ['north', 'south', 'east', 'west'] as const) {
    const pts = backPathLine(id)
    const first = pts[0], last = pts[pts.length - 1]
    if (id === 'north' || id === 'south') { addExtra('x', first[0], first[1]); addExtra('x', last[0], last[1]) }
    else { addExtra('z', first[1], first[0]); addExtra('z', last[1], last[0]) }
  }
  addExtra('x', -RING, -11)
  addExtra('x', -RING, 11)

  for (const s of SWL) {
    for (const axis of ['x', 'z'] as const) {
      const coords = [...SWL, ...MIDS, ...(extras.get(axis + s) ?? [])]
      const cs = [...new Set(coords.map(r2))].sort((a, b) => a - b)
      for (let i = 0; i < cs.length - 1; i += 1) {
        const u0 = cs[i], u1 = cs[i + 1]
        const a = axis === 'z' ? nav.node(u0, s) : nav.node(s, u0)
        const b = axis === 'z' ? nav.node(u1, s) : nav.node(s, u1)
        let crossing: Crossing | null = null
        for (const g of L) {
          if (u0 < g && g < u1 && Math.abs(s) < REACH) {
            const near = L.reduce((p, q) => (Math.abs(q - s) < Math.abs(p - s) ? q : p), L[0])
            crossing = axis === 'z'
              ? { junction: junctionKey(g, near), x0: g - ROAD, z0: s, x1: g + ROAD, z1: s }
              : { junction: junctionKey(near, g), x0: s, z0: g - ROAD, x1: s, z1: g + ROAD }
          }
        }
        nav.link(a, b, crossing)
      }
    }
  }
  // the back paths behind each row of desks
  for (const id of ['north', 'south', 'east', 'west'] as const) {
    const pts = backPathLine(id)
    for (let i = 0; i < pts.length - 1; i += 1) nav.link(nav.node(...pts[i]), nav.node(...pts[i + 1]))
  }
  // shore paths, bridges and the islet rings
  const R = ISLET.ring
  const ring8: Array<[number, number]> = [[-R, -R], [0, -R], [R, -R], [R, 0], [R, R], [0, R], [-R, R], [-R, 0]]
  for (const s of ISLETS) {
    for (let i = 0; i < 8; i += 1) {
      const a = ring8[i], b = ring8[(i + 1) % 8]
      nav.link(nav.node(s.x + a[0], s.z + a[1]), nav.node(s.x + b[0], s.z + b[1]))
    }
  }
  const chain = (pts: Array<[number, number]>) => { for (let i = 0; i < pts.length - 1; i += 1) nav.link(nav.node(...pts[i]), nav.node(...pts[i + 1])) }
  chain([[0, -RING], [0, -66], [0, -98], [0, -124 + R]])
  chain([[RING, 0], [66, 0], [98, 0], [124 - R, 0]])
  chain([[-RING, 0], [-66, 0], [-98, 0], [-124 + R, 0]])
  chain([[0, RING], [0, 66], [0, 79]])
  return nav
}

/* ------------------------------------------------------------------ */
/* places to go                                                         */
/* ------------------------------------------------------------------ */

export type Icon = 'home' | 'zzz' | 'coffee' | 'star' | 'note' | 'icecream' | 'drop' | 'fish' | 'chat' | 'book' | 'heart' | 'flower' | 'work'

export interface Leisure {
  id: string
  x: number
  z: number
  face: number
  icon: Icon
  label: string
  node: [number, number]
  via?: Array<[number, number]>
  /** the main island (short breaks) or an islet (long ones) */
  far: boolean
}

export const LEISURE: Leisure[] = [
  { id: 'bench-ne', x: 6.9, z: -6.9, face: Math.atan2(-6.9, 6.9), icon: 'zzz', label: '在广场长椅上发呆', node: [14, 0], far: false },
  { id: 'bench-nw', x: -6.9, z: -6.9, face: Math.atan2(6.9, 6.9), icon: 'chat', label: '在广场长椅上聊天', node: [-14, 0], far: false },
  { id: 'bench-sw', x: -6.9, z: 6.9, face: Math.atan2(6.9, -6.9), icon: 'heart', label: '在广场晒太阳', node: [-14, 0], far: false },
  { id: 'coffee', x: -8.5, z: 1.6, face: -Math.PI / 2, icon: 'coffee', label: '在咖啡车买了杯咖啡', node: [-14, 0], far: false },
  { id: 'wheel-a', x: 4.6, z: -124 + 9.6, face: Math.PI, icon: 'star', label: '在摩天轮下看风景', node: [0, -124 + ISLET.ring], far: true },
  { id: 'wheel-b', x: -4.6, z: -124 + 9.6, face: Math.PI, icon: 'star', label: '在摩天轮下看风景', node: [0, -124 + ISLET.ring], far: true },
  { id: 'carousel', x: -16.8, z: -124 + 3, face: Math.atan2(-4.4, -3), icon: 'note', label: '去坐旋转木马', node: [-ISLET.ring, -124], far: true },
  { id: 'icecream', x: 17.2, z: -124, face: Math.PI / 2, icon: 'icecream', label: '买了一支冰淇淋', node: [ISLET.ring, -124], far: true },
  { id: 'farm', x: -124 + 2, z: -12.4, face: 0, icon: 'drop', label: '去农场给菜地浇水', node: [-124, -ISLET.ring], far: true },
  { id: 'windmill', x: -124 - 17.4, z: 4.2, face: Math.atan2(-4.6, 4.4), icon: 'star', label: '在农场看风车转', node: [-124 - ISLET.ring, 0], far: true },
  { id: 'gate', x: 124 - 5.2, z: 3.4, face: Math.PI / 2, icon: 'star', label: '在信号门前等新朋友', node: [124 - ISLET.ring, 0], far: true },
  { id: 'lighthouse', x: 124 + 17, z: -5, face: Math.atan2(4.2, -4.6), icon: 'star', label: '在灯塔下看海', node: [124 + ISLET.ring, 0], far: true },
  { id: 'dock', x: 124 + 41, z: 6, face: Math.PI / 2, icon: 'fish', label: '在港口码头看船', node: [124 + ISLET.ring, 0], via: [[124 + 27, 6]], far: true },
  { id: 'pier', x: 0, z: 79.6, face: 0, icon: 'fish', label: '在码头钓鱼', node: [0, 79], far: true },
]

// two spots in front of each district building, for a stretch between tasks
for (const d of DISTRICTS) {
  if (d.id === 'center' || d.stations.length < 3) continue
  const c = Math.cos(d.ry), sn = Math.sin(d.ry)
  const picks = [d.stations[1], d.stations[d.stations.length - 2]]
  picks.forEach((st, i) => {
    const lx = (st.node[0] - d.cx) * c - (st.node[1] - d.cz) * sn
    const [x, z] = toWorld(d.cx, d.cz, d.ry, lx, 0.6)
    LEISURE.push({
      id: `yard-${d.id}-${i}`, x: r2(x), z: r2(z), face: d.ry,
      icon: i ? 'coffee' : 'chat', label: i ? '在楼前喝口水' : '在楼前和同事聊天',
      node: st.node, far: false,
    })
  })
}

/** Where the plaza's coffee cart, benches and beds go (kept off the walking lines). */
export const PLAZA = {
  half: 18 - GE,
  benches: [
    { x: 8.6, z: -8.6 }, { x: -8.6, z: -8.6 }, { x: -8.6, z: 8.6 }, { x: 8.6, z: 8.6 },
  ],
  coffee: { x: -10.6, z: 1.6 },
}
