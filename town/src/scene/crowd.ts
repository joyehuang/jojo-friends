// The people of the town and where they go. Every employee's place follows
// their work: at the desk while working (or waiting on you, or stuck), on a
// bench or at the coffee cart during a break, home asleep when the shift is
// over. Reserves without a job wander the islands. Everyone walks the
// sidewalks on the right, waits at zebra crossings for cars, and makes way
// for each other.
import * as THREE from 'three'
import { CHARACTER_LIST } from '../../../src/library'
import type { EmployeeView, TownSnapshot } from '../work/types'
import { Actor, type Motion } from './actors'
import type { FaceAtlas } from './faces'
import { bubbleTexture } from './icons'
import { HOMES, HOT_DESKS, ISLETS, L, LEISURE, PIER, RING, REACH, ROAD, STATIONS, type Crossing, type Leisure, NavGraph } from './layout'
import type { Traffic } from './traffic'
import type { HomeBuilt } from './world/buildings'
import { bridgeAt, deckY } from './world/ground'

const LANE_W = 0.72

export interface Place {
  key: string
  node: [number, number]
  via: Array<[number, number]>
  pos: [number, number]
  face: number
  inside?: boolean
  leisure?: Leisure
}

interface Waypoint { x: number; z: number; crossing: Crossing | null; node: number | null }

export interface DeckRect { x0: number; z0: number; x1: number; z1: number; y: number }

class Walker {
  x = 0
  z = 0
  y = 0
  heading = 0
  speed: number
  path: Waypoint[] = []
  pi = 0
  place: Place | null = null
  arrived = false
  crossing: Crossing | null = null
  waitT = 0
  blockedT = 0
  /** the place key we are heading for or standing at */
  goalKey = ''
  view: EmployeeView | null = null
  /** what this break is spent on, chosen once per break */
  breakPlan: string | null = null
  roamUntil = 0
  flavourT = 4 + Math.random() * 8
  hiCool = 0
  zz: THREE.Sprite
  constructor(readonly id: string, readonly actor: Actor, readonly home: Place, readonly homeIndex: number) {
    this.speed = 1.65 + Math.random() * 0.4
    this.zz = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTexture('zzz'), transparent: true, depthWrite: false }))
    this.zz.scale.setScalar(1.3)
    this.zz.visible = false
  }
  get moving() {
    return this.pi < this.path.length
  }
}

export class Crowd {
  readonly walkers = new Map<string, Walker>()
  private spots = new Map<string, string>()
  private places = new Map<string, Place>()
  private clock = 0

  constructor(scene: THREE.Object3D, atlas: FaceAtlas, private nav: NavGraph, private traffic: Traffic, homes: HomeBuilt[], private decks: DeckRect[]) {
    for (const slot of Object.values(STATIONS)) {
      this.places.set(`station:${slot.role}`, { key: `station:${slot.role}`, node: slot.node, via: slot.via, pos: slot.spot, face: slot.ry })
    }
    for (const l of LEISURE) this.places.set(`leisure:${l.id}`, { key: `leisure:${l.id}`, node: l.node, via: l.via ?? [], pos: [l.x, l.z], face: l.face, leisure: l })
    for (const h of HOT_DESKS) this.places.set(`hot:${h.id}`, { key: `hot:${h.id}`, node: h.node, via: [], pos: [h.x, h.z], face: h.face })
    CHARACTER_LIST.forEach((c, i) => {
      const plan = HOMES[i % HOMES.length]
      const built = homes[i % homes.length]
      // walk along the sidewalk to the front of the door, then up the stepping stones
      const along: [number, number] = Math.abs(Math.sin(plan.ry)) < 0.5 ? [built.door[0], plan.node[1]] : [plan.node[0], built.door[1]]
      const home: Place = { key: `home:${c.id}`, node: plan.node, via: [along], pos: built.door, face: built.face, inside: true }
      this.places.set(home.key, home)
      const actor = new Actor(c.id, atlas)
      scene.add(actor.root)
      const w = new Walker(c.id, actor, home, i)
      const roof = new THREE.Vector3(plan.x, 6.4, plan.z)
      w.zz.position.copy(roof)
      scene.add(w.zz)
      this.walkers.set(c.id, w)
    })
  }

  /* ---------------- heights ---------------- */

