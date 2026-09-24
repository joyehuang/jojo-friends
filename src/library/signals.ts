import type { Bubble, Character, TailSide } from './character'
import { JOJO } from './characters/jojo'
import type { Frame, FrameOptions, Fx } from './frame'
import { COLORS } from './geometry'
import { clamp, type Pose } from './pose'
import { rigPose } from './rig'

/**
 * Shapes for the three "task" statuses. Each one has its own silhouette so
 * they read apart at 24px, in grayscale and with motion off — not just a
 * different rhythm of the signal dot:
 *
 * - working:      an open progress gauge lining the notch under the dot
 * - needs-input:  a speech bubble with "?" rising from the dot
 * - success:      the dot turns into a check badge
 *
 * Everything sits in the shell's notch band, clear of eyes and mouth. Jojo's
 * numbers below are the approved ones; other characters scale them by their
 * dot size and turn them to face their own notch (see Character.signal).
 */

const f = (n: number) => (Math.abs(n) < 1e-4 ? '0' : String(Math.round(n * 100) / 100))
const rad = (deg: number) => (deg * Math.PI) / 180

/** Gauge track: from upper-left, under the dot, to upper-right (screen angles, y down). */
export const GAUGE = {
  from: 200,
  to: -20,
  full: { gap: 20, width: 20 },
  small: { gap: 34, width: 34 },
  /** how much of the track is lit in static renders */
  still: 0.62,
} as const

/** Question bubble body (rounded rect) in shell space; the tail points at the dot. */
export const BUBBLE = {
  full: { x: 606, y: 206, w: 178, h: 128, rx: 46, stroke: 10, glyph: 14 },
  small: { x: 598, y: 226, w: 240, h: 170, rx: 60, stroke: 0, glyph: 19 },
} as const

/** Check mark inside the dot, dot-local (dot radius 53). */
export const CHECK = [[-25, 1], [-8, 18], [25, -15]] as const
export const CHECK_WIDTH = { full: 15, small: 26 } as const
/** extra dot scale while success holds, so the check has room at small sizes */
export const CHECK_BOOST = { full: 0.1, small: 0.55 } as const

export const SPARKS = [-150, -100, -45, 10, 170, 60] as const

export interface Point {
  x: number
  y: number
}

/** Centre of the signal dot in shell space (before the body transform); `p` is rigged. */
export function dotCentre(p: Pose, fx: Fx, ch: Character = JOJO): Point {
  const kd = ch.k.dot
  return { x: ch.dot.cx + p.dotX + fx.sigX * kd, y: ch.dot.cy + p.dotY + fx.sigY * kd }
}

export function gaugeRadius(p: Pose, small: boolean, ch: Character = JOJO) {
  const g = small ? ch.signal.gauge.small : ch.signal.gauge.full
  const kd = ch.k.dot
  return ch.dot.r * p.dotS + g.gap * kd + (g.width * kd) / 2
}

function arcPath(c: Point, r: number, a0: number, a1: number) {
  // a0 > a1: travels left → under → right (decreasing screen angle)
  const x0 = c.x + r * Math.cos(rad(a0)), y0 = c.y + r * Math.sin(rad(a0))
  const x1 = c.x + r * Math.cos(rad(a1)), y1 = c.y + r * Math.sin(rad(a1))
  const large = a0 - a1 > 180 ? 1 : 0
  return `M${f(x0)},${f(y0)} A${f(r)},${f(r)} 0 ${large} 0 ${f(x1)},${f(y1)}`
}

