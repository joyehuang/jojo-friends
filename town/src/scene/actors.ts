// The 3D employees. Each body is the character's exact outline from the
// library, extruded into a chunky block; the face plate is a raised layer on
// the front, and both carry the character's real art for the current emotion
// (see faces.ts). The signal dot is a puck through the body that glows with
// the status, with the working gauge turning round it.
import * as THREE from 'three'
import { CHARACTERS, type Character, type EmotionId, type StatusId } from '../../../src/library'
import { FACE_VIEWBOX, type FaceAtlas } from './faces'
import { bubbleTexture, type BubbleKind } from './icons'

type P = [number, number]

/** metres per shared-canvas unit: Jojo's 700-unit shell stands 1.5 m tall */
export const K = 1.5 / 700
/** body depth, metres: chunky, about half their height */
export const DEPTH = 0.78
const BEVEL = 0.06
const LIP = 0.045

/* ------------------------------------------------------------------ */
/* outline helpers                                                      */
/* ------------------------------------------------------------------ */

function rotatePoly(poly: readonly (readonly [number, number])[], rot: Character['faceRotate']): P[] {
  if (!rot) return poly.map((p) => [p[0], p[1]])
  const a = (rot.deg * Math.PI) / 180
  const c = Math.cos(a), s = Math.sin(a)
  return poly.map(([x, y]) => [rot.cx + (x - rot.cx) * c - (y - rot.cy) * s, rot.cy + (x - rot.cx) * s + (y - rot.cy) * c])
}

function hull(pts: P[]): P[] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: P[] = []
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop()
    lower.push(q)
  }
  const upper: P[] = []
  for (let i = p.length - 1; i >= 0; i -= 1) {
    const q = p[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop()
    upper.push(q)
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1))
}

function area(poly: P[]) {
  let s = 0
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    s += a[0] * b[1] - b[0] * a[1]
  }
  return s / 2
}

/** Sutherland–Hodgman: `subject` clipped by the convex polygon `clip`. */
function clipConvex(subject: P[], clip: P[]): P[] {
  const sign = Math.sign(area(clip)) || 1
  let out = subject
  for (let i = 0; i < clip.length && out.length; i += 1) {
    const a = clip[i], b = clip[(i + 1) % clip.length]
    const inside = (p: P) => ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) * sign >= -1e-9
    const cut = (p: P, q: P): P => {
      const dx = q[0] - p[0], dy = q[1] - p[1]
      const ex = b[0] - a[0], ey = b[1] - a[1]
      const den = dx * ey - dy * ex
      if (Math.abs(den) < 1e-12) return q
      const t = ((a[0] - p[0]) * ey - (a[1] - p[1]) * ex) / den
      return [p[0] + dx * t, p[1] + dy * t]
    }
    const input = out
    out = []
    for (let j = 0; j < input.length; j += 1) {
      const p = input[j], q = input[(j + 1) % input.length]
      const pi = inside(p), qi = inside(q)
      if (pi && qi) out.push(q)
      else if (pi && !qi) out.push(cut(p, q))
      else if (!pi && qi) { out.push(cut(p, q)); out.push(q) }
    }
  }
  return out
}

/* ------------------------------------------------------------------ */
/* body geometry                                                        */
/* ------------------------------------------------------------------ */

interface BodyParts {
  shell: THREE.BufferGeometry
  shellFront: THREE.BufferGeometry
  plate: THREE.BufferGeometry
  plateFront: THREE.BufferGeometry
  /** canvas → local transform pieces */
  ox: number
  oy: number
  height: number
  width: number
  dot: { x: number; y: number; r: number }
}

const partsCache = new Map<string, BodyParts>()

