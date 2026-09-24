import type { Character } from './character'
import { JOJO } from './characters/jojo'
import { COLORS } from './geometry'
import { clamp, type Pose } from './pose'
import { rigPose } from './rig'
import { badgeShift, dotScale, signalFrame } from './signals'

/**
 * Time-driven effect phases. They are not sprung (a falling tear should never
 * spring back up), so the engine owns them; static renders use FX_STATIC.
 */
export interface Fx {
  /** 0..1 progress of the falling tear under each eye */
  dropL: number
  dropR: number
  /** tear stream dash flow, px */
  flow: number
  /** confetti burst progress 0..1 */
  burst: number
  /** floating z phase 0..1 */
  z: number
  /** status ring: radius offset px and visibility 0..1 */
  ringGrow: number
  ring: number
  /** status "needs attention" mark on the dot 0..1 */
  mark: number
  /** status dot extra lift/scale, px / factor */
  sigY: number
  sigX: number
  sigS: number
  sigGlow: number
  /** working: progress gauge visibility 0..1 and its lit segment (0..1 along the track) */
  gauge: number
  gaugeTail: number
  gaugeHead: number
  /** needs-input: question bubble visibility 0..1, pop scale, "?" tilt in deg */
  bubble: number
  bubbleS: number
  ask: number
  /** success: check mark visibility 0..1, how much of it is drawn 0..1, one-shot sparkle progress 0..1 */
  check: number
  checkDraw: number
  spark: number
}

export const FX_STATIC: Fx = {
  dropL: 0.52, dropR: 0.3, flow: 0, burst: 0.5, z: 0.45,
  ringGrow: 0, ring: 0, mark: 0, sigY: 0, sigX: 0, sigS: 1, sigGlow: 0,
  gauge: 0, gaugeTail: 0, gaugeHead: 0, bubble: 0, bubbleS: 1, ask: 0, check: 0, checkDraw: 1, spark: 0,
}

export interface FrameOptions {
  /** hide fine decorations and thicken hairlines for tiny avatars */
  small: boolean
  brows: boolean
  shadow: boolean
  /** minimum stroke width in PNG units (derived from rendered size) */
  minStroke: number
  /** whose geometry to draw (default Jojo) */
  character?: Character
}

export type Attrs = Record<string, string>
export type Frame = Record<string, Attrs>

const f = (n: number) => (Math.abs(n) < 1e-4 ? '0' : String(Math.round(n * 100) / 100))

/** Confetti pieces: direction (deg, 0 = right, -90 = up), travel, colour, size. */
export const CONFETTI = [
  { a: -150, d: 230, c: COLORS.coral, w: 40, h: 20, spin: 380 },
  { a: -128, d: 190, c: '#5fc4a6', w: 28, h: 28, spin: -260 },
  { a: -108, d: 250, c: COLORS.indigo, w: 36, h: 18, spin: 300 },
  { a: -90, d: 170, c: '#ffbf3c', w: 26, h: 26, spin: -420 },
  { a: -72, d: 240, c: COLORS.coral, w: 24, h: 24, spin: 200 },
  { a: -54, d: 210, c: '#5fc4a6', w: 40, h: 19, spin: -340 },
  { a: -36, d: 270, c: COLORS.indigo, w: 26, h: 26, spin: 260 },
  { a: -20, d: 220, c: '#ffbf3c', w: 36, h: 18, spin: -300 },
  { a: -164, d: 190, c: '#ffbf3c', w: 24, h: 24, spin: 360 },
] as const

/** palette.confetti index for each CONFETTI piece (coral, green, indigo, yellow) */
export const CONFETTI_TONE = [0, 1, 2, 3, 0, 1, 2, 3, 3] as const

const TEAR_DROP = 'M0,-36 C10,-18 22,-5 22,10 A22,22 0 0 1 -22,10 C-22,-5 -10,-18 0,-36 Z'
export const TEAR_PATH = TEAR_DROP

interface EyeGeo {
  d: string
  thick: number
  /** visible half height before blink, eye-local */
  half: number
}

/** Eye as a thick round-capped centre line, optionally bent into an arc or chevron. */
function eyeGeo(len: number, thick: number, rotDeg: number, bend: number, sharp: number,
  minStroke: number): EyeGeo {
  const r = (rotDeg * Math.PI) / 180
  const dx = Math.sin(r)
  const dy = Math.cos(r)
  const nx = dy
  const ny = -dx
  const L = Math.max(0.5, len) / 2
  const a = clamp(sharp, 0.5, 1)
  const ax = -dx * L, ay = -dy * L
  const bx = dx * L, by = dy * L
  const px = (nx * bend) / (0.75 * a)
  const py = (ny * bend) / (0.75 * a)
  const c1x = ax + (px - ax) * a, c1y = ay + (py - ay) * a
  const c2x = bx + (px - bx) * a, c2y = by + (py - by) * a
  const t = Math.max(minStroke, thick)
  const half = Math.abs(dy) * L + t / 2 + Math.abs(ny * bend)
  return {
    d: `M${f(ax)},${f(ay)} C${f(c1x)},${f(c1y)} ${f(c2x)},${f(c2y)} ${f(bx)},${f(by)}`,
    thick: t,
    half,
  }
}

