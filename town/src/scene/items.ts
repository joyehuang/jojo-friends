// Finished work as things you can pick: each output is a chunky tile with its
// kind's picture, sitting on its maker's shelf. Ripe tiles bob and glow; a
// harvested tile jumps off the shelf and flies into the basket in the HUD.
import * as THREE from 'three'
import { OUTPUT_KINDS } from '../work/roles'
import type { Output, OutputKind } from '../work/types'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { drawKindIcon } from './icons'
import type { StationView } from './stations'

const TILE = 0.42

let tileGeo: THREE.BufferGeometry | null = null
function tileGeometry(): THREE.BufferGeometry {
  if (!tileGeo) {
    tileGeo = new RoundedBoxGeometry(TILE, TILE, 0.11, 3, 0.05)
    addBoxGroups(tileGeo)
  }
  return tileGeo
}

const faceTex = new Map<OutputKind, THREE.CanvasTexture>()
function tileFace(kind: OutputKind): THREE.CanvasTexture {
  let t = faceTex.get(kind)
  if (t) return t
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = '#fffaf0'
  g.beginPath()
  g.roundRect(10, 10, 236, 236, 46)
  g.fill()
  g.lineWidth = 14
  g.strokeStyle = OUTPUT_KINDS[kind].accent
  g.stroke()
  drawKindIcon(g, kind, 128, 128, 170)
  t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  faceTex.set(kind, t)
  return t
}

let glowTex: THREE.Texture | null = null
function glow(): THREE.Texture {
  if (glowTex) return glowTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 62)
  grd.addColorStop(0, 'rgba(255,236,190,0.95)')
  grd.addColorStop(0.45, 'rgba(255,200,140,0.35)')
  grd.addColorStop(1, 'rgba(255,190,130,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  glowTex = new THREE.CanvasTexture(c)
  glowTex.colorSpace = THREE.SRGBColorSpace
  return glowTex
}

interface Tile {
  output: Output
  group: THREE.Group
  body: THREE.Mesh
  halo: THREE.Sprite
  /** shelf slot it sits in */
  home: THREE.Vector3
  facing: number
  born: number
  seed: number
}

interface Fly {
  tile: Tile
  t: number
  from: THREE.Vector3
  delay: number
  done: boolean
}

export class Items {
  readonly group = new THREE.Group()
  private tiles = new Map<string, Tile>()
  private flying: Fly[] = []
  private bodyMats = new Map<OutputKind, THREE.Material[]>()
  private clock = 0
  /** world point the flying tiles head for (the HUD basket), or null */
  target: (() => THREE.Vector3 | null) | null = null
  onLand: ((o: Output) => void) | null = null

  constructor(scene: THREE.Object3D) {
    scene.add(this.group)
  }

  private mats(kind: OutputKind): THREE.Material[] {
    let m = this.bodyMats.get(kind)
    if (!m) {
      const side = new THREE.MeshStandardMaterial({ color: OUTPUT_KINDS[kind].accent, roughness: 0.45 })
      const face = new THREE.MeshStandardMaterial({ map: tileFace(kind), roughness: 0.55 })
      // two groups (see addBoxGroups): the rim, then both picture faces
      m = [side, face]
      this.bodyMats.set(kind, m)
    }
    return m
  }

