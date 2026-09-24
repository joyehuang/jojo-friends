// Geometry probes over the *real* frame output (framePose), shared by the
// per-character tests. Everything is measured in plate space: the face group
// translates as a whole, so only the offsets inside it matter.
import { CANVAS, type Character } from '../../src/library/character'
import { motionAmp, resolveConfig, targetPose } from '../../src/library/config'
import { EMOTION_IDS, EMOTION_LIST, type EmotionDef } from '../../src/library/emotions'
import { staticFx } from '../../src/library/engine'
import { FX_STATIC, framePose, type Frame } from '../../src/library/frame'
import { addDelta, type Pose } from '../../src/library/pose'
import { rigPose } from '../../src/library/rig'
import { buildShape, discInside, discOutside, pointInPoly, rotateShape, type Pt } from '../../src/library/shapes'
import { badgeShift, bubbleTip, dotCentre, dotScale, gaugeRadius } from '../../src/library/signals'
import { STATUSES } from '../../src/library/status'

export interface Disc {
  x: number
  y: number
  r: number
  what: string
}

const nums = (s: string) => (s.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g) ?? []).map(Number)
const translateOf = (t: string | undefined) => {
  const m = /translate\(([-\d.e]+),([-\d.e]+)\)/.exec(t ?? '')
  return m ? [Number(m[1]), Number(m[2])] : [0, 0]
}

function bez(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n: number): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ])
  }
  return out
}

/** Discs covering every visible feature stroke, in plate space. */
export function featureDiscs(fr: Frame, ch: Character, opts: { brows: boolean }): Disc[] {
  const out: Disc[] = []
  const [eX, eY] = translateOf(fr.features.transform)
  for (const s of ['L', 'R'] as const) {
    const g = fr[`eye${s}`].transform
    const [cx, cy] = translateOf(g)
    const open = Number(/scale\(1,([-\d.]+)\)/.exec(g)?.[1] ?? 1)
    const [ax, ay, c1x, c1y, c2x, c2y, bx, by] = nums(fr[`eye${s}Path`].d)
    const t = Number(fr[`eye${s}Path`]['stroke-width'])
    for (const [x, y] of bez([ax, ay], [c1x, c1y], [c2x, c2y], [bx, by], 10)) {
      out.push({ x: cx + x + eX, y: cy + y * open + eY, r: t / 2, what: `eye${s}` })
    }
  }
  // mouth: two cubic curves in mouth space, rotated then translated
  const [mx, my] = translateOf(fr.mouth.transform)
  const rot = (Number(/rotate\(([-\d.]+)\)/.exec(fr.mouth.transform)?.[1] ?? 0) * Math.PI) / 180
  const n = nums(fr.mouthPath.d)
  const mt = Number(fr.mouthPath['stroke-width'])
  const P = (i: number): Pt => [n[i], n[i + 1]]
  for (const [x, y] of [...bez(P(0), P(2), P(4), P(6), 8), ...bez(P(6), P(8), P(10), P(12), 8)]) {
    out.push({ x: mx + x * Math.cos(rot) - y * Math.sin(rot), y: my + x * Math.sin(rot) + y * Math.cos(rot), r: mt / 2, what: 'mouth' })
  }
  if (opts.brows && Number(fr.brows.opacity) > 0.01) {
    for (const b of ['browL', 'browR']) {
      const [x0, y0, qx, qy, x1, y1] = nums(fr[b].d)
      for (let i = 0; i <= 6; i++) {
        const t = i / 6, u = 1 - t
        out.push({ x: u * u * x0 + 2 * u * t * qx + t * t * x1 + eX, y: u * u * y0 + 2 * u * t * qy + t * t * y1 + eY, r: ch.browWidth / 2, what: b })
      }
    }
  }
  return out
}

/** Blush ellipses (face space) as discs along their outline. */
export function blushDiscs(fr: Frame, ch: Character): Disc[] {
  if (Number(fr.blush.opacity) < 0.01) return []
  const out: Disc[] = []
  for (const [part, c] of [['blushL', ch.cheekL], ['blushR', ch.cheekR]] as const) {
    const rx = Number(fr[part].rx), ry = Number(fr[part].ry)
    for (let a = 0; a < 360; a += 30) {
      const r = (a * Math.PI) / 180
      out.push({ x: c.cx + Math.cos(r) * rx, y: c.cy + Math.sin(r) * ry, r: 0, what: part })
    }
  }
  return out
}

