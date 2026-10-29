// The 3D town, wired to the store: builds the world once, then every frame
// moves the people, cars and boats, lights the sky for the time of day, keeps
// the shelves and desks in step with the work, and answers the pointer.
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { CHARACTERS } from '../../../src/library'
import type { TownStore } from '../store'
import type { Output, TownSnapshot } from '../work/types'
import { Crowd } from './crowd'
import { Engine, type Level } from './engine'
import { FaceAtlas } from './faces'
import { Items } from './items'
import { Batcher, Mats } from './kit'
import { STATIONS, buildNav } from './layout'
import { buildStations, deckRect, paintStation, updatePlate, type StationView } from './stations'
import { Traffic } from './traffic'
import { buildDistricts, buildHomes, buildPlaza, buildRail, buildStreetLamps, railPath, type DistrictBuilt, type PlazaBuilt } from './world/buildings'
import { Occupancy, buildGround, makeWater } from './world/ground'
import { buildIslets, type IsletAnims } from './world/islets'
import { buildNature } from './world/nature'

export type Pick = { kind: 'employee'; id: string } | { kind: 'output'; id: string; employee: string } | { kind: 'station'; role: string; holder: string | null }

const HOME_VIEW = { target: new THREE.Vector3(0, 0, 4), azimuth: 0.5, polar: 0.98, distance: 84 }
const MAP_LIMIT = 175

interface Smoke { points: THREE.Points; age: Float32Array; seeds: Float32Array; src: THREE.Vector3[]; pos: Float32Array }

export class Town3D {
  readonly engine: Engine
  readonly controls: OrbitControls
  private mats = new Mats()
  private atlas = new FaceAtlas()
  private crowd: Crowd
  private traffic: Traffic
  private items: Items
  private stations: Map<string, StationView>
  private districts: DistrictBuilt
  private plaza: PlazaBuilt
  private islets: IsletAnims
  private water: { mesh: THREE.Mesh; tick: (t: number) => void }
  private smoke: Smoke
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private pointerIn = false
  private down: { x: number; y: number; t: number } | null = null
  private hover: Pick | null = null
  private keys = new Set<string>()
  private raf = 0
  private last = 0
  private clock = 0
  private snapSeen: TownSnapshot | null = null
  private unsub: Array<() => void> = []
  private pins = new Map<string, HTMLElement>()
  private fly: { from: THREE.Vector3; to: THREE.Vector3; fromT: THREE.Vector3; toT: THREE.Vector3; t: number; dur: number } | null = null
  private frameTimes: number[] = []
  private frameCount = 0
  private autoLevel: Level = 'high'
  private tmp = new THREE.Vector3()
  /** screen point (CSS px) of the HUD basket, for flying harvests */
  basket: (() => { x: number; y: number } | null) | null = null
  onLanded: ((o: Output) => void) | null = null
  onPick: ((p: Pick | null) => void) | null = null
  onHover: ((p: Pick | null) => void) | null = null
  fps = 60

  constructor(readonly canvas: HTMLCanvasElement, private store: TownStore) {
    this.engine = new Engine(canvas)
    const scene = this.engine.scene
    const occ = new Occupancy()
    const b = new Batcher(this.mats)
    buildGround(b, occ)
    this.plaza = buildPlaza(b, occ, this.mats, scene)
    this.districts = buildDistricts(b, occ, this.mats, scene)
    this.stations = buildStations(b, occ, scene)
    const homes = buildHomes(b, occ)
    buildStreetLamps(b, occ)
    const rail = railPath()
    buildRail(b, occ, rail, scene)
    this.islets = buildIslets(b, occ, this.mats, scene)
    buildNature(scene, occ, rail)
    const statics = new THREE.Group()
    statics.name = 'statics'
    b.build(statics)
    scene.add(statics)
    this.water = makeWater()
    scene.add(this.water.mesh)

    this.traffic = new Traffic(scene, this.mats, rail)
    const decks = Object.values(STATIONS).map(deckRect)
    this.crowd = new Crowd(scene, this.atlas, buildNav(), this.traffic, homes, decks)
    this.items = new Items(scene)
    this.items.target = () => this.basketPoint()
    this.items.onLand = (o) => this.onLanded?.(o)
    this.smoke = this.makeSmoke([...homes.map((h) => h.chimney).filter((c): c is [number, number, number] => !!c), ...this.districts.chimneys])

    this.controls = new OrbitControls(this.engine.camera, canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minDistance = 7
    this.controls.maxDistance = 330
    this.controls.minPolarAngle = 0.18
    this.controls.maxPolarAngle = 1.36
    this.controls.screenSpacePanning = false
    this.controls.zoomToCursor = true
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
    this.controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }
    this.setView(HOME_VIEW.target, HOME_VIEW.azimuth, HOME_VIEW.polar, HOME_VIEW.distance)
    this.controls.addEventListener('start', () => {
      this.fly = null
      if (this.store.state.following) this.store.setFollowing(false)
    })

    this.bindInput()
    const snap = store.state.snap
    this.applySnapshot(snap, true)
    this.unsub.push(store.subscribe(() => {
      if (store.state.snap !== this.snapSeen) this.applySnapshot(store.state.snap, false)
    }))
    this.unsub.push(store.onHarvest((outs) => {
      this.items.harvest(outs)
      for (const id of new Set(outs.map((o) => o.employee))) this.crowd.cheer(id)
    }))
    this.applyQuality(true)
  }

