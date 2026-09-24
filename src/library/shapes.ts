/**
 * Parametric vector shapes for character masters.
 *
 * Every shell / face plate in the family is described by a small, JSON-able
 * descriptor (a rounded polygon with per-vertex radii, optional circular
 * notches with filleted shoulders, or a circle) instead of traced paths. The
 * builder turns a descriptor into
 *   - `d`: one clean clockwise SVG outline (lines + arcs), and
 *   - `poly`: a flattened outline used by geometry tests (containment,
 *     clearance) and the identity checks.
 *
 * Coordinates are y-down screen space. Polygons are listed clockwise on
 * screen (top edge left → right).
 */

export type Pt = readonly [number, number]

/** A circular bite taken out of one straight edge, with rounded shoulders. */
export interface NotchDesc {
  cx: number
  cy: number
  r: number
  /** shoulder fillet radius */
  fillet: number
}

export interface PolyDesc {
  type: 'poly'
  /** vertices [x, y, cornerRadius?], clockwise on screen */
  pts: ReadonlyArray<readonly [number, number, number?]>
  notches?: readonly NotchDesc[]
}

export interface RectDesc {
  type: 'rect'
  x: number
  y: number
  w: number
  h: number
  /** one radius or [topLeft, topRight, bottomRight, bottomLeft] */
  r: number | readonly [number, number, number, number]
  notches?: readonly NotchDesc[]
}

export interface CircleDesc {
  type: 'circle'
  cx: number
  cy: number
  r: number
}

/** Pre-authored outline (only Jojo, whose approved path is frozen). `approx` feeds the geometry tests. */
export interface PathDesc {
  type: 'path'
  d: string
  approx: Exclude<ShapeDesc, PathDesc>
}

export type ShapeDesc = PolyDesc | RectDesc | CircleDesc | PathDesc

export interface Built {
  d: string
  /** flattened outline, clockwise */
  poly: Pt[]
  box: { x0: number; y0: number; x1: number; y1: number }
}

const f = (n: number) => (Math.abs(n) < 1e-4 ? '0' : String(Math.round(n * 100) / 100))

type Seg =
  | { k: 'L'; a: Pt; b: Pt }
  | { k: 'A'; a: Pt; b: Pt; r: number; c: Pt; sweep: 0 | 1; large: 0 | 1 }

const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]]
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]
const mul = (a: Pt, s: number): Pt => [a[0] * s, a[1] * s]
const len = (a: Pt) => Math.hypot(a[0], a[1])
const norm = (a: Pt): Pt => {
  const l = len(a) || 1
  return [a[0] / l, a[1] / l]
}
const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1]
const cross = (a: Pt, b: Pt) => a[0] * b[1] - a[1] * b[0]

/** Arc angle travelled from a to b around c, in the sweep direction (screen: 1 = clockwise). */
function arcSpan(c: Pt, a: Pt, b: Pt, sweep: 0 | 1) {
  const a0 = Math.atan2(a[1] - c[1], a[0] - c[0])
  const a1 = Math.atan2(b[1] - c[1], b[0] - c[0])
  let d = sweep ? a1 - a0 : a0 - a1
  while (d < 0) d += Math.PI * 2
  while (d >= Math.PI * 2) d -= Math.PI * 2
  return d
}

function arcSeg(a: Pt, b: Pt, c: Pt, r: number, sweep: 0 | 1): Seg {
  const span = arcSpan(c, a, b, sweep)
  return { k: 'A', a, b, r, c, sweep, large: span > Math.PI ? 1 : 0 }
}

function roundedPolygon(pts: PolyDesc['pts']): Seg[] {
  const n = pts.length
  const P = pts.map((p) => [p[0], p[1]] as Pt)
  const corners: Array<{ a: Pt; b: Pt; c?: Pt; r: number; sweep: 0 | 1 }> = []
  for (let i = 0; i < n; i++) {
    const prev = P[(i - 1 + n) % n]
    const cur = P[i]
    const next = P[(i + 1) % n]
    const u = norm(sub(cur, prev))
    const v = norm(sub(next, cur))
    let r = pts[i][2] ?? 0
    const cosT = Math.max(-1, Math.min(1, dot(mul(u, -1), v)))
    const theta = Math.acos(cosT) // interior wedge angle
    if (r <= 0 || theta < 1e-3 || Math.PI - theta < 1e-3) {
      corners.push({ a: cur, b: cur, r: 0, sweep: 1 })
      continue
    }
    let t = r / Math.tan(theta / 2)
    const lim = Math.min(len(sub(cur, prev)), len(sub(next, cur))) / 2
    if (t > lim) {
      t = lim
      r = t * Math.tan(theta / 2)
    }
    const a = sub(cur, mul(u, t))
    const b = add(cur, mul(v, t))
    const bis = norm(sub(v, u))
    const c = add(cur, mul(bis, r / Math.sin(theta / 2)))
    corners.push({ a, b, c, r, sweep: cross(u, v) > 0 ? 1 : 0 })
  }
  const segs: Seg[] = []
  for (let i = 0; i < n; i++) {
    const k = corners[i]
    if (k.r > 0 && k.c) segs.push(arcSeg(k.a, k.b, k.c, k.r, k.sweep))
    const nx = corners[(i + 1) % n]
    if (len(sub(nx.a, k.b)) > 1e-6) segs.push({ k: 'L', a: k.b, b: nx.a })
  }
  return segs
}