/** Tear drops, pools and stream end points (features space → plate space). */
export function tearDiscs(fr: Frame): Disc[] {
  const out: Disc[] = []
  const [tx, ty] = translateOf(fr.tears.transform)
  for (const n of ['poolL', 'poolR', 'dropL', 'dropR']) {
    if (Number(fr[n].opacity) < 0.05) continue
    const m = /translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+)\)/.exec(fr[n].transform)!
    const x = Number(m[1]) + tx, y = Number(m[2]) + ty, s = Number(m[3])
    out.push({ x, y: y + 10 * s, r: 22 * s, what: n }, { x, y: y - 30 * s, r: 4 * s, what: n })
  }
  for (const n of ['streamL', 'streamR']) {
    if (Number(fr[n].opacity) < 0.05) continue
    const v = nums(fr[n].d)
    for (const [x, y] of bez([v[0], v[1]], [v[2], v[3]], [v[4], v[5]], [v[6], v[7]], 8)) out.push({ x: x + tx, y: y + ty, r: 10, what: n })
  }
  return out
}

/** Pose at time t of an emotion (entry + loop), with an external gaze pulling like the engine does. */
export function sampledPose(e: EmotionDef, k: number, t: number, gx: number, gy: number): Pose {
  const p = { ...targetPose(e.id, k) }
  addDelta(p, e.enter?.sample(t), motionAmp(k))
  addDelta(p, e.loop?.(t), motionAmp(k))
  p.lookX = Math.max(-1, Math.min(1, p.lookX + (gx - p.lookX) * e.gazeFollow + 0.3 * e.drift))
  p.lookY = Math.max(-1, Math.min(1, p.lookY + (gy - p.lookY) * e.gazeFollow + 0.16 * e.drift))
  return p
}

export const GAZES = [[0, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]] as const

/**
 * Every feature disc that leaves the visible plate (plate ∩ shell when the
 * plate is clipped by the shell), over emotions × intensities × time × gaze.
 */
export function plateViolations(ch: Character, opts: { step?: number; tMax?: number; emotions?: readonly EmotionDef[] } = {}) {
  const bad: string[] = []
  const frameOpts = { small: false, brows: true, shadow: true, minStroke: 0, character: ch }
  const step = opts.step ?? 0.2
  const rotW = ch.faceRotate
  const toWorld = (x: number, y: number): Pt => {
    if (!rotW) return [x, y]
    const r = (rotW.deg * Math.PI) / 180
    const dx = x - rotW.cx, dy = y - rotW.cy
    return [rotW.cx + dx * Math.cos(r) - dy * Math.sin(r), rotW.cy + dx * Math.sin(r) + dy * Math.cos(r)]
  }
  for (const e of opts.emotions ?? EMOTION_LIST) {
    for (const k of [0, 0.5, 1]) {
      for (let t = 0; t < (opts.tMax ?? 7); t += step) {
        for (const [gx, gy] of GAZES) {
          const fr = framePose(sampledPose(e, k, t, gx, gy), FX_STATIC, frameOpts)
          const [fX, fY] = translateOf(fr.face.transform)
          const discs = [...featureDiscs(fr, ch, { brows: true }), ...blushDiscs(fr, ch)]
          for (const d of discs) {
            const m = Math.max(0, d.r - 2)
            let ok = discInside(d.x, d.y, m, ch.face.poly)
            if (ok && ch.faceClip) {
              const [wx, wy] = toWorld(d.x + fX, d.y + fY)
              ok = discInside(wx, wy, m, ch.shell.poly)
            }
            if (!ok) bad.push(`${e.id} k=${k} t=${t.toFixed(1)} g=${gx},${gy} ${d.what} @${d.x.toFixed(0)},${d.y.toFixed(0)}`)
          }
        }
      }
    }
  }
  return bad
}

/** Tear shapes over the whole drop cycle for the sad emotions. */
export function tearViolations(ch: Character) {
  const bad: string[] = []
  const frameOpts = { small: false, brows: true, shadow: true, minStroke: 0, character: ch }
  for (const id of ['aggrieved', 'cry', 'sob'] as const) {
    for (const [gx, gy] of GAZES) {
      const p = { ...targetPose(id, 1), lookX: gx, lookY: gy }
      for (let ph = 0; ph < 1; ph += 0.05) {
        const fr = framePose(p, { ...FX_STATIC, dropL: ph, dropR: (ph + 0.5) % 1 }, frameOpts)
        for (const d of tearDiscs(fr)) {
          if (!discInside(d.x, d.y, Math.max(0, d.r - 3), ch.face.poly)) bad.push(`${id} ph=${ph.toFixed(2)} g=${gx},${gy} ${d.what} @${d.x.toFixed(0)},${d.y.toFixed(0)}`)
        }
      }
    }
  }
  return bad
}

/* ---------------- status shapes: in frame, off the plate ---------------- */

const TASK = ['working', 'needs-input', 'success'] as const
const rad = (d: number) => (d * Math.PI) / 180

export function faceWorld(ch: Character): readonly Pt[] {
  if (!ch.faceRotate) return ch.face.poly
  const r = ch.faceRotate
  return buildShape(rotateShape({ type: 'poly', pts: ch.face.poly.map(([x, y]) => [x, y] as [number, number]) }, r.deg, r.cx, r.cy)).poly
}