  groundY(x: number, z: number): number {
    const br = bridgeAt(x, z)
    if (br) return deckY(br.t)
    for (const d of this.decks) if (x > d.x0 && x < d.x1 && z > d.z0 && z < d.z1) return d.y
    if (Math.abs(x) < REACH && Math.abs(z) < REACH) {
      if (L.some((g) => Math.abs(x - g) < ROAD) || L.some((g) => Math.abs(z - g) < ROAD)) return 0.05
      // the round paving around the signal tower sits a little proud of the square
      return Math.hypot(x, z) < 11.2 ? 0.205 : 0.165
    }
    if ((Math.abs(Math.abs(x) - RING) < 1.5 && Math.abs(z) < RING + 1.5) || (Math.abs(Math.abs(z) - RING) < 1.5 && Math.abs(x) < RING + 1.5)) return 0.156
    if (Math.abs(x - PIER.x) < 1.7 && z > PIER.z0 - 1 && z < PIER.z1 + 2) return 0.18
    const hb = ISLETS[2]
    if (x > hb.x + 25.5 && x < hb.x + 44.5 && Math.abs(z - (hb.z + 6)) < 1.7) return 0.18
    return 0.1
  }

  /* ---------------- planning ---------------- */

  private desire(w: Walker, v: EmployeeView, now: number): Place {
    const station = v.role ? this.places.get(`station:${v.role.id}`) : undefined
    if (v.phase === 'offline') return w.home
    const busy = v.phase === 'working' || v.phase === 'blocked' || v.phase === 'error' || v.phase === 'full'
    if (station && busy) {
      w.breakPlan = null
      return station
    }
    if (busy && v.role) {
      // a job with no desk of its own (from your feed): work at a standing desk on the square
      w.breakPlan = null
      if (w.goalKey.startsWith('hot:')) return this.places.get(w.goalKey)!
      const free = HOT_DESKS.find((h) => ![...this.walkers.values()].some((o) => o !== w && o.goalKey === `hot:${h.id}`))
      if (free) return this.places.get(`hot:${free.id}`)!
    }
    if (v.phase === 'break') {
      if (!w.breakPlan) {
        const free = LEISURE.filter((l) => !l.far && (!this.spots.has(l.id) || this.spots.get(l.id) === w.id))
        w.breakPlan = station && (Math.random() < 0.35 || !free.length) ? station.key : `leisure:${free[Math.floor(Math.random() * free.length)].id}`
      }
      const p = this.places.get(w.breakPlan)
      if (p && (!p.leisure || !this.spots.has(p.leisure.id) || this.spots.get(p.leisure.id) === w.id)) return p
      w.breakPlan = null
      return station ?? w.home
    }
    // reserves (and anyone without a desk) roam: islands, benches, the pier
    w.breakPlan = null
    const current = w.goalKey.startsWith('leisure:') ? this.places.get(w.goalKey) : undefined
    if (current && now < w.roamUntil) return current
    const free = LEISURE.filter((l) => !this.spots.has(l.id) || this.spots.get(l.id) === w.id)
    if (!free.length) return w.home
    const pick = free[Math.floor(Math.random() * free.length)]
    w.roamUntil = now + (40 + Math.random() * 70) * 1000 + (pick.far ? 60_000 : 0)
    return this.places.get(`leisure:${pick.id}`)!
  }

  /** right-hand lane offset for walking from a to b */
  private lane(ax: number, az: number, bx: number, bz: number): [number, number] {
    const dx = bx - ax, dz = bz - az
    const l = Math.hypot(dx, dz) || 1
    return [(-dz / l) * LANE_W, (dx / l) * LANE_W]
  }

  private route(w: Walker, to: Place) {
    const pts: Waypoint[] = []
    let startNode: number
    if (w.moving) {
      // finish the leg we are on: keep going to the next graph node (never stop on a road)
      let k = w.pi
      while (k < w.path.length && w.path[k].node === null) k += 1
      if (k < w.path.length) {
        pts.push(...w.path.slice(w.pi, k + 1))
        startNode = w.path[k].node!
      } else {
        startNode = this.nav.nearest(w.x, w.z)
        pts.push({ x: this.nav.nodes[startNode][0], z: this.nav.nodes[startNode][1], crossing: null, node: startNode })
      }
    } else if (w.place) {
      const back = [...w.place.via].reverse()
      for (const p of back) pts.push({ x: p[0], z: p[1], crossing: null, node: null })
      startNode = this.nav.node(...w.place.node)
      pts.push({ x: w.place.node[0], z: w.place.node[1], crossing: null, node: startNode })
    } else {
      startNode = this.nav.nearest(w.x, w.z)
      pts.push({ x: this.nav.nodes[startNode][0], z: this.nav.nodes[startNode][1], crossing: null, node: startNode })
    }
    const goalNode = this.nav.node(...to.node)
    const nodes = this.nav.path(startNode, goalNode) ?? [startNode, goalNode]
    for (let i = 0; i < nodes.length - 1; i += 1) {
      const a = this.nav.nodes[nodes[i]], b = this.nav.nodes[nodes[i + 1]]
      const [ox, oz] = this.lane(a[0], a[1], b[0], b[1])
      const crossing = this.nav.crossing(nodes[i], nodes[i + 1])
      pts.push({ x: a[0] + ox, z: a[1] + oz, crossing: null, node: null })
      pts.push({ x: b[0] + ox, z: b[1] + oz, crossing, node: nodes[i + 1] })
    }
    for (const p of to.via) pts.push({ x: p[0], z: p[1], crossing: null, node: null })
    pts.push({ x: to.pos[0], z: to.pos[1], crossing: null, node: null })
    this.leave(w)
    w.path = pts
    w.pi = 0
    w.place = to
    w.arrived = false
    w.goalKey = to.key
    if (to.leisure) this.spots.set(to.leisure.id, w.id)
    if (!w.actor.root.visible || w.actor.hidden) w.actor.show(true)
  }