  private make(o: Output, home: THREE.Vector3, facing: number): Tile {
    const group = new THREE.Group()
    const body = new THREE.Mesh(tileGeometry(), this.mats(o.kind))
    body.castShadow = true
    body.position.y = TILE / 2
    body.userData.output = o.id
    group.add(body)
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }))
    halo.scale.setScalar(0.95)
    halo.position.y = TILE / 2
    group.add(halo)
    group.position.copy(home)
    group.rotation.y = facing
    group.scale.setScalar(0.001)
    this.group.add(group)
    return { output: o, group, body, halo, home: home.clone(), facing, born: this.clock, seed: Math.random() * 10 }
  }

  /** Make the shelves show exactly these outputs (by station, oldest first). */
  sync(stations: Map<string, StationView>, shelves: Map<string, Output[]>) {
    const keep = new Set<string>()
    for (const [roleId, outs] of shelves) {
      const st = stations.get(roleId)
      if (!st) continue
      outs.slice(0, st.slots.length).forEach((o, i) => {
        keep.add(o.id)
        const tile = this.tiles.get(o.id)
        if (!tile) this.tiles.set(o.id, this.make(o, st.slots[i], st.facing))
        else if (!tile.home.equals(st.slots[i])) tile.home.copy(st.slots[i])
      })
    }
    for (const [id, tile] of this.tiles) {
      if (keep.has(id)) continue
      // gone from the shelf without a harvest animation (e.g. collected elsewhere)
      this.group.remove(tile.group)
      this.tiles.delete(id)
    }
  }

  /** Send these outputs flying to the basket. */
  harvest(outputs: Output[]) {
    outputs.forEach((o, i) => {
      const tile = this.tiles.get(o.id)
      if (!tile) { this.onLand?.(o); return }
      this.tiles.delete(o.id)
      this.flying.push({ tile, t: 0, from: tile.group.position.clone(), delay: i * 0.09, done: false })
    })
  }

  pickables(): THREE.Object3D[] {
    return [...this.tiles.values()].map((t) => t.body)
  }

  tileOf(outputId: string): THREE.Object3D | null {
    return this.tiles.get(outputId)?.body ?? null
  }

  update(t: number, dt: number) {
    this.clock += dt
    for (const tile of this.tiles.values()) {
      const age = this.clock - tile.born
      // pop onto the shelf with a little overshoot, then bob and glow
      const k = Math.min(1, age / 0.5)
      const s = k < 1 ? 1 - Math.pow(1 - k, 3) + Math.sin(k * Math.PI) * 0.25 : 1
      tile.group.scale.setScalar(Math.max(0.001, s))
      tile.group.position.set(tile.home.x, tile.home.y + Math.sin(t * 2.2 + tile.seed) * 0.025, tile.home.z)
      tile.group.rotation.y = tile.facing + Math.sin(t * 1.3 + tile.seed) * 0.22
      tile.halo.material.opacity = 0.55 + Math.sin(t * 3 + tile.seed) * 0.25
    }
    const target = this.target?.() ?? null
    for (const f of this.flying) {
      if (f.delay > 0) { f.delay -= dt; continue }
      f.t += dt / 0.95
      const k = Math.min(1, f.t)
      const g = f.tile.group
      const end = target ?? f.from.clone().add(new THREE.Vector3(0, 6, 0))
      // a hop up off the shelf, then a swoop into the basket
      const ctrl = f.from.clone().add(new THREE.Vector3(0, 3.2, 0))
      const e = k * k * (3 - 2 * k)
      const a = f.from.clone().lerp(ctrl, e)
      const bq = ctrl.clone().lerp(end, e)
      g.position.copy(a.lerp(bq, e))
      const pop = k < 0.25 ? 1 + (k / 0.25) * 0.5 : 1.5 - (k - 0.25) * 1.6
      g.scale.setScalar(Math.max(0.05, pop))
      g.rotation.y += dt * 9
      f.tile.halo.material.opacity = 0.9 * (1 - k)
      if (k >= 1) {
        f.done = true
        this.group.remove(g)
        this.onLand?.(f.tile.output)
      }
    }
    if (this.flying.some((f) => f.done)) this.flying = this.flying.filter((f) => !f.done)
  }
}

/** RoundedBoxGeometry has no material groups: sort its faces by normal into a rim group and a picture-face group. */
function addBoxGroups(g: THREE.BufferGeometry) {
  const src = g.index ? g.toNonIndexed() : g
  const pos = src.getAttribute('position'), nor = src.getAttribute('normal'), uv = src.getAttribute('uv')
  const buckets: number[][] = [[], [], [], [], [], []]
  const n = new THREE.Vector3()
  for (let tri = 0; tri < pos.count / 3; tri += 1) {
    n.set(0, 0, 0)
    for (let k = 0; k < 3; k += 1) n.x += nor.getX(tri * 3 + k), n.y += nor.getY(tri * 3 + k), n.z += nor.getZ(tri * 3 + k)
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z)
    const side = ax >= ay && ax >= az ? (n.x > 0 ? 0 : 1) : ay >= az ? (n.y > 0 ? 2 : 3) : n.z > 0 ? 4 : 5
    buckets[side].push(tri)
  }
  const P: number[] = [], N: number[] = [], U: number[] = []
  g.clearGroups()
  buckets.forEach((tris, side) => {
    for (const tri of tris) for (let k = 0; k < 3; k += 1) {
      const i = tri * 3 + k
      P.push(pos.getX(i), pos.getY(i), pos.getZ(i))
      N.push(nor.getX(i), nor.getY(i), nor.getZ(i))
      if (side >= 4) {
        // planar UVs on the big faces so the picture is not stretched round the bevel
        const x = pos.getX(i) / TILE + 0.5, y = pos.getY(i) / TILE + 0.5
        U.push(side === 4 ? x : 1 - x, y)
      } else U.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0)
    }
  })
  // one draw for the rim (the four sides), one for the two picture faces
  const rim = (buckets[0].length + buckets[1].length + buckets[2].length + buckets[3].length) * 3
  g.addGroup(0, rim, 0)
  g.addGroup(rim, (buckets[4].length + buckets[5].length) * 3, 1)
  g.setIndex(null)
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2))
}