/** Rounded-rect bubble with a tail on its left / right / bottom edge, as one outline. */
export function bubblePath(b: { x: number; y: number; w: number; h: number; rx: number }, tip: Point, tail: TailSide = 'left') {
  const { x, y, w, h, rx } = b
  const x1 = x + w, y1 = y + h
  const ya = y + rx + (h - 2 * rx) * 0.15
  const yb = y + rx + (h - 2 * rx) * 0.85
  if (tail === 'right') {
    return (
      `M${f(x + rx)},${f(y)} H${f(x1 - rx)} A${f(rx)},${f(rx)} 0 0 1 ${f(x1)},${f(y + rx)} ` +
      `V${f(ya)} L${f(tip.x)},${f(tip.y)} L${f(x1)},${f(yb)} ` +
      `V${f(y1 - rx)} A${f(rx)},${f(rx)} 0 0 1 ${f(x1 - rx)},${f(y1)} H${f(x + rx)} ` +
      `A${f(rx)},${f(rx)} 0 0 1 ${f(x)},${f(y1 - rx)} ` +
      `V${f(y + rx)} A${f(rx)},${f(rx)} 0 0 1 ${f(x + rx)},${f(y)} Z`
    )
  }
  if (tail === 'down') {
    // tail base sits under the tip (clamped to the straight part of the bottom edge)
    const half = Math.min((w - 2 * rx) * 0.16, 30)
    const mid = clamp(tip.x, x + rx + half, x1 - rx - half)
    const xa = mid - half
    const xb = mid + half
    return (
      `M${f(x + rx)},${f(y)} H${f(x1 - rx)} A${f(rx)},${f(rx)} 0 0 1 ${f(x1)},${f(y + rx)} ` +
      `V${f(y1 - rx)} A${f(rx)},${f(rx)} 0 0 1 ${f(x1 - rx)},${f(y1)} H${f(xb)} L${f(tip.x)},${f(tip.y)} L${f(xa)},${f(y1)} H${f(x + rx)} ` +
      `A${f(rx)},${f(rx)} 0 0 1 ${f(x)},${f(y1 - rx)} ` +
      `V${f(y + rx)} A${f(rx)},${f(rx)} 0 0 1 ${f(x + rx)},${f(y)} Z`
    )
  }
  return (
    `M${f(x + rx)},${f(y)} H${f(x1 - rx)} A${f(rx)},${f(rx)} 0 0 1 ${f(x1)},${f(y + rx)} ` +
    `V${f(y1 - rx)} A${f(rx)},${f(rx)} 0 0 1 ${f(x1 - rx)},${f(y1)} H${f(x + rx)} ` +
    `A${f(rx)},${f(rx)} 0 0 1 ${f(x)},${f(y1 - rx)} V${f(yb)} L${f(tip.x)},${f(tip.y)} L${f(x)},${f(ya)} ` +
    `V${f(y + rx)} A${f(rx)},${f(rx)} 0 0 1 ${f(x + rx)},${f(y)} Z`
  )
}

/** Where the bubble's tail points: just outside the dot, on the bubble's side. */
export function bubbleTail(ch: Character, small: boolean): TailSide {
  return small ? ch.signal.bubble.smallTail ?? ch.signal.bubble.tail : ch.signal.bubble.tail
}

export function bubbleTip(p: Pose, fx: Fx, ch: Character = JOJO, small = false): Point {
  const c = dotCentre(p, fx, ch)
  const kd = ch.k.dot
  const tail = bubbleTail(ch, small)
  if (tail === 'right') return { x: c.x - ch.dot.r * p.dotS * 0.82 - 8 * kd, y: c.y + 14 * kd }
  if (tail === 'down') return { x: c.x + 14 * kd, y: c.y - ch.dot.r * p.dotS * 0.82 - 8 * kd }
  return { x: c.x + ch.dot.r * p.dotS * 0.82 + 8 * kd, y: c.y + 14 * kd }
}

/** "?" drawn as strokes, centred on 0,0, about 100 units tall. */
export const ASK_PATH = 'M-19,-24 C-19,-47 21,-47 21,-24 C21,-9 1,-8 1,10'
export const ASK_DOT = { cx: 1, cy: 32, r: 0.62 } // r is a multiple of the stroke width

function partialPolyline(pts: ReadonlyArray<readonly [number, number]>, t: number, ch: Character) {
  const DOT = ch.dot
  const kd = ch.k.dot
  const P = pts.map(([x, y]) => [x * kd, y * kd] as const)
  const segs = P.slice(1).map((q, i) => Math.hypot(q[0] - P[i][0], q[1] - P[i][1]))
  const total = segs.reduce((a, b) => a + b, 0)
  let left = clamp(t, 0, 1) * total
  let d = `M${f(DOT.cx + P[0][0])},${f(DOT.cy + P[0][1])}`
  for (let i = 0; i < segs.length && left > 1e-3; i++) {
    const u = Math.min(1, left / segs[i])
    const [ax, ay] = P[i]
    const [bx, by] = P[i + 1]
    d += ` L${f(DOT.cx + ax + (bx - ax) * u)},${f(DOT.cy + ay + (by - ay) * u)}`
    left -= segs[i]
  }
  return d
}