  /* ---------------- lifecycle ---------------- */

  /** Compile the shaders off the main path, then run. Resolves once the first frames are on screen. */
  async start(): Promise<void> {
    try {
      await this.engine.renderer.compileAsync(this.engine.scene, this.engine.camera)
    } catch {
      /* compiling on first use is fine too */
    }
    if (this.disposed) return
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop)
      const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 1 / 60
      this.last = now
      this.frame(dt)
    }
    this.raf = requestAnimationFrame(loop)
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  }

  private disposed = false

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.unsub.forEach((u) => u())
    this.unbind.forEach((u) => u())
    this.controls.dispose()
    this.atlas.dispose()
    this.engine.dispose()
  }

  resize(w: number, h: number) {
    this.engine.resize(w, h)
  }

  /* ---------------- state ---------------- */

  private applySnapshot(snap: TownSnapshot, first: boolean) {
    this.snapSeen = snap
    this.crowd.sync(snap, first)
    const holders = new Map<string, string>()
    for (const id of snap.order) {
      const v = snap.employees[id]
      if (v.role && this.stations.has(v.role.id)) holders.set(v.role.id, id)
    }
    const shelves = new Map<string, Output[]>()
    for (const [roleId, st] of this.stations) {
      const holder = holders.get(roleId) ?? null
      if (st.holder !== holder || !st.plate.text) {
        st.holder = holder
        updatePlate(st, holder ? CHARACTERS[holder]?.name.zh ?? holder : null)
      }
      shelves.set(roleId, holder ? snap.employees[holder].ready : [])
    }
    this.items.sync(this.stations, shelves)
  }

  /* ---------------- frame ---------------- */

  private frame(dt: number) {
    this.clock += dt
    const t = this.clock
    this.trackFps(dt)
    const settings = this.store.state.settings
    const now = new Date()
    const hour = settings.realTimeSky ? now.getHours() + now.getMinutes() / 60 : 16.6
    const night = this.engine.setHour(hour)
    this.mats.lit.emissiveIntensity = night * 1.25
    this.mats.lamp.emissiveIntensity = 0.25 + night * 2.6
    this.mats.signal.emissiveIntensity = 0.35 + Math.max(0, Math.sin(t * 2.2)) * 0.25 + night * 0.6

    this.moveCamera(dt)
    this.traffic.peds = [...this.crowd.walkers.values()].filter((w) => !w.actor.hidden).map((w) => ({ x: w.x, z: w.z, crossing: w.crossing }))
    this.traffic.update(t, dt, night)
    this.crowd.update(t, dt)
    this.items.update(t, dt)
    this.islets.tick(t, dt, night)
    this.water.tick(t)
    this.animateLandmarks(t, dt, night)
    this.tickSmoke(dt)

    const snap = this.store.state.snap
    const live = Date.now()
    for (const [roleId, st] of this.stations) {
      const v = st.holder ? snap.employees[st.holder] : null
      let progress: number | null = null
      if (v?.task) {
        progress = v.task.progress
        // demo tasks progress in real time between snapshots
        if (v.phase === 'working' && v.task.remainingMs > 0 && snap.source === 'demo') {
          const total = v.task.remainingMs / Math.max(0.0001, 1 - v.task.progress)
          progress = Math.min(1, v.task.progress + (live - snap.now) / total)
        }
      }
      paintStation(st, t, v ? v.status : null, progress, v?.task?.kind ?? null)
      st.ring.quaternion.copy(this.engine.camera.quaternion)
      void roleId
    }

    const sel = this.store.state.selected
    const outlined: THREE.Object3D[] = []
    const hoverId = this.hover?.kind === 'employee' ? this.hover.id : null
    for (const id of new Set([sel, hoverId])) {
      if (!id) continue
      const a = this.crowd.actor(id)
      if (a && !a.hidden) outlined.push(...a.meshes)
    }
    if (this.hover?.kind === 'output') {
      const m = this.items.tileOf(this.hover.id)
      if (m) outlined.push(m)
    }
    this.engine.setOutlined(outlined)

    const target = this.controls.target
    const dist = this.engine.camera.position.distanceTo(target)
    this.engine.aimShadow(target.x, target.z, THREE.MathUtils.clamp(dist * 0.85, 34, 175))
    this.engine.render()
    this.placePins()
  }

  private trackFps(dt: number) {
    this.frameCount += 1
    if (this.frameCount < 20) return // first frames hitch while textures upload
    this.frameTimes.push(dt)
    if (this.frameTimes.length < 45) return
    const avg = this.frameTimes.reduce((s, x) => s + x, 0) / this.frameTimes.length
    this.frameTimes = []
    this.fps = Math.round(1 / avg)
    if (this.store.state.settings.quality !== 'auto' || this.autoLevel === 'low') return
    // step down when the frame rate sags (straight to low when it crawls); never flap back up
    if (avg > 1 / 16) this.autoLevel = 'low'
    else if (avg > 1 / 32) this.autoLevel = this.autoLevel === 'high' ? 'medium' : 'low'
    else return
    this.engine.setLevel(this.autoLevel)
  }

  applyQuality(force = false) {
    const q = this.store.state.settings.quality
    const level: Level = q === 'auto' ? this.autoLevel : q
    if (force || level !== this.engine.level) this.engine.setLevel(level)
  }

  private animateLandmarks(t: number, dt: number, night: number) {
    const d = this.districts
    if (d.radar) d.radar.rotation.y += dt * 0.8
    if (d.gear) d.gear.rotation.z -= dt * 0.9
    if (d.telescope) d.telescope.rotation.y = Math.sin(t * 0.15) * 0.6 + 0.4
    if (d.beacon) (d.beacon.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.sin(t * 3) > 0.6 ? 2.2 : 0.2 + night * 0.4
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.6)
    this.plaza.halo.scale.setScalar(1 + pulse * 0.18)
    this.plaza.halo.position.y = 12.02 + Math.sin(t * 1.6) * 0.15
    this.plaza.halo.rotation.z = t * 0.4
  }

  /* ---------------- chimney smoke ---------------- */

  private makeSmoke(src: Array<[number, number, number]>): Smoke {
    const per = 4
    const n = src.length * per
    const pos = new Float32Array(n * 3)
    const age = new Float32Array(n)
    const seeds = new Float32Array(n)
    for (let i = 0; i < n; i += 1) { age[i] = (i % per) / per; seeds[i] = Math.random() }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aAge', new THREE.BufferAttribute(age, 1))
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uScale: { value: 400 } },
      vertexShader: /* glsl */ `
        attribute float aAge; uniform float uScale; varying float vA;
        void main() {
          vA = aAge;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (0.5 + aAge * 1.6) * uScale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.15, d) * (1.0 - vA) * smoothstep(0.0, 0.12, vA) * 0.55;
          gl_FragColor = vec4(vec3(0.97, 0.96, 0.94), a);
          #include <colorspace_fragment>
        }`,
    })
    const points = new THREE.Points(geo, mat)
    points.frustumCulled = false
    this.engine.scene.add(points)
    const vs = src.map((s) => new THREE.Vector3(...s))
    return { points, age, seeds, src: vs, pos }
  }

  private tickSmoke(dt: number) {
    const s = this.smoke
    const per = 4
    const ageAttr = s.points.geometry.getAttribute('aAge') as THREE.BufferAttribute
    for (let i = 0; i < s.age.length; i += 1) {
      s.age[i] += dt / 5.5
      if (s.age[i] >= 1) { s.age[i] -= 1; s.seeds[i] = Math.random() }
      const src = s.src[Math.floor(i / per)]
      const a = s.age[i]
      s.pos[i * 3] = src.x + a * 1.6 + Math.sin(a * 6 + s.seeds[i] * 6) * 0.3
      s.pos[i * 3 + 1] = src.y + a * 3.6
      s.pos[i * 3 + 2] = src.z + a * 0.8 + Math.cos(a * 5 + s.seeds[i] * 6) * 0.3
    }
    ageAttr.needsUpdate = true
    s.points.geometry.getAttribute('position').needsUpdate = true
    ;(s.points.material as THREE.ShaderMaterial).uniforms.uScale.value = this.engine.height * this.engine.renderer.getPixelRatio() * 0.9
  }

  /* ---------------- camera ---------------- */

  private setView(target: THREE.Vector3, azimuth: number, polar: number, distance: number) {
    this.controls.target.copy(target)
    this.engine.camera.position.set(
      target.x + distance * Math.sin(polar) * Math.sin(azimuth),
      target.y + distance * Math.cos(polar),
      target.z + distance * Math.sin(polar) * Math.cos(azimuth),
    )
    this.controls.update()
  }

  /** Fly the camera so it looks at `target` from `distance`, keeping roughly the current heading unless `azimuth` is given. */
  flyTo(target: THREE.Vector3, distance: number, azimuth?: number, polar = 0.95) {
    const cam = this.engine.camera
    const off = cam.position.clone().sub(this.controls.target)
    const az = azimuth ?? Math.atan2(off.x, off.z)
    const to = new THREE.Vector3(
      target.x + distance * Math.sin(polar) * Math.sin(az),
      target.y + distance * Math.cos(polar),
      target.z + distance * Math.sin(polar) * Math.cos(az),
    )
    this.fly = { from: cam.position.clone(), to, fromT: this.controls.target.clone(), toT: target.clone(), t: 0, dur: 1.1 }
  }

  resetView() {
    this.store.setFollowing(false)
    this.flyTo(HOME_VIEW.target, HOME_VIEW.distance, HOME_VIEW.azimuth, HOME_VIEW.polar)
  }

  /** Look at an employee from the front of their desk (or wherever they are), clear of the employee card. */
  focusEmployee(id: string) {
    const head = this.crowd.headOf(id)
    if (!head) return
    const v = this.store.state.snap.employees[id]
    const slot = v?.role ? STATIONS[v.role.id] : undefined
    const atDesk = slot && this.crowd.where(id) === '在工位'
    const cam = this.engine.camera
    const off = cam.position.clone().sub(this.controls.target)
    const az = atDesk ? slot.ry : Math.atan2(off.x, off.z)
    const dist = atDesk ? 11.5 : 12
    const polar = atDesk ? 1.05 : 0.95
    const target = atDesk ? new THREE.Vector3((slot.x + slot.spot[0]) / 2, 0.9, (slot.z + slot.spot[1]) / 2) : new THREE.Vector3(head.x, 0.9, head.z)
    if (this.store.state.selected === id) {
      const halfH = dist * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))
      if (this.engine.width > 760) {
        // the card covers the left: slide the view so the subject sits in the open part
        target.addScaledVector(new THREE.Vector3(Math.cos(az), 0, -Math.sin(az)), -halfH * cam.aspect * 0.28)
      } else {
        // the card covers the bottom half: lift the subject up the screen
        target.addScaledVector(new THREE.Vector3(Math.sin(az), 0, Math.cos(az)), halfH * 0.55)
      }
    }
    this.flyTo(target, dist, az, polar)
  }

  focusPoint(x: number, z: number) {
    const dist = this.engine.camera.position.distanceTo(this.controls.target)
    this.flyTo(new THREE.Vector3(x, 0, z), Math.min(dist, 120))
  }

  zoom(factor: number) {
    const cam = this.engine.camera
    const off = cam.position.clone().sub(this.controls.target)
    const len = THREE.MathUtils.clamp(off.length() * factor, this.controls.minDistance, this.controls.maxDistance)
    this.flyTo(this.controls.target.clone(), len, Math.atan2(off.x, off.z), Math.acos(off.y / off.length()))
  }

  private moveCamera(dt: number) {
    const cam = this.engine.camera
    if (this.fly) {
      const f = this.fly
      f.t += dt / f.dur
      const k = Math.min(1, f.t)
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
      cam.position.lerpVectors(f.from, f.to, e)
      this.controls.target.lerpVectors(f.fromT, f.toT, e)
      if (k >= 1) this.fly = null
    } else if (this.store.state.following && this.store.state.selected) {
      const head = this.crowd.headOf(this.store.state.selected, this.tmp)
      if (head) {
        const goal = new THREE.Vector3(head.x, 0.8, head.z)
        const delta = goal.sub(this.controls.target).multiplyScalar(Math.min(1, dt * 3))
        this.controls.target.add(delta)
        cam.position.add(delta)
      }
    }
    // keyboard: WASD / arrows pan, Q/E turn, +/- zoom (by physical key, so input methods do not get in the way)
    if (this.keys.size) {
      const off = cam.position.clone().sub(this.controls.target)
      const dist = off.length()
      const fwd = new THREE.Vector3(-off.x, 0, -off.z).normalize()
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x)
      const move = new THREE.Vector3()
      const k = this.keys
      if (k.has('KeyW') || k.has('ArrowUp')) move.add(fwd)
      if (k.has('KeyS') || k.has('ArrowDown')) move.sub(fwd)
      if (k.has('KeyD') || k.has('ArrowRight')) move.add(right)
      if (k.has('KeyA') || k.has('ArrowLeft')) move.sub(right)
      if (move.lengthSq()) {
        move.normalize().multiplyScalar(dt * Math.max(10, dist * 0.9))
        this.controls.target.add(move)
        cam.position.add(move)
        this.fly = null
        if (this.store.state.following) this.store.setFollowing(false)
      }
      const turn = (k.has('KeyE') ? 1 : 0) - (k.has('KeyQ') ? 1 : 0)
      if (turn) {
        off.applyAxisAngle(new THREE.Vector3(0, 1, 0), turn * dt * 1.2)
        cam.position.copy(this.controls.target).add(off)
      }
      const zoom = (k.has('Minus') || k.has('NumpadSubtract') ? 1 : 0) - (k.has('Equal') || k.has('NumpadAdd') ? 1 : 0)
      if (zoom) {
        const len = THREE.MathUtils.clamp(dist * (1 + zoom * dt * 1.4), this.controls.minDistance, this.controls.maxDistance)
        cam.position.copy(this.controls.target).add(off.setLength(len))
      }
    }
    // stay over the islands
    const t = this.controls.target
    const cx = THREE.MathUtils.clamp(t.x, -MAP_LIMIT, MAP_LIMIT), cz = THREE.MathUtils.clamp(t.z, -MAP_LIMIT, MAP_LIMIT)
    if (cx !== t.x || cz !== t.z) {
      cam.position.x += cx - t.x
      cam.position.z += cz - t.z
      t.x = cx
      t.z = cz
    }
    this.controls.update()
  }

  /** what the minimap draws: the camera's ground point and heading */
  view(): { x: number; z: number; heading: number; span: number } {
    const cam = this.engine.camera
    const t = this.controls.target
    return { x: t.x, z: t.z, heading: Math.atan2(t.x - cam.position.x, t.z - cam.position.z), span: cam.position.distanceTo(t) }
  }

  /** everyone's ground position, for the minimap */
  positions(): Array<{ id: string; x: number; z: number; home: boolean }> {
    return [...this.crowd.walkers.values()].map((w) => ({ id: w.id, x: w.x, z: w.z, home: w.actor.hidden }))
  }

  where(id: string): string {
    return this.crowd.where(id)
  }

  /* ---------------- pins (HTML labels that follow people) ---------------- */

  setPin(id: string, el: HTMLElement | null) {
    if (el) this.pins.set(id, el)
    else this.pins.delete(id)
  }

  private placePins() {
    const cam = this.engine.camera
    const w = this.engine.width, h = this.engine.height
    for (const [key, el] of this.pins) {
      const head = this.anchor(key, this.tmp)
      if (!head) { el.style.visibility = 'hidden'; continue }
      const dist = head.distanceTo(cam.position)
      head.project(cam)
      const x = (head.x * 0.5 + 0.5) * w, y = (-head.y * 0.5 + 0.5) * h
      const on = head.z < 1 && x > -60 && x < w + 60 && y > -60 && y < h + 60
      el.style.visibility = on ? 'visible' : 'hidden'
      if (!on) continue
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      el.style.zIndex = String(10000 - Math.round(dist))
      const near = dist < 42 ? '1' : '0'
      if (el.dataset.near !== near) el.dataset.near = near
      const far = dist > 95 ? '1' : '0'
      if (el.dataset.far !== far) el.dataset.far = far
    }
  }

  /** a pin key is an employee id (over their head) or `shelf:<role>` (over that desk's shelf) */
  private anchor(key: string, out: THREE.Vector3): THREE.Vector3 | null {
    if (key.startsWith('shelf:')) {
      const st = this.stations.get(key.slice(6))
      if (!st) return null
      return out.copy(st.slots[2]).setY(st.slots[2].y + 1.85)
    }
    const head = this.crowd.headOf(key, out)
    if (head) head.y += 0.35
    return head
  }

  /** world → screen (CSS px) for one pin key, or null when off screen */
  screenOf(key: string): { x: number; y: number } | null {
    const p = this.anchor(key, new THREE.Vector3())
    if (!p) return null
    p.project(this.engine.camera)
    if (p.z > 1) return null
    const r = this.canvas.getBoundingClientRect()
    return { x: r.left + (p.x * 0.5 + 0.5) * r.width, y: r.top + (-p.y * 0.5 + 0.5) * r.height }
  }

  private basketPoint(): THREE.Vector3 | null {
    const p = this.basket?.()
    if (!p) return null
    const rect = this.canvas.getBoundingClientRect()
    const ndc = new THREE.Vector2(((p.x - rect.left) / rect.width) * 2 - 1, -((p.y - rect.top) / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(ndc, this.engine.camera)
    return this.raycaster.ray.at(7, new THREE.Vector3())
  }

  /* ---------------- pointer and keys ---------------- */

  private unbind: Array<() => void> = []

  private bindInput() {
    const c = this.canvas
    const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Window, ev: K, fn: (e: HTMLElementEventMap[K]) => void) => {
      el.addEventListener(ev, fn as EventListener)
      this.unbind.push(() => el.removeEventListener(ev, fn as EventListener))
    }
    on(c, 'pointermove', (e) => {
      const r = c.getBoundingClientRect()
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      this.pointerIn = true
      if (!this.down) this.updateHover()
    })
    on(c, 'pointerleave', () => {
      this.pointerIn = false
      this.setHover(null)
    })
    on(c, 'pointerdown', (e) => {
      this.down = { x: e.clientX, y: e.clientY, t: performance.now() }
    })
    on(c, 'pointerup', (e) => {
      const d = this.down
      this.down = null
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 600) return
      if (e.button !== 0) return
      const r = c.getBoundingClientRect()
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      this.onPick?.(this.pick())
    })
    on(c, 'dblclick', () => {
      const p = this.pick()
      if (p?.kind === 'employee') {
        this.store.select(p.id, { follow: true })
        this.focusEmployee(p.id)
      }
    })
    const editable = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
    on(window, 'keydown', (e) => {
      if (editable(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      const code = (e as KeyboardEvent).code
      if (/^(Key[WASDQE]|Arrow(Up|Down|Left|Right)|Equal|Minus|NumpadAdd|NumpadSubtract)$/.test(code)) {
        this.keys.add(code)
        if (code.startsWith('Arrow')) e.preventDefault()
      }
    })
    on(window, 'keyup', (e) => {
      this.keys.delete((e as KeyboardEvent).code)
    })
    on(window, 'blur', () => this.keys.clear())
  }

  private pick(): Pick | null {
    this.raycaster.setFromCamera(this.pointer, this.engine.camera)
    const tiles = this.raycaster.intersectObjects(this.items.pickables(), false)
    if (tiles.length) {
      const id = tiles[0].object.userData.output as string
      const o = this.store.state.snap.ready.find((x) => x.id === id)
      if (o) return { kind: 'output', id, employee: o.employee }
    }
    const people = this.raycaster.intersectObjects(this.crowd.pickables(), false)
    const desks = this.raycaster.intersectObjects([...this.stations.values()].map((s) => s.hit), false)
    if (people.length && (!desks.length || people[0].distance <= desks[0].distance + 1.5)) return { kind: 'employee', id: people[0].object.userData.actor as string }
    if (desks.length) {
      const role = desks[0].object.userData.station as string
      return { kind: 'station', role, holder: this.stations.get(role)?.holder ?? null }
    }
    return null
  }

  private updateHover() {
    if (!this.pointerIn) return
    this.setHover(this.pick())
  }

  private setHover(p: Pick | null) {
    const same = JSON.stringify(p) === JSON.stringify(this.hover)
    if (same) return
    this.hover = p
    this.canvas.style.cursor = p ? 'pointer' : ''
    this.onHover?.(p)
  }
}