export function bodyParts(c: Character): BodyParts {
  const hit = partsCache.get(c.id)
  if (hit) return hit
  const facePoly = rotatePoly(c.face.poly, c.faceRotate)
  const faceBottom = Math.max(...facePoly.map((p) => p[1]))
  const faceTop = Math.min(...facePoly.map((p) => p[1]))
  // stand on the lowest point of what you can see
  const oy = c.faceClip ? c.shell.box.y1 : Math.max(c.shell.box.y1, faceBottom)
  const top = c.faceClip ? c.shell.box.y0 : Math.min(c.shell.box.y0, faceTop)
  const ox = c.pivot.x
  const toLocal = (p: readonly [number, number]) => new THREE.Vector2((p[0] - ox) * K, (oy - p[1]) * K)
  const shape = (poly: readonly (readonly [number, number])[]) => new THREE.Shape(poly.map(toLocal))
  const uvFromPosition = (g: THREE.BufferGeometry) => {
    const pos = g.getAttribute('position')
    const uv = new Float32Array(pos.count * 2)
    for (let i = 0; i < pos.count; i += 1) {
      const cx = pos.getX(i) / K + ox, cy = oy - pos.getY(i) / K
      uv[i * 2] = (cx - FACE_VIEWBOX.x) / FACE_VIEWBOX.w
      uv[i * 2 + 1] = 1 - (cy - FACE_VIEWBOX.y) / FACE_VIEWBOX.h
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  }

  const shellShape = shape(c.shell.poly)
  const inner = DEPTH - BEVEL * 2
  const shell = new THREE.ExtrudeGeometry(shellShape, { depth: inner, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL * 0.8, bevelSegments: 3, curveSegments: 4 })
  shell.translate(0, 0, -inner / 2)
  shell.computeVertexNormals()
  const shellFront = new THREE.ShapeGeometry(shellShape)
  shellFront.translate(0, 0, DEPTH / 2 + 0.002)
  uvFromPosition(shellFront)

  let plate: THREE.BufferGeometry
  let platePoly: P[]
  if (c.faceClip) {
    // the plate is the face clipped to the shell (as the art clips it)
    platePoly = clipConvex(facePoly, hull(c.shell.poly.map((p) => [p[0], p[1]] as P)))
    plate = new THREE.ExtrudeGeometry(shape(platePoly), { depth: LIP + 0.012, bevelEnabled: false })
    plate.translate(0, 0, DEPTH / 2 - 0.012)
  } else {
    // the face is part of the silhouette: give it the body's full depth
    platePoly = facePoly
    plate = new THREE.ExtrudeGeometry(shape(platePoly), { depth: inner + LIP - 0.02, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL * 0.8, bevelSegments: 3 })
    plate.translate(0, 0, -inner / 2 + 0.02)
  }
  plate.computeVertexNormals()
  const plateFront = new THREE.ShapeGeometry(shape(platePoly))
  plateFront.translate(0, 0, DEPTH / 2 + LIP + 0.002)
  uvFromPosition(plateFront)

  const parts: BodyParts = {
    shell, shellFront, plate, plateFront, ox, oy,
    height: (oy - top) * K,
    width: (c.shell.box.x1 - c.shell.box.x0) * K,
    dot: { x: (c.dot.cx - ox) * K, y: (oy - c.dot.cy) * K, r: c.dot.r * K },
  }
  partsCache.set(c.id, parts)
  return parts
}

/* ------------------------------------------------------------------ */
/* the actor                                                            */
/* ------------------------------------------------------------------ */

/** What the body is doing; the crowd sets it, the actor animates it. */
export type Motion = 'stand' | 'walk' | 'work' | 'ask' | 'error' | 'proud' | 'rest' | 'chat' | 'cheer' | 'sleep'

const STATUS_GLOW: Record<StatusId, number> = { idle: 0.25, working: 0.55, 'needs-input': 0.7, success: 0.6, error: 0.8, offline: 0 }

export class Actor {
  readonly root = new THREE.Group()
  readonly body = new THREE.Group()
  readonly meshes: THREE.Mesh[] = []
  readonly char: Character
  readonly height: number
  readonly width: number
  private front: THREE.MeshStandardMaterial
  private plateFrontMat: THREE.MeshStandardMaterial
  private dotMat: THREE.MeshStandardMaterial
  private shellMat: THREE.MeshStandardMaterial
  private gauge: THREE.Mesh
  private bubble: THREE.Sprite
  private bubbleKind: BubbleKind | null = null
  private bubbleT = 0
  private faceTex: THREE.Texture | null = null
  private wantFace = ''
  private status: StatusId = 'idle'
  private motion: Motion = 'stand'
  private walkPhase = Math.random() * 10
  private cheerT = 0
  private shakeT = 0
  private seed = Math.random() * 100
  private blend = { hop: 0, lean: 0, tilt: 0, squash: 0 }
  /** 0..1 fade for going in and out of doors */
  private shown = 1
  private wantShown = 1
  speed = 0

  constructor(readonly id: string, private atlas: FaceAtlas) {
    const c = CHARACTERS[id]
    this.char = c
    const parts = bodyParts(c)
    this.height = parts.height
    this.width = parts.width
    this.shellMat = new THREE.MeshStandardMaterial({ color: c.palette.shell, roughness: 0.42, metalness: 0 })
    const faceSide = new THREE.MeshStandardMaterial({ color: c.palette.face, roughness: 0.45 })
    this.front = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.48, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })
    this.plateFrontMat = this.front
    this.dotMat = new THREE.MeshStandardMaterial({ color: c.palette.dot, emissive: c.palette.dot, emissiveIntensity: 0.3, roughness: 0.3 })
    const add = (g: THREE.BufferGeometry, m: THREE.Material, shadow = true) => {
      const mesh = new THREE.Mesh(g, m)
      mesh.castShadow = shadow
      mesh.receiveShadow = true
      mesh.userData.actor = id
      this.body.add(mesh)
      this.meshes.push(mesh)
      return mesh
    }
    add(parts.shell, this.shellMat)
    add(parts.shellFront, this.front, false)
    add(parts.plate, faceSide)
    add(parts.plateFront, this.plateFrontMat, false)
    const puck = new THREE.CylinderGeometry(parts.dot.r, parts.dot.r, DEPTH + 0.07, 32)
    puck.rotateX(Math.PI / 2)
    const dot = add(puck, this.dotMat)
    dot.position.set(parts.dot.x, parts.dot.y, 0)
    // the working gauge: an arc that runs round the dot on the front
    const ring = new THREE.TorusGeometry(parts.dot.r * 1.55, parts.dot.r * 0.2, 8, 40, Math.PI * 0.75)
    this.gauge = new THREE.Mesh(ring, new THREE.MeshStandardMaterial({ color: c.palette.gauge, emissive: c.palette.gauge, emissiveIntensity: 0.45, roughness: 0.3 }))
    this.gauge.position.set(parts.dot.x, parts.dot.y, DEPTH / 2 + 0.05)
    this.gauge.visible = false
    this.body.add(this.gauge)
    this.root.add(this.body)

    this.bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTexture('hi'), transparent: true, depthWrite: false }))
    this.bubble.scale.set(0.95, 0.95, 1)
    this.bubble.position.set(0, this.height + 0.75, 0)
    this.bubble.visible = false
    this.bubble.renderOrder = 5
    this.root.add(this.bubble)
  }

  /** height of the top of the head above the ground (for pins and bubbles) */
  get top() {
    return this.height
  }

  setFace(emotion: EmotionId) {
    const key = `${this.id}:${emotion}`
    if (key === this.wantFace) return
    this.wantFace = key
    const entry = this.atlas.acquire(this.id, emotion)
    entry.ready.then(() => {
      if (this.wantFace !== key) { this.atlas.release(entry.tex); return }
      const old = this.faceTex
      this.faceTex = entry.tex
      this.front.map = entry.tex
      this.front.needsUpdate = true
      if (old && old !== entry.tex) this.atlas.release(old)
    })
  }

  setStatus(status: StatusId) {
    this.status = status
    this.gauge.visible = status === 'working'
    const off = status === 'offline'
    this.dotMat.color.set(off ? this.char.palette.offline : this.char.palette.dot)
    this.dotMat.emissive.set(off ? '#000000' : this.char.palette.dot)
  }

  setMotion(m: Motion) {
    if (m === 'cheer' && this.motion !== 'cheer') this.cheerT = 0
    if (m === 'error' && this.motion !== 'error') this.shakeT = 0
    this.motion = m
  }

  getMotion() {
    return this.motion
  }

  /** a quick happy jump (harvest, greeting) */
  cheer() {
    this.cheerT = 0.001
  }

  say(kind: BubbleKind | null, seconds = 0) {
    if (kind === null) {
      this.bubbleKind = null
      this.bubble.visible = false
      return
    }
    if (kind !== this.bubbleKind) {
      this.bubble.material.map = bubbleTexture(kind)
      this.bubble.material.needsUpdate = true
      this.bubbleKind = kind
    }
    this.bubble.visible = true
    this.bubbleT = seconds
  }

  get saying() {
    return this.bubbleKind
  }

  show(visible: boolean) {
    this.wantShown = visible ? 1 : 0
  }

  get hidden() {
    return this.shown < 0.02 && this.wantShown === 0
  }

  animate(t: number, dt: number) {
    // fade in and out of doors by shrinking into the ground
    this.shown += (this.wantShown - this.shown) * Math.min(1, dt * 5)
    if (Math.abs(this.wantShown - this.shown) < 0.01) this.shown = this.wantShown
    this.root.visible = this.shown > 0.02

    const m = this.motion
    const ph = t + this.seed
    let hop = 0, lean = 0, tilt = 0, squash = 0, spin = 0, yaw = 0
    if (m === 'walk') {
      this.walkPhase += dt * Math.max(0.6, this.speed) * 2.1
      const s = Math.sin(this.walkPhase * Math.PI)
      hop = Math.abs(s) * 0.11
      squash = -Math.cos(this.walkPhase * Math.PI * 2) * 0.05
      lean = 0.07
      tilt = Math.sin(this.walkPhase * Math.PI) * 0.05
    } else if (m === 'work') {
      hop = Math.max(0, Math.sin(ph * 5.5)) * 0.012
      lean = 0.09 + Math.sin(ph * 0.7) * 0.03
      tilt = Math.sin(ph * 1.3) * 0.035
      squash = Math.sin(ph * 2.2) * 0.012
    } else if (m === 'ask') {
      tilt = 0.16 + Math.sin(ph * 1.6) * 0.04
      hop = Math.max(0, Math.sin(ph * 3.2)) * 0.05
    } else if (m === 'error') {
      this.shakeT += dt
      const cyc = this.shakeT % 2.4
      yaw = cyc < 0.5 ? Math.sin(cyc * 40) * 0.09 * (1 - cyc / 0.5) : 0
      lean = -0.04
      squash = -0.035
      tilt = -0.06
    } else if (m === 'proud') {
      hop = Math.max(0, Math.sin(ph * 2.4)) * 0.07
      squash = Math.sin(ph * 4.8) * 0.02
      tilt = Math.sin(ph * 1.2) * 0.05
    } else if (m === 'rest') {
      squash = Math.sin(ph * 1.4) * 0.018
      tilt = Math.sin(ph * 0.5) * 0.03
    } else if (m === 'chat') {
      hop = Math.max(0, Math.sin(ph * 4)) * 0.03
      tilt = Math.sin(ph * 2) * 0.06
    } else if (m === 'sleep') {
      squash = Math.sin(ph * 0.9) * 0.025 - 0.02
      tilt = 0.1
    } else {
      squash = Math.sin(ph * 1.6) * 0.012
    }
    if (m === 'cheer' || this.cheerT > 0) {
      this.cheerT += dt
      const k = this.cheerT
      if (k < 1.1) {
        hop = Math.max(hop, Math.abs(Math.sin(k * Math.PI * 2.7)) * 0.42 * (1 - k / 1.1))
        spin = k < 0.7 ? (k / 0.7) * Math.PI * 2 : 0
        squash = Math.sin(k * Math.PI * 5.4) * 0.08 * (1 - k / 1.1)
      } else if (m !== 'cheer') this.cheerT = 0
      else this.cheerT = 0.001
    }
    const b = this.blend
    const r = Math.min(1, dt * 9)
    b.hop += (hop - b.hop) * Math.min(1, dt * 16)
    b.lean += (lean - b.lean) * r
    b.tilt += (tilt - b.tilt) * r
    b.squash += (squash - b.squash) * Math.min(1, dt * 14)
    const s = this.shown
    this.body.position.y = b.hop
    this.body.rotation.set(b.lean, yaw + spin, b.tilt)
    this.body.scale.set((1 - b.squash * 0.6) * s, (1 + b.squash) * s, (1 - b.squash * 0.6) * s)

    // signal dot: a soft pulse that says what the status is
    const st = this.status
    const pulse = st === 'needs-input' ? 0.5 + 0.5 * Math.sin(t * 6) : st === 'error' ? (Math.sin(t * 9) > 0 ? 1 : 0.2) : st === 'success' ? 0.6 + 0.4 * Math.sin(t * 2.5) : 1
    this.dotMat.emissiveIntensity = STATUS_GLOW[st] * pulse
    if (this.gauge.visible) this.gauge.rotation.z = -t * 3.4

    if (this.bubble.visible) {
      if (this.bubbleT > 0) {
        this.bubbleT -= dt
        if (this.bubbleT <= 0) this.say(null)
      }
      this.bubble.position.y = this.height * s + 0.72 + Math.sin(t * 2.4 + this.seed) * 0.05
      const pop = Math.min(1, s)
      this.bubble.scale.setScalar(0.95 * pop)
    }
  }

  dispose() {
    if (this.faceTex) this.atlas.release(this.faceTex)
    this.shellMat.dispose()
    this.front.dispose()
    this.dotMat.dispose()
    this.bubble.material.dispose()
  }
}