  private leave(w: Walker) {
    for (const [spot, who] of this.spots) if (who === w.id) this.spots.delete(spot)
  }

  private settle(w: Walker, p: Place) {
    w.x = p.pos[0]
    w.z = p.pos[1]
    w.heading = p.face
    w.place = p
    w.path = []
    w.pi = 0
    w.arrived = true
    w.goalKey = p.key
    if (p.leisure) this.spots.set(p.leisure.id, w.id)
    w.actor.show(!p.inside)
  }

  /** Apply a new snapshot: faces, status, and where everyone should be. */
  sync(snap: TownSnapshot, first = false) {
    const now = snap.now
    for (const [id, w] of this.walkers) {
      const v = snap.employees[id]
      if (!v) continue
      const prevPhase = w.view?.phase
      w.view = v
      w.actor.setFace(v.emotion)
      w.actor.setStatus(v.status)
      if (prevPhase && prevPhase !== v.phase) {
        if (v.phase !== 'break') w.breakPlan = null
        // a little word when something changes
        if (!first && !w.actor.hidden) {
          if (prevPhase === 'working' && (v.phase === 'break' || v.phase === 'full')) w.actor.say('done', 2.4)
          else if ((prevPhase === 'blocked' || prevPhase === 'error') && v.phase === 'working') w.actor.say(prevPhase === 'error' ? 'work' : 'heart', 2.2)
        }
      }
      const want = this.desire(w, v, now)
      if (first) { this.settle(w, want); continue }
      if (want.key !== w.goalKey) this.route(w, want)
    }
  }

  /* ---------------- per frame ---------------- */

  update(t: number, dt: number) {
    this.clock += dt
    const list = [...this.walkers.values()]
    for (const w of list) this.step(w, dt)
    // make way: walkers never overlap
    for (let i = 0; i < list.length; i += 1) {
      const a = list[i]
      if (a.actor.hidden) continue
      for (let j = i + 1; j < list.length; j += 1) {
        const b = list[j]
        if (b.actor.hidden) continue
        const dx = b.x - a.x, dz = b.z - a.z
        const d = Math.hypot(dx, dz)
        const min = (a.actor.width + b.actor.width) * 0.5
        if (d >= min) continue
        const nx = d > 1e-4 ? dx / d : Math.cos(i * 2.4), nz = d > 1e-4 ? dz / d : Math.sin(i * 2.4)
        const push = (min - d) * 0.5
        const am = a.moving ? 1 : 0, bm = b.moving ? 1 : 0
        const total = am + bm
        if (!total) continue
        a.x -= nx * push * (am / total) * 2 * 0.5
        a.z -= nz * push * (am / total) * 2 * 0.5
        b.x += nx * push * (bm / total) * 2 * 0.5
        b.z += nz * push * (bm / total) * 2 * 0.5
        // passing friends say hi now and then
        if (a.moving !== b.moving && a.hiCool <= 0 && b.hiCool <= 0 && Math.random() < 0.02) {
          a.actor.say('hi', 2.2)
          b.actor.say('heart', 2.2)
          a.hiCool = b.hiCool = 25
        }
      }
    }
    for (const w of list) {
      w.hiCool -= dt
      w.y += (this.groundY(w.x, w.z) - w.y) * Math.min(1, dt * 12)
      w.actor.root.position.set(w.x, w.y, w.z)
      w.actor.root.rotation.y = w.heading
      w.actor.animate(t, dt)
      w.zz.visible = w.actor.hidden && w.view?.phase === 'offline'
      if (w.zz.visible) w.zz.position.y = 6.4 + Math.sin(t * 1.5 + w.homeIndex) * 0.25
    }
  }

