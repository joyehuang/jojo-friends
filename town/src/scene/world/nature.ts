// Trees, bushes, flowers, grass tufts and beach rocks — all instanced.
import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { ISLAND, ISLET, ISLETS } from '../layout'
import { makeRng } from '../../work/rng'
import { type Occupancy, inRounded, onLand } from './ground'
import type { Rail } from './buildings'

type Kind = 'round' | 'blossom' | 'pine' | 'bush' | 'tuft' | 'flower' | 'rock'

/** An indexed copy with only positions (so mergeVertices can weld the seams), smooth normals added back later. */
function welded(g: THREE.BufferGeometry): THREE.BufferGeometry {
  for (const name of Object.keys(g.attributes)) if (name !== 'position') g.deleteAttribute(name)
  const out = mergeVertices(g, 1e-4)
  g.dispose()
  return out
}

/** Organic blob: an icosphere with deterministic noise, coloured darker at the bottom, smooth-shaded. */
function blob(r: number, seed: number, bottom: THREE.Color, top: THREE.Color, squash = 1): THREE.BufferGeometry {
  const g = welded(new THREE.IcosahedronGeometry(r, 2))
  const pos = g.getAttribute('position')
  const rand = makeRng(seed)
  const bumps = Array.from({ length: 6 }, () => new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize())
  const v = new THREE.Vector3()
  const colors = new Float32Array(pos.count * 3)
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i)
    const n = v.clone().normalize()
    let d = 1
    for (const bp of bumps) d += Math.max(0, n.dot(bp)) ** 3 * 0.12
    v.multiplyScalar(d)
    v.y *= squash
    pos.setXYZ(i, v.x, v.y, v.z)
    const t = THREE.MathUtils.clamp((v.y / (r * squash) + 1) / 2, 0, 1)
    c.copy(bottom).lerp(top, t)
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.computeVertexNormals()
  return g
}

/** Indexed geometry painted one colour (normals kept, UVs dropped so everything merges). */
function painted(g: THREE.BufferGeometry, color: string): THREE.BufferGeometry {
  const out = g.index ? g : welded(g)
  if (!out.getAttribute('normal')) out.computeVertexNormals()
  const c = new THREE.Color(color)
  const n = out.getAttribute('position').count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i += 1) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b }
  out.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  if (out.getAttribute('uv')) out.deleteAttribute('uv')
  return out
}

function treeGeometry(kind: Kind): THREE.BufferGeometry {
  const white = new THREE.Color('#ffffff')
  const shade = new THREE.Color('#9fb0a8')
  if (kind === 'round' || kind === 'blossom') {
    const trunk = painted(new THREE.CylinderGeometry(0.17, 0.26, 2.1, 8, 1, true).translate(0, 1.05, 0), '#b39468')
    const a = blob(1.35, 1, shade, white).translate(0, 2.75, 0)
    const b2 = blob(0.95, 2, shade, white).translate(0.75, 2.35, 0.35)
    const c = blob(0.9, 3, shade, white).translate(-0.55, 3.25, -0.35)
    return mergeGeometries([trunk, a, b2, c])!
  }
  if (kind === 'pine') {
    const trunk = painted(new THREE.CylinderGeometry(0.15, 0.22, 1.2, 8, 1, true).translate(0, 0.6, 0), '#a88a5c')
    const tiers = [0, 1, 2].map((i) => {
      const g = new THREE.ConeGeometry(1.35 - i * 0.32, 1.7 - i * 0.2, 12)
      g.translate(0, 1.6 + i * 1.0, 0)
      g.deleteAttribute('uv')
      const pos = g.getAttribute('position')
      const col = new Float32Array(pos.count * 3)
      const c = new THREE.Color()
      for (let k = 0; k < pos.count; k += 1) {
        const t = THREE.MathUtils.clamp((pos.getY(k) - (0.75 + i)) / 2, 0, 1)
        c.copy(shade).lerp(white, t)
        col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3))
      return g
    })
    return mergeGeometries([trunk, ...tiers])!
  }
  if (kind === 'bush') {
    const a = blob(0.7, 5, shade, white, 0.8).translate(0, 0.45, 0)
    const b2 = blob(0.5, 6, shade, white, 0.8).translate(0.55, 0.35, 0.2)
    const c = blob(0.45, 7, shade, white, 0.8).translate(-0.45, 0.32, -0.15)
    return mergeGeometries([a, b2, c])!
  }
  if (kind === 'tuft') {
    const blades = [0, 1, 2].map((i) => {
      const g = new THREE.ConeGeometry(0.06, 0.42 - i * 0.05, 3, 1, true)
      g.rotateZ((i - 1) * 0.3)
      g.translate((i - 1) * 0.07, 0.2, (i % 2) * 0.05)
      return painted(g, '#ffffff')
    })
    return mergeGeometries(blades)!
  }
  if (kind === 'flower') {
    const stem = painted(new THREE.CylinderGeometry(0.018, 0.018, 0.32, 3, 1, true).translate(0, 0.16, 0), '#5fc4a6')
    const head = painted(new THREE.IcosahedronGeometry(0.1, 0).scale(1, 0.7, 1).translate(0, 0.34, 0), '#ffffff')
    return mergeGeometries([stem, head])!
  }
  const rock = welded(new THREE.DodecahedronGeometry(0.6, 0))
  rock.scale(1, 0.55, 0.8)
  rock.computeVertexNormals()
  return painted(rock, '#ffffff')
}