/* ---------- notch: subtract a circle from the outline, with filleted shoulders ---------- */

interface Hit {
  seg: number
  p: Pt
  /** position along the outline (segment index + fraction) for ordering */
  at: number
}

function circleCircle(c0: Pt, r0: number, c1: Pt, r1: number): Pt[] {
  const d = len(sub(c1, c0))
  if (d < 1e-9 || d > r0 + r1 || d < Math.abs(r0 - r1)) return []
  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, r0 * r0 - a * a))
  const e = norm(sub(c1, c0))
  const m = add(c0, mul(e, a))
  const nrm: Pt = [-e[1], e[0]]
  return h < 1e-9 ? [m] : [add(m, mul(nrm, h)), add(m, mul(nrm, -h))]
}

/** Fraction 0..1 of a point along an arc segment, or -1 when it is not on the arc's span. */
function arcFrac(s: Extract<Seg, { k: 'A' }>, q: Pt) {
  const span = arcSpan(s.c, s.a, s.b, s.sweep)
  const part = arcSpan(s.c, s.a, q, s.sweep)
  return part <= span + 1e-9 ? part / Math.max(span, 1e-9) : -1
}

function hitsOf(segs: Seg[], C: Pt, R: number): Hit[] {
  const out: Hit[] = []
  segs.forEach((s, i) => {
    if (s.k === 'L') {
      const d = sub(s.b, s.a)
      const L = len(d)
      const e = mul(d, 1 / L)
      const w = sub(s.a, C)
      const b = dot(w, e)
      const c = dot(w, w) - R * R
      const disc = b * b - c
      if (disc < 0) return
      for (const t of [-b - Math.sqrt(disc), -b + Math.sqrt(disc)]) {
        if (t > 1e-9 && t < L - 1e-9) out.push({ seg: i, p: add(s.a, mul(e, t)), at: i + t / L })
      }
    } else {
      for (const q of circleCircle(s.c, s.r, C, R)) {
        const fr = arcFrac(s, q)
        if (fr > 1e-9 && fr < 1 - 1e-9) out.push({ seg: i, p: q, at: i + fr })
      }
    }
  })
  return out.sort((a, b) => a.at - b.at)
}

/** Centre of a fillet of radius rf that touches segment `s` (inside the material) and sits outside circle (C, R). */
function filletCentre(s: Seg, C: Pt, R: number, rf: number, near: Pt): Pt {
  let cands: Pt[] = []
  if (s.k === 'L') {
    const e = norm(sub(s.b, s.a))
    const nrm: Pt = [-e[1], e[0]]
    const base = add(s.a, mul(nrm, rf))
    const w = sub(base, C)
    const b = dot(w, e)
    const c = dot(w, w) - (R + rf) ** 2
    const disc = b * b - c
    if (disc >= 0) cands = [-b - Math.sqrt(disc), -b + Math.sqrt(disc)].map((t) => add(base, mul(e, t)))
  } else {
    // convex arc (material inside the arc's circle) vs concave arc
    const rr = s.sweep === 1 ? s.r - rf : s.r + rf
    cands = circleCircle(s.c, rr, C, R + rf)
  }
  if (!cands.length) throw new Error(`notch fillet r${f(rf)} does not fit`)
  return cands.sort((a, b) => len(sub(a, near)) - len(sub(b, near)))[0]
}

/** Is point q (already on the segment's line / circle) within the segment's extent? */
function onSeg(s: Seg, q: Pt) {
  if (s.k === 'L') {
    const d = sub(s.b, s.a)
    const t = dot(sub(q, s.a), d) / dot(d, d)
    return t >= -1e-6 && t <= 1 + 1e-6
  }
  return arcFrac(s, q) >= 0
}

/** Foot point of a fillet centre on segment `s`. */
function footOn(s: Seg, F: Pt): Pt {
  if (s.k === 'L') {
    const e = norm(sub(s.b, s.a))
    return add(s.a, mul(e, dot(sub(F, s.a), e)))
  }
  return add(s.c, mul(norm(sub(F, s.c)), s.r))
}