/**
 * While the success badge shows, the dot (boost and pop included) grows into
 * the notch (towards the shell) so its outer edge never passes the plain
 * dot's. Returned as a distance along `ch.signal.badgeDir` (inward, or outward
 * for characters whose plate leaves no room in the notch).
 */
export function badgeShift(p: Pose, fx: Fx, small: boolean, ch: Character = JOJO) {
  return fx.check > 0 ? (dotScale(fx, small, ch) - 1) * ch.dot.r * p.dotS : 0
}

/**
 * Status part of the dot's scale. Plain `sigS` for every status except
 * success, where the check boost is added and, at small sizes, the pop is
 * halved so the grown badge stays clear of the face plate.
 */
export function dotScale(fx: Fx, small: boolean, ch: Character = JOJO) {
  if (!(fx.check > 0)) return fx.sigS
  const pop = small ? 1 + (fx.sigS - 1) * 0.5 : fx.sigS
  return pop * checkBoost(fx, small, ch)
}

/** Extra dot scale from the success badge. */
export function checkBoost(fx: Fx, small: boolean, ch: Character = JOJO) {
  return 1 + clamp(fx.check, 0, 1) * (small ? ch.signal.checkBoostSmall : CHECK_BOOST.full)
}

/** Adds the status-shape attributes to a frame (pure, like framePose). `p` is the rigged pose. */
export function signalFrame(p: Pose, fx: Fx, opts: FrameOptions, out: Frame, ch: Character = JOJO) {
  const small = opts.small
  const c = dotCentre(p, fx, ch)
  const kd = ch.k.dot
  const sig = ch.signal

  // working: gauge
  const g = small ? sig.gauge.small : sig.gauge.full
  const r = gaugeRadius(p, small, ch)
  const span = sig.gauge.from - sig.gauge.to
  const tail = clamp(fx.gaugeTail, 0, 1)
  const head = clamp(Math.max(fx.gaugeHead, tail), 0, 1)
  out.gauge = { opacity: f(clamp(fx.gauge, 0, 1)) }
  out.gaugeTrack = { d: arcPath(c, r, sig.gauge.from, sig.gauge.to), 'stroke-width': f(g.width * kd) }
  // companions at small sizes: a white keyline under the ring (like the paper gap
  // around every dot in the source art) so it reads on light shells and dark pages
  out.gaugeHalo = { d: out.gaugeTrack.d, 'stroke-width': f(g.width * kd + 16 * kd), opacity: small ? '1' : '0' }
  const lit = head - tail > 0.004
  out.gaugeFill = {
    d: lit ? arcPath(c, r, sig.gauge.from - span * tail, sig.gauge.from - span * head) : `M${f(c.x)},${f(c.y)}`,
    'stroke-width': f(g.width * kd),
    opacity: lit ? '1' : '0',
  }

  // needs-input: bubble
  const b: Bubble = small ? sig.bubble.small : sig.bubble.full
  const tip = bubbleTip(p, fx, ch, small)
  const bs = Math.max(0.001, fx.bubbleS)
  out.bubble = {
    transform: `translate(${f(tip.x)},${f(tip.y)}) scale(${f(bs)}) translate(${f(-tip.x)},${f(-tip.y)})`,
    opacity: f(clamp(fx.bubble, 0, 1)),
  }
  out.bubbleShape = { d: bubblePath(b, tip, bubbleTail(ch, small)), 'stroke-width': f(b.stroke) }
  const gs = (b.h / 100) * 0.9
  out.ask = {
    transform: `translate(${f(b.x + b.w / 2)},${f(b.y + b.h / 2 + 2 * kd)}) rotate(${f(fx.ask)}) scale(${f(gs)})`,
  }
  out.askPath = { 'stroke-width': f(b.glyph) }
  out.askDot = { r: f(b.glyph * ASK_DOT.r * 1.4) }

  // success: check inside the (boosted) dot, sparkles once
  // when a character's badge can't grow as much as Jojo's at small sizes, the
  // check gets proportionally bolder instead, so success still reads at 24 px
  const bold = small ? 1 + Math.max(0, CHECK_BOOST.small - ch.signal.checkBoostSmall) * 1.4 : 1
  const cw = (small ? CHECK_WIDTH.small : CHECK_WIDTH.full) * kd * bold
  const draw = clamp(fx.checkDraw, 0, 1)
  out.check = {
    d: partialPolyline(CHECK, draw, ch),
    'stroke-width': f(cw),
    opacity: f(draw > 0.01 ? clamp(fx.check, 0, 1) : 0),
  }
  const sp = clamp(fx.spark, 0, 1)
  const so = small ? 0 : sp <= 0 || sp >= 1 ? 0 : Math.sin(Math.PI * sp)
  const boost = checkBoost(fx, small, ch)
  const shift = badgeShift(p, fx, small, ch)
  const sc = { x: c.x + shift * sig.badgeDir[0], y: c.y + shift * sig.badgeDir[1] }
  const r0 = ch.dot.r * p.dotS * boost + 18 * kd + 34 * kd * sp
  SPARKS.forEach((a, i) => {
    const len = 26 * kd * (1 - 0.6 * sp)
    const ca = Math.cos(rad(a)), sa = Math.sin(rad(a))
    out[`spark${i}`] = {
      d: `M${f(sc.x + ca * r0)},${f(sc.y + sa * r0)} L${f(sc.x + ca * (r0 + len))},${f(sc.y + sa * (r0 + len))}`,
      opacity: f(so),
    }
  })
  return out
}