function lidClip(g: EyeGeo, lidTop: number, lidTilt: number, lidBot: number, side: 1 | -1) {
  // lids travel from 40px outside the eye to the opposite edge
  const span = g.half * 2 + 40
  const top = -g.half - 40 + clamp(lidTop, 0, 1) * span
  const bot = g.half + 40 - clamp(lidBot, 0, 1) * span
  const W = 170
  const s = lidTilt * side
  // slanted top edge, flat bottom edge; collapses to nothing when the lids meet
  const yTl = Math.min(top - s * W, bot)
  const yTr = Math.min(top + s * W, bot)
  return `M${-W},${f(yTl)} L${W},${f(yTr)} L${W},${f(bot)} L${-W},${f(bot)} Z`
}

function eyeParts(p: Pose, which: 'l' | 'r', opts: FrameOptions, ch: Character) {
  const base = which === 'l' ? ch.eyeL : ch.eyeR
  const side: 1 | -1 = which === 'l' ? 1 : -1
  const k = (s: string) => p[(which + s) as keyof Pose]
  const g = eyeGeo(k('Len'), k('Thick'), k('Rot'), k('Bend'), k('Sharp'), opts.minStroke)
  const clip = lidClip(g, k('LidTop'), k('LidTilt'), k('LidBot'), side)
  const open = clamp(k('Open'), 0.07, 1.2)
  const cx = base.cx + k('Dx')
  const cy = base.cy + k('Dy')
  const shineR = g.thick * 0.2
  const len = Math.max(0, k('Len'))
  return {
    group: { transform: `translate(${f(cx)},${f(cy)}) scale(1,${f(open)})` },
    path: { d: g.d, 'stroke-width': f(g.thick) },
    clip: { d: clip },
    shine: {
      cx: f(-g.thick * 0.14),
      cy: f(-len / 2 + g.thick * 0.12),
      r: f(shineR),
      opacity: f(opts.small ? 0 : clamp(p.shine, 0, 1)),
    },
    /** visible bottom of the eye in features space, used to seat tears */
    bottom: cy + Math.min(g.half, g.half + 40 - clamp(k('LidBot'), 0, 1) * (g.half * 2 + 40)) * open,
    cx,
  }
}

function browPath(cx: number, cy: number, len: number, rotDeg: number, side: 1 | -1, arch = 8) {
  const r = ((rotDeg * side) * Math.PI) / 180
  const hx = (Math.cos(r) * len) / 2
  const hy = (Math.sin(r) * len) / 2
  const mx = cx, my = cy
  // gentle arch: control point lifted perpendicular to the brow
  const qx = mx + Math.sin(r) * arch
  const qy = my - Math.cos(r) * arch
  return `M${f(mx - hx)},${f(my - hy)} Q${f(qx)},${f(qy)} ${f(mx + hx)},${f(my + hy)}`
}

function mouthPath(p: Pose) {
  const w = Math.max(0, p.mW) / 2
  const s = w / 3
  return (
    `M${f(-w)},0 C${f(-s)},${f(p.mU1)} ${f(s)},${f(p.mU2)} ${f(w)},0 ` +
    `C${f(s)},${f(p.mL2)} ${f(-s)},${f(p.mL1)} ${f(-w)},0 Z`
  )
}

function dropAt(progress: number, sx: number, sy: number, ex: number, ey: number) {
  const q = clamp(progress, 0, 1)
  if (q < 0.28) {
    const g = q / 0.28
    return { x: sx, y: sy + 4 * g, s: 0.35 + 0.65 * g, o: Math.min(1, g * 2.5) }
  }
  const m = (q - 0.28) / 0.72
  const e = Math.pow(m, 1.7)
  const o = m > 0.78 ? 1 - (m - 0.78) / 0.22 : 1
  return { x: sx + (ex - sx) * e, y: sy + 4 + (ey - sy - 4) * e, s: 1 - 0.12 * m, o }
}

/**
 * Turn a pose into attribute values keyed by `data-part`. Pure and
 * deterministic: the React markup, the static exporter and the animation
 * engine all go through here. `pose` is in shared (Jojo) units; the
 * character's rig maps it onto its own geometry first.
 */