  private step(w: Walker, dt: number) {
    const actor = w.actor
    if (w.moving) {
      const wp = w.path[w.pi]
      // about to step onto a zebra crossing: wait for the cars
      if (wp.crossing && w.crossing !== wp.crossing) {
        if (this.traffic.crossingBusy(wp.crossing)) {
          w.waitT += dt
          actor.speed = 0
          actor.setMotion('stand')
          w.heading += angDiff(w.heading, Math.atan2(wp.x - w.x, wp.z - w.z)) * Math.min(1, dt * 6)
          return
        }
        w.crossing = wp.crossing
        w.waitT = 0
      }
      const dx = wp.x - w.x, dz = wp.z - w.z
      const d = Math.hypot(dx, dz)
      let sp = w.speed
      if (!w.crossing) {
        // queue behind someone slower, but never forever
        const fx = dx / (d || 1), fz = dz / (d || 1)
        for (const o of this.walkers.values()) {
          if (o === w || o.actor.hidden) continue
          const rx = o.x - w.x, rz = o.z - w.z
          const ah = rx * fx + rz * fz, la = Math.abs(rx * fz - rz * fx)
          if (ah > 0.1 && ah < (w.actor.width + o.actor.width) * 0.6 && la < 0.55) { sp = o.moving ? Math.min(sp, w.speed * 0.5) : sp * 0.35; break }
        }
        if (sp < w.speed) w.blockedT += dt
        else w.blockedT = 0
        if (w.blockedT > 2.5) sp = w.speed
      }
      const step = sp * dt
      if (d <= step) {
        w.x = wp.x
        w.z = wp.z
        w.pi += 1
        if (wp.crossing) w.crossing = null
        if (w.pi >= w.path.length) this.arrive(w)
      } else {
        w.x += (dx / d) * step
        w.z += (dz / d) * step
        w.heading += angDiff(w.heading, Math.atan2(dx, dz)) * Math.min(1, dt * 9)
      }
      actor.speed = sp
      if (w.moving) actor.setMotion('walk')
      return
    }
    // standing at a place
    actor.speed = 0
    if (w.place) w.heading += angDiff(w.heading, w.place.face) * Math.min(1, dt * 5)
    actor.setMotion(this.motionAt(w))
    const resting = w.place?.key.startsWith('station:') && w.view?.phase === 'break'
    if ((w.place?.leisure || resting) && w.arrived) {
      w.flavourT -= dt
      if (w.flavourT <= 0) {
        w.flavourT = 9 + Math.random() * 10
        if (w.place?.leisure) actor.say(Math.random() < 0.3 ? 'chat' : w.place.leisure.icon, 3)
        else actor.say(Math.random() < 0.5 ? 'coffee' : 'note', 2.6)
      }
    }
  }

  private arrive(w: Walker) {
    w.arrived = true
    w.path = []
    w.pi = 0
    if (w.place?.inside) w.actor.show(false)
    w.flavourT = 1.5 + Math.random() * 2
  }

  private motionAt(w: Walker): Motion {
    const v = w.view
    if (!v || !w.place) return 'stand'
    if (w.place.key.startsWith('station:') || w.place.key.startsWith('hot:')) {
      if (v.phase === 'working') return 'work'
      if (v.phase === 'blocked') return 'ask'
      if (v.phase === 'error') return 'error'
      if (v.phase === 'full') return 'proud'
      return 'rest'
    }
    if (w.place.inside) return 'sleep'
    return w.actor.saying === 'chat' ? 'chat' : 'rest'
  }

  /* ---------------- queries ---------------- */

  cheer(id: string) {
    const w = this.walkers.get(id)
    if (!w || w.actor.hidden) return
    w.actor.cheer()
    w.actor.say('heart', 2)
  }

  pickables(): THREE.Object3D[] {
    const out: THREE.Object3D[] = []
    for (const w of this.walkers.values()) if (!w.actor.hidden) out.push(...w.actor.meshes)
    return out
  }

  /** world position of the top of someone's head (or their roof when they are home) */
  headOf(id: string, out = new THREE.Vector3()): THREE.Vector3 | null {
    const w = this.walkers.get(id)
    if (!w) return null
    if (w.actor.hidden) return out.copy(w.zz.position).setY(5.2)
    return out.set(w.x, w.y + w.actor.top + 0.15, w.z)
  }

  isHome(id: string): boolean {
    return !!this.walkers.get(id)?.actor.hidden
  }

  actor(id: string): Actor | undefined {
    return this.walkers.get(id)?.actor
  }

  where(id: string): string {
    const w = this.walkers.get(id)
    if (!w) return ''
    const place = w.place
    if (w.moving) {
      if (place?.key.startsWith('station:')) return '正在去工位'
      if (place?.key.startsWith('hot:')) return '正在去广场的站立办公桌'
      if (place?.inside) return '正在回家'
      return place?.leisure ? `正在去${place.leisure.label.replace(/^在|^去/, '')}` : '在路上'
    }
    if (!place) return ''
    if (place.inside) return '在家休息'
    if (place.leisure) return place.leisure.label
    if (place.key.startsWith('hot:')) return '在广场的站立办公桌'
    return '在工位'
  }
}

function angDiff(a: number, b: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}