export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

/**
 * Bounding box (shell space, before the body transform) of what a status
 * draws at rest, including stroke. `pose` is in shared units. Used by tests to
 * prove the shapes stay inside the frame and clear of eyes and mouth.
 */
export function statusBounds(status: 'working' | 'needs-input' | 'success', pose: Pose, fx: Fx, small: boolean, ch: Character = JOJO): Box {
  const p = rigPose(pose, ch, undefined, small)
  const c = dotCentre(p, fx, ch)
  const kd = ch.k.dot
  if (status === 'working') {
    const g = small ? ch.signal.gauge.small : ch.signal.gauge.full
    const r = gaugeRadius(p, small, ch)
    const o = r + (g.width * kd) / 2
    // sample the track so any notch direction is covered
    const { from, to } = ch.signal.gauge
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (let i = 0; i <= 48; i++) {
      const a = rad(from + ((to - from) * i) / 48)
      const x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y)
    }
    const hw = (g.width * kd) / 2
    if (ch === JOJO) {
      // the approved (Jojo) bound, kept as it was
      const up = Math.max(Math.sin(rad(GAUGE.from - 180)), Math.sin(rad(-GAUGE.to))) * r + g.width / 2
      return { x0: c.x - o, y0: c.y - up, x1: c.x + o, y1: c.y + o }
    }
    return { x0: x0 - hw, y0: y0 - hw, x1: x1 + hw, y1: y1 + hw }
  }
  if (status === 'needs-input') {
    const b = small ? ch.signal.bubble.small : ch.signal.bubble.full
    const tip = bubbleTip(p, fx, ch, small)
    const h = b.stroke / 2
    const k = Math.max(0, fx.bubbleS)
    const sx = (x: number) => tip.x + (x - tip.x) * k
    const sy = (y: number) => tip.y + (y - tip.y) * k
    return {
      x0: sx(Math.min(b.x, tip.x) - h),
      y0: sy(Math.min(b.y, tip.y) - h),
      x1: sx(Math.max(b.x + b.w, tip.x) + h),
      y1: sy(Math.max(b.y + b.h, tip.y) + h),
    }
  }
  const r = ch.dot.r * p.dotS * dotScale(fx, small, ch)
  const shift = badgeShift(p, fx, small, ch)
  const cx = c.x + shift * ch.signal.badgeDir[0]
  const cy = c.y + shift * ch.signal.badgeDir[1]
  return { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r }
}

export const SIGNAL_COLORS = {
  gauge: COLORS.coral,
  track: COLORS.mint,
  bubble: '#ffffff',
  bubbleEdge: COLORS.coral,
  ask: COLORS.indigo,
  check: '#ffffff',
  spark: COLORS.coral,
} as const