const PALETTE: Record<Kind, string[]> = {
  round: ['#8fd6bb', '#6fcaa8', '#a6dfc8', '#7cccb0', '#b8e6d3'],
  blossom: ['#ffc7d1', '#f7b6c8', '#ffd9a8', '#ffe1ec'],
  pine: ['#4fb394', '#5fc4a6', '#3ea383'],
  bush: ['#8fd6bb', '#7cccb0', '#b4b2d6', '#a6dfc8'],
  tuft: ['#9fdcc2', '#8fd6bb', '#b0e4cd'],
  flower: ['#fe6a4a', '#ffb3a1', '#ffd27a', '#b4b2d6', '#ffffff', '#ff8fb1'],
  rock: ['#e8dcc6', '#d9cdb6', '#f0e6d4'],
}

interface Item { kind: Kind; x: number; y: number; z: number; s: number; ry: number; color: string }

export function buildNature(scene: THREE.Object3D, occ: Occupancy, rail: Rail) {
  const rand = makeRng(777)
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)]
  const items: Item[] = []
  const nearRail = (x: number, z: number) => {
    for (const p of rail.pts) if (Math.abs(p[0] - x) < 3 && Math.abs(p[1] - z) < 3) return true
    return false
  }
  const groundY = (x: number, z: number) => (Math.abs(x) < 48.5 && Math.abs(z) < 48.5 ? 0.17 : 0)
  const tree = (x: number, z: number, s: number) => {
    const kind: Kind = rand() < 0.26 ? 'pine' : rand() < 0.12 ? 'blossom' : 'round'
    items.push({ kind, x, y: groundY(x, z), z, s, ry: rand() * Math.PI * 2, color: pick(PALETTE[kind]) })
    occ.circle(x, z, 1.1 * s)
  }

  // a tree in each home cell, between the four cottages
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) if (occ.free(sx * 32, sz * 32, 0.9)) tree(sx * 32, sz * 32, 0.85)

  // scatter on the main island and the islets wherever there is room
  const scatter = (count: number, tries: number, inside: (x: number, z: number) => boolean, area: [number, number, number, number]) => {
    let n = 0
    for (let k = 0; k < tries && n < count; k += 1) {
      const x = area[0] + rand() * (area[2] - area[0]), z = area[1] + rand() * (area[3] - area[1])
      const s = 0.75 + rand() * 0.55
      if (!inside(x, z) || nearRail(x, z) || !occ.free(x, z, 1.25 * s)) continue
      if (rand() < 0.22) {
        items.push({ kind: 'bush', x, y: groundY(x, z), z, s, ry: rand() * 6, color: pick(PALETTE.bush) })
        occ.circle(x, z, 0.9 * s)
      } else tree(x, z, s)
      n += 1
    }
  }
  scatter(260, 9000, (x, z) => inRounded(x, z, 0, 0, ISLAND.half, ISLAND.corner, 2.5), [-ISLAND.half, -ISLAND.half, ISLAND.half, ISLAND.half])
  for (const s of ISLETS) scatter(42, 1600, (x, z) => inRounded(x, z, s.x, s.z, ISLET.half, ISLET.corner, 2.5), [s.x - ISLET.half, s.z - ISLET.half, s.x + ISLET.half, s.z + ISLET.half])

  // grass tufts and wild flowers
  for (let k = 0; k < 6500; k += 1) {
    const x = (rand() - 0.5) * 320, z = (rand() - 0.5) * 320
    if (!onLand(x, z, 1.2) || !occ.free(x, z, 0.3)) continue
    if (rand() < 0.75) items.push({ kind: 'tuft', x, y: groundY(x, z), z, s: 0.8 + rand() * 0.6, ry: rand() * 6, color: pick(PALETTE.tuft) })
    else items.push({ kind: 'flower', x, y: groundY(x, z), z, s: 0.8 + rand() * 0.5, ry: rand() * 6, color: pick(PALETTE.flower) })
  }
  // rocks along the beaches
  const shores = [{ x: 0, z: 0, half: ISLAND.half }, ...ISLETS.map((s) => ({ x: s.x, z: s.z, half: ISLET.half }))]
  for (const sh of shores) {
    for (let k = 0; k < (sh.half > 40 ? 60 : 22); k += 1) {
      const a = rand() * Math.PI * 2
      const r = sh.half + 2.2 + rand() * 2.6
      const x = sh.x + Math.cos(a) * r * 1.05, z = sh.z + Math.sin(a) * r * 1.05
      if (Math.abs(x) < 4 || Math.abs(z) < 4) continue
      items.push({ kind: 'rock', x, y: -0.35, z, s: 0.6 + rand() * 0.9, ry: rand() * 6, color: pick(PALETTE.rock) })
    }
  }

  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 })
  const kinds: Kind[] = ['round', 'blossom', 'pine', 'bush', 'tuft', 'flower', 'rock']
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), col = new THREE.Color()
  for (const kind of kinds) {
    const list = items.filter((i) => i.kind === kind)
    if (!list.length) continue
    const mesh = new THREE.InstancedMesh(treeGeometry(kind), mat, list.length)
    list.forEach((it, i) => {
      e.set(0, it.ry, 0)
      q.setFromEuler(e)
      m4.compose(new THREE.Vector3(it.x, it.y, it.z), q, new THREE.Vector3(it.s, it.s, it.s))
      mesh.setMatrixAt(i, m4)
      mesh.setColorAt(i, col.set(it.color))
    })
    mesh.castShadow = kind !== 'tuft' && kind !== 'flower'
    mesh.receiveShadow = true
    mesh.computeBoundingSphere()
    scene.add(mesh)
  }
}
