import { VIEWBOX } from '../library/geometry'
import type { Character } from '../library'

/**
 * One centring rule for every static avatar, on the site and in the private
 * standard files (scripts/avatar-standard.tsx):
 *
 *   the subject — shell ∪ face plate ∪ signal dot, never the drop shadow — has
 *   its bounding-box centre on the frame centre, and its farthest point
 *   SAFE_R / SIZE × the frame width from it (inside a circular crop).
 *
 * The library's own viewBoxes are not centred on the subject on purpose (they
 * leave room down-right for the shadow and for motion), so the site places the
 * library's SVG inside a square box with a constant, per-character offset and
 * scale. It is computed once from the rest geometry and never per frame, so
 * emotions and status motion move exactly as the library draws them.
 */
export const SIZE = 1024
export const SAFE_R = 470

type Pt = readonly [number, number]

/** Subject box, centre and farthest-point radius, in shared-canvas units. */
export function subjectGeometry(ch: Character) {
  const pts: Pt[] = [...ch.shell.poly]
  if (!ch.faceClip) {
    const r = ch.faceRotate
    for (const [x, y] of ch.face.poly) {
      if (!r) pts.push([x, y])
      else {
        const a = (r.deg * Math.PI) / 180, dx = x - r.cx, dy = y - r.cy
        pts.push([r.cx + dx * Math.cos(a) - dy * Math.sin(a), r.cy + dx * Math.sin(a) + dy * Math.cos(a)])
      }
    }
  }
  const d = ch.dot
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
  const box = {
    x0: Math.min(...xs, d.cx - d.r),
    y0: Math.min(...ys, d.cy - d.r),
    x1: Math.max(...xs, d.cx + d.r),
    y1: Math.max(...ys, d.cy + d.r),
  }
  const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2
  const radius = Math.max(...pts.map(([x, y]) => Math.hypot(x - cx, y - cy)), Math.hypot(d.cx - cx, d.cy - cy) + d.r)
  return { box, cx, cy, radius }
}

const cache = new Map<string, { left: number; top: number; width: number }>()

/**
 * Where the library's `full`-framed SVG goes inside a square box so the subject
 * is centred and sized by the rule above — as percentages of the box.
 * `fill` < 1 leaves extra room (e.g. for a status badge or a big poke).
 */
export function framePlacement(ch: Character, fill = 1) {
  const key = `${ch.id}:${fill}`
  const hit = cache.get(key)
  if (hit) return hit
  const vb = VIEWBOX.full
  const g = subjectGeometry(ch)
  // box width = 1; the SVG's width w maps vb.w units, so units → box = w / vb.w
  const w = ((SAFE_R / SIZE) * fill * vb.w) / g.radius
  const u = w / vb.w
  const out = {
    width: w * 100,
    left: (0.5 - (g.cx - vb.x) * u) * 100,
    top: (0.5 - (g.cy - vb.y) * u) * 100,
  }
  cache.set(key, out)
  return out
}

/**
 * For an avatar drawn at a fixed pixel size (the play stage, the status trio):
 * the constant translate, in % of the SVG's own size, that puts the subject's
 * rest-pose centre on the SVG's centre. Framing follows the library's own rule
 * (`tight` at ≤ 64 px).
 */
export function centreShift(ch: Character, px: number) {
  const vb = px <= 64 ? VIEWBOX.tight : VIEWBOX.full
  const g = subjectGeometry(ch)
  return {
    x: ((vb.x + vb.w / 2 - g.cx) / vb.w) * 100,
    y: ((vb.y + vb.h / 2 - g.cy) / vb.h) * 100,
  }
}