/** Replace the part of `s` after (or before) point q. */
function cutSeg(s: Seg, q: Pt, keep: 'head' | 'tail'): Seg | null {
  const a = keep === 'head' ? s.a : q
  const b = keep === 'head' ? q : s.b
  if (len(sub(b, a)) < 1e-6) return null
  return s.k === 'L' ? { k: 'L', a, b } : arcSeg(a, b, s.c, s.r, s.sweep)
}

/** Subtract a circular notch from the outline, rounding both shoulders. */
function applyNotch(segs: Seg[], nt: NotchDesc): Seg[] {
  const C: Pt = [nt.cx, nt.cy]
  const R = nt.r
  // start the walk outside the notch so entry comes before exit
  const startIn = len(sub(segs[0].a, C)) < R
  if (startIn) {
    const k = segs.findIndex((q) => len(sub(q.a, C)) > R + 1)
    segs = [...segs.slice(k), ...segs.slice(0, k)]
  }
  const hits = hitsOf(segs, C, R)
  if (hits.length !== 2) {
    throw new Error(`notch at ${f(nt.cx)},${f(nt.cy)} r${f(R)} must cross the outline exactly twice (got ${hits.length})`)
  }
  const [h0, h1] = hits
  const rf = nt.fillet
  // a shoulder fillet may land beyond the segment the cut crosses (e.g. just past
  // the end of a corner arc): then it belongs on the neighbouring segment
  const solve = (i: number, near: Pt, step: 1 | -1) => {
    for (let k = 0; k < 3; k++) {
      const j = i + step * k
      if (j < 0 || j >= segs.length) break
      try {
        const F = filletCentre(segs[j], C, R, rf, near)
        const P = footOn(segs[j], F)
        if (onSeg(segs[j], P)) return { seg: j, F, P }
      } catch {
        /* no fillet against this segment; try the next one */
      }
    }
    const F = filletCentre(segs[i], C, R, rf, near)
    return { seg: i, F, P: footOn(segs[i], F) }
  }
  const a0 = solve(h0.seg, h0.p, -1)
  const a1 = solve(h1.seg, h1.p, 1)
  const F0 = a0.F, F1 = a1.F, P0 = a0.P, P1 = a1.P
  h0.seg = a0.seg
  h1.seg = a1.seg
  const T0 = add(C, mul(sub(F0, C), R / (R + rf)))
  const T1 = add(C, mul(sub(F1, C), R / (R + rf)))
  const out: Seg[] = segs.slice(0, h0.seg)
  const head = cutSeg(segs[h0.seg], P0, 'head')
  if (head) out.push(head)
  if (rf > 0) out.push(arcSeg(P0, T0, F0, rf, 1))
  out.push(arcSeg(rf > 0 ? T0 : P0, rf > 0 ? T1 : P1, C, R, 0))
  if (rf > 0) out.push(arcSeg(T1, P1, F1, rf, 1))
  const tail = cutSeg(segs[h1.seg], P1, 'tail')
  if (tail) out.push(tail)
  out.push(...segs.slice(h1.seg + 1))
  return out
}

function segsToD(segs: Seg[]) {
  let d = `M${f(segs[0].a[0])},${f(segs[0].a[1])}`
  for (const s of segs) {
    if (s.k === 'L') d += ` L${f(s.b[0])},${f(s.b[1])}`
    else d += ` A${f(s.r)},${f(s.r)} 0 ${s.large} ${s.sweep} ${f(s.b[0])},${f(s.b[1])}`
  }
  return d + ' Z'
}

function flatten(segs: Seg[], step = Math.PI / 36): Pt[] {
  const out: Pt[] = []
  for (const s of segs) {
    out.push(s.a)
    if (s.k === 'A') {
      const span = arcSpan(s.c, s.a, s.b, s.sweep)
      const a0 = Math.atan2(s.a[1] - s.c[1], s.a[0] - s.c[0])
      const n = Math.max(1, Math.ceil(span / step))
      for (let i = 1; i < n; i++) {
        const t = a0 + (s.sweep ? 1 : -1) * (span * i) / n
        out.push([s.c[0] + s.r * Math.cos(t), s.c[1] + s.r * Math.sin(t)])
      }
    }
  }
  return out
}

function boxOf(poly: Pt[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const [x, y] of poly) {
    if (x < x0) x0 = x
    if (y < y0) y0 = y
    if (x > x1) x1 = x
    if (y > y1) y1 = y
  }
  return { x0, y0, x1, y1 }
}

export function rectToPoly(r: RectDesc): PolyDesc {
  const rr = typeof r.r === 'number' ? [r.r, r.r, r.r, r.r] : r.r
  return {
    type: 'poly',
    pts: [
      [r.x, r.y, rr[0]],
      [r.x + r.w, r.y, rr[1]],
      [r.x + r.w, r.y + r.h, rr[2]],
      [r.x, r.y + r.h, rr[3]],
    ],
    notches: r.notches,
  }
}