export function framePose(pose: Pose, fx: Fx, opts: FrameOptions): Frame {
  const ch = opts.character ?? JOJO
  const p = rigPose(pose, ch, undefined, opts.small)
  const k = ch.k
  const kb = k.body, kd = k.dot, kg = k.gaze, kf = k.face
  const DOT = ch.dot
  const PIVOT = ch.pivot
  const out: Frame = {}
  const lookX = clamp(p.lookX, -1.15, 1.15)
  const lookY = clamp(p.lookY, -1.15, 1.15)

  // shell: translate, then tilt + squash about the bottom-centre pivot
  out.body = {
    transform:
      `translate(${f(p.tx)},${f(p.ty)}) ` +
      `translate(${PIVOT.x},${PIVOT.y}) rotate(${f(p.rot)}) scale(${f(p.sx)},${f(p.sy)}) ` +
      `translate(${-PIVOT.x},${-PIVOT.y})`,
  }
  const lift = Math.max(0, -p.ty)
  out.shadow = {
    transform: `translate(${f(ch.shadowOffset.x + p.tx * 0.6)},${ch.shadowOffset.y})`,
    opacity: f(opts.shadow ? 0.1 * (1 - Math.min(0.7, lift / (140 * kb))) : 0),
  }

  // gaze parallax: face plate < mouth < eyes
  const fX = lookX * 9 * kg, fY = lookY * 7 * kg
  out.face = { transform: `translate(${f(fX)},${f(fY)})` }
  const eX = lookX * 30 * kg - fX, eY = lookY * 24 * kg - fY
  out.features = { transform: `translate(${f(eX)},${f(eY)})` }

  const L = eyeParts(p, 'l', opts, ch)
  const R = eyeParts(p, 'r', opts, ch)
  out.eyeL = L.group
  out.eyeLPath = L.path
  out.lidL = L.clip
  out.shineL = L.shine
  out.eyeR = R.group
  out.eyeRPath = R.path
  out.lidR = R.clip
  out.shineR = R.shine

  const browOn = opts.brows && !opts.small ? clamp(p.brow, 0, 1) : 0
  const BL = ch.browL, BR = ch.browR
  out.brows = { opacity: f(browOn) }
  out.browL = { d: browPath(BL.cx + p.lDx, BL.cy + p.lDy * 0.5 + p.lBrowDy, BL.len, p.lBrowRot, 1, 8 * kf) }
  out.browR = { d: browPath(BR.cx + p.rDx, BR.cy + p.rDy * 0.5 + p.rBrowDy, BR.len, p.rBrowRot, -1, 8 * kf) }

  const mX = lookX * 21 * kg - fX, mY = lookY * 14 * kg - fY
  const mThick = Math.max(opts.minStroke, p.mThick)
  out.mouth = {
    transform: `translate(${f(ch.mouth.cx + p.mDx + mX)},${f(ch.mouth.cy + p.mDy + mY)}) rotate(${f(p.mRot)})`,
  }
  const md = mouthPath(p)
  out.mouthPath = { d: md, 'stroke-width': f(mThick) }
  out.mouthClip = { d: md }
  const upMid = 0.375 * (p.mU1 + p.mU2)
  const loMid = 0.375 * (p.mL1 + p.mL2)
  const gap = Math.max(0, loMid - upMid)
  out.tongue = {
    cx: f(p.mW * 0.06),
    cy: f(loMid + mThick * 0.2),
    rx: f(Math.max(1, p.mW * 0.3)),
    ry: f(Math.max(1, gap * 0.42)),
    opacity: f(gap > 14 * kf ? clamp(p.tongue, 0, 1) : 0),
  }

  // blush grows rather than fades: coral at low alpha over mint turns grey
  const blush = clamp(p.blush, 0, 1)
  out.blush = { opacity: f(Math.min(1, blush * 3) * 0.7) }
  out.blushL = { rx: f((20 + 28 * blush) * kf), ry: f((11 + 14 * blush) * kf) }
  out.blushR = { rx: f((18 + 24 * blush) * kf), ry: f((10 + 13 * blush) * kf) }

  // tears live in features space so they stay seated under the eyes
  out.tears = { transform: out.features.transform }
  const TL = ch.tearL, TR = ch.tearR
  const pool = clamp(p.tearPool, 0, 1)
  out.poolL = {
    transform: `translate(${f(L.cx + TL.pool[0])},${f(L.bottom + TL.pool[1])}) scale(${f(TL.poolScale * pool + 0.001)})`,
    opacity: f(pool),
  }
  out.poolR = {
    transform: `translate(${f(R.cx + TR.pool[0])},${f(R.bottom + TR.pool[1])}) scale(${f(TR.poolScale * pool + 0.001)})`,
    opacity: f(pool),
  }
  const tears = clamp(p.tears, 0, 1)
  // end points are anchored to the plate (cancel the gaze shift) so a drop never runs off it
  const dl = dropAt(fx.dropL, L.cx + TL.drop0[0], L.bottom + TL.drop0[1], L.cx + TL.drop1x - eX, TL.drop1y - eY)
  const dr = dropAt(fx.dropR, R.cx + TR.drop0[0], R.bottom + TR.drop0[1], R.cx + TR.drop1x - eX, TR.drop1y - eY)
  out.dropL = {
    transform: `translate(${f(dl.x)},${f(dl.y)}) scale(${f(dl.s * TL.dropScale)})`,
    opacity: f(tears * dl.o),
  }
  out.dropR = {
    transform: `translate(${f(dr.x)},${f(dr.y)}) scale(${f(dr.s * TR.dropScale)})`,
    opacity: f(tears * dr.o),
  }
  const stream = clamp(p.stream, 0, 1)
  const slY = L.bottom + 2
  const srY = R.bottom + 2
  out.streamL = {
    d: `M${f(L.cx + TL.s0x)},${f(slY)} C${f(L.cx + TL.s1[0])},${f(slY + TL.s1[1])} ${f(L.cx + TL.s2[0] - eX)},${f(TL.s2[1] - eY)} ${f(L.cx + TL.s3[0] - eX)},${f(TL.s3[1] - eY)}`,
    opacity: f(stream),
    'stroke-dashoffset': f(-fx.flow * kf),
  }
  out.streamR = {
    d: `M${f(R.cx + TR.s0x)},${f(srY)} C${f(R.cx + TR.s1[0])},${f(srY + TR.s1[1])} ${f(R.cx + TR.s2[0] - eX)},${f(TR.s2[1] - eY)} ${f(R.cx + TR.s3[0] - eX)},${f(TR.s3[1] - eY)}`,
    opacity: f(stream),
    'stroke-dashoffset': f(-fx.flow * 1.08 * kf),
  }

  // signal dot
  const dS = p.dotS * dotScale(fx, opts.small, ch)
  // a success badge grows into the notch (towards the shell), never out past the dot's own edge
  const boost = badgeShift(p, fx, opts.small, ch)
  const IN = ch.signal.badgeDir
  out.dot = {
    transform:
      `translate(${f(p.dotX + fx.sigX * kd + boost * IN[0])},${f(p.dotY + fx.sigY * kd + boost * IN[1])}) ` +
      `translate(${DOT.cx},${DOT.cy}) scale(${f(dS)}) translate(${-DOT.cx},${-DOT.cy})`,
  }
  out.dotGlow = { opacity: f(opts.small ? 0 : clamp(p.dotGlow + fx.sigGlow, 0, 1)) }
  out.ring = {
    r: f(DOT.r + 16 * kd + fx.ringGrow * kd),
    opacity: f(clamp(fx.ring, 0, 1)),
  }
  out.mark = { opacity: f(clamp(fx.mark, 0, 1)) }
  // working / needs-input / success shapes (only mounted for those statuses)
  signalFrame(p, fx, opts, out, ch)

  // confetti
  const burst = clamp(fx.burst, 0, 1)
  const conf = opts.small ? 0 : clamp(p.confetti, 0, 1)
  const ease = 1 - Math.pow(1 - burst, 2.2)
  CONFETTI.forEach((c, i) => {
    const a = (c.a * Math.PI) / 180
    const x = DOT.cx + p.dotX + Math.cos(a) * c.d * kb * ease
    const y = DOT.cy + p.dotY + Math.sin(a) * c.d * kb * ease + 150 * kb * burst * burst
    const o = burst < 0.08 ? burst / 0.08 : burst > 0.72 ? Math.max(0, 1 - (burst - 0.72) / 0.28) : 1
    out[`confetti${i}`] = {
      transform: `translate(${f(x)},${f(y)}) rotate(${f(c.spin * burst)})`,
      opacity: f(conf * o),
    }
  })

  const z = opts.small ? 0 : clamp(p.zzz, 0, 1)
  for (let i = 0; i < 2; i++) {
    const ph = (fx.z + i * 0.5) % 1
    out[`zzz${i}`] = {
      transform: `translate(${f(ch.zzz.x + i * 34 * kb + ph * 14 * kb)},${f(ch.zzz.y - i * 18 * kb - ph * 70 * kb)}) scale(${f((0.7 + ph * 0.5 - i * 0.1) * kb)})`,
      opacity: f(z * Math.sin(Math.PI * ph)),
    }
  }
  return out
}