/** Sample discs (shell space) covering what a status draws. */
function statusDiscs(ch: Character, s: (typeof TASK)[number], pose: ReturnType<typeof targetPose>, fx: typeof FX_STATIC, small: boolean) {
  const p = rigPose(pose, ch, undefined, small)
  const c = dotCentre(p, fx, ch)
  const kd = ch.k.dot
  const out: Array<[number, number, number]> = []
  if (s === 'working' && fx.gauge > 0) {
    const g = small ? ch.signal.gauge.small : ch.signal.gauge.full
    const r = gaugeRadius(p, small, ch)
    const { from, to } = ch.signal.gauge
    for (let i = 0; i <= 40; i++) {
      const a = rad(from + ((to - from) * i) / 40)
      // companions draw a white keyline (+8 units each side) under the ring at small sizes
      out.push([c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, (g.width * kd) / 2 + (small && ch.rig ? 8 * kd : 0)])
    }
  }
  if (s === 'needs-input' && fx.bubble > 0) {
    const b = small ? ch.signal.bubble.small : ch.signal.bubble.full
    const tip = bubbleTip(p, fx, ch, small)
    const k = Math.max(0, fx.bubbleS)
    const sc = (x: number, y: number): [number, number, number] => [tip.x + (x - tip.x) * k, tip.y + (y - tip.y) * k, b.stroke / 2]
    for (let i = 0; i <= 8; i++) {
      const t = i / 8
      out.push(sc(b.x + b.w * t, b.y), sc(b.x + b.w * t, b.y + b.h), sc(b.x, b.y + b.h * t), sc(b.x + b.w, b.y + b.h * t))
    }
    out.push(sc(tip.x, tip.y))
  }
  if (s === 'success' && fx.check > 0) {
    const r = ch.dot.r * p.dotS * dotScale(fx, small, ch)
    const sh = badgeShift(p, fx, small, ch)
    const cx = c.x + sh * ch.signal.badgeDir[0], cy = c.y + sh * ch.signal.badgeDir[1]
    for (let a = 0; a < 360; a += 20) out.push([cx + Math.cos(rad(a)) * r, cy + Math.sin(rad(a)) * r, 0])
  }
  return out
}

function toView(ch: Character, p: ReturnType<typeof targetPose>, x: number, y: number) {
  const q = rigPose(p, ch)
  const r = (q.rot * Math.PI) / 180
  const P = ch.pivot
  const dx = (x - P.x) * q.sx, dy = (y - P.y) * q.sy
  return { x: P.x + dx * Math.cos(r) - dy * Math.sin(r) + q.tx, y: P.y + dx * Math.sin(r) + dy * Math.cos(r) + q.ty }
}


/** Status shapes that touch the plate or leave the frame, every emotion × size × animated frame. */
export function statusViolations(ch: Character) {
  const bad: string[] = []
  const plate = faceWorld(ch)
  for (const size of [24, 32, 96, 240]) {
    for (const e of EMOTION_IDS) {
      for (const s of TASK) {
        const cfg = resolveConfig({ character: ch, emotion: e, status: s, size, intensity: 0.8 }, true)
        const pose = targetPose(e, 0.8)
        const vb = CANVAS.viewBox[cfg.framing]
        const q = rigPose(pose, ch, undefined, cfg.frame.small)
        const dotTopView = toView(ch, pose, ch.dot.cx + q.dotX, ch.dot.cy + q.dotY - ch.dot.r * q.dotS).y
        const fxs = [staticFx(cfg)]
        for (let t = 0; t <= 3; t += 1 / 20) fxs.push({ ...FX_STATIC, ...STATUSES[s].still, ...STATUSES[s].live!(t, true) })
        for (const fx of fxs) {
          for (const [x, y, hw] of statusDiscs(ch, s, pose, fx, cfg.frame.small)) {
            // the approved Jojo rule: shapes stay off the plate at rest
            if (!discOutside(x, y, hw + 1, plate)) bad.push(`${e}/${s}/${size} touches plate`)
            const v = toView(ch, pose, x, y)
            const topAllow = Math.min(vb.y, dotTopView) - 0.5
            if (v.x - hw < vb.x - 0.5 || v.x + hw > vb.x + vb.w + 0.5 || v.y + hw > vb.y + vb.h + 0.5 || v.y - hw < topAllow) {
              bad.push(`${e}/${s}/${size} out of frame${process.env.GEO_DEBUG ? ` @${v.x.toFixed(0)},${v.y.toFixed(0)} hw${hw.toFixed(0)} fx${fx.bubbleS?.toFixed(2)}` : ""}`)
            }
          }
        }
      }
    }
  }
  return [...new Set(bad)]
}

export { pointInPoly }