export function buildShape(desc: ShapeDesc): Built {
  if (desc.type === 'path') {
    const approx = buildShape(desc.approx)
    return { d: desc.d, poly: approx.poly, box: approx.box }
  }
  if (desc.type === 'circle') {
    const { cx, cy, r } = desc
    const segs: Seg[] = [
      arcSeg([cx - r, cy], [cx + r, cy], [cx, cy], r, 1),
      arcSeg([cx + r, cy], [cx - r, cy], [cx, cy], r, 1),
    ]
    const poly = flatten(segs)
    return {
      d: `M${f(cx - r)},${f(cy)} A${f(r)},${f(r)} 0 1 1 ${f(cx + r)},${f(cy)} A${f(r)},${f(r)} 0 1 1 ${f(cx - r)},${f(cy)} Z`,
      poly,
      box: { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r },
    }
  }
  const poly = desc.type === 'rect' ? rectToPoly(desc) : desc
  let segs = roundedPolygon(poly.pts)
  for (const nt of poly.notches ?? []) segs = applyNotch(segs, nt)
  const flat = flatten(segs)
  return { d: segsToD(segs), poly: flat, box: boxOf(flat) }
}

/* ---------------- descriptor transforms ---------------- */

export interface Affine {
  s: number
  tx: number
  ty: number
}

const tp = (p: readonly [number, number, number?], a: Affine) =>
  [p[0] * a.s + a.tx, p[1] * a.s + a.ty, p[2] === undefined ? undefined : p[2] * a.s] as [number, number, number?]

/** Uniform scale + translate of a descriptor (source px → shared canvas). */
export function transformShape(desc: ShapeDesc, a: Affine): ShapeDesc {
  const nts = (n?: readonly NotchDesc[]) =>
    n?.map((q) => ({ cx: q.cx * a.s + a.tx, cy: q.cy * a.s + a.ty, r: q.r * a.s, fillet: q.fillet * a.s }))
  switch (desc.type) {
    case 'circle':
      return { type: 'circle', cx: desc.cx * a.s + a.tx, cy: desc.cy * a.s + a.ty, r: desc.r * a.s }
    case 'rect': {
      const r = typeof desc.r === 'number' ? desc.r * a.s : (desc.r.map((v) => v * a.s) as unknown as RectDesc['r'])
      return { type: 'rect', x: desc.x * a.s + a.tx, y: desc.y * a.s + a.ty, w: desc.w * a.s, h: desc.h * a.s, r, notches: nts(desc.notches) }
    }
    case 'poly':
      return { type: 'poly', pts: desc.pts.map((p) => tp(p, a)), notches: nts(desc.notches) }
    case 'path':
      if (a.s !== 1 || a.tx !== 0 || a.ty !== 0) throw new Error('path descriptors cannot be transformed')
      return desc
  }
}

/** Rotate a polygon/rect descriptor about (cx, cy) by `deg` (screen clockwise). */
export function rotateShape(desc: RectDesc | PolyDesc, deg: number, cx: number, cy: number): PolyDesc {
  const p = desc.type === 'rect' ? rectToPoly(desc) : desc
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r), s = Math.sin(r)
  const rot = (x: number, y: number): [number, number] => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]
  return {
    type: 'poly',
    pts: p.pts.map((q) => [...rot(q[0], q[1]), q[2]] as [number, number, number?]),
    notches: p.notches?.map((n) => {
      const [x, y] = rot(n.cx, n.cy)
      return { ...n, cx: x, cy: y }
    }),
  }
}

/* ---------------- geometry queries (tests, identity tools) ---------------- */

export function pointInPoly(x: number, y: number, poly: readonly Pt[]) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Distance from a point to the outline. */
export function distToPoly(x: number, y: number, poly: readonly Pt[]) {
  let best = Infinity
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j], b = poly[i]
    const abx = b[0] - a[0], aby = b[1] - a[1]
    const t = Math.max(0, Math.min(1, ((x - a[0]) * abx + (y - a[1]) * aby) / (abx * abx + aby * aby || 1)))
    const d = Math.hypot(x - (a[0] + abx * t), y - (a[1] + aby * t))
    if (d < best) best = d
  }
  return best
}

/** True when a disc of radius `m` around the point lies inside the outline. */
export function discInside(x: number, y: number, m: number, poly: readonly Pt[]) {
  return pointInPoly(x, y, poly) && distToPoly(x, y, poly) >= m
}

/** True when a disc of radius `m` around the point lies fully outside the outline. */
export function discOutside(x: number, y: number, m: number, poly: readonly Pt[]) {
  return !pointInPoly(x, y, poly) && distToPoly(x, y, poly) >= m
}
