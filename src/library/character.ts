/**
 * Character model.
 *
 * A character is data: an authored `CharacterSpec` (measured in its own
 * source-image pixels, JSON-able) is normalised by `buildCharacter` into a
 * `Character` that lives on the shared 1254-unit canvas Jojo was drawn on.
 * Every character shares one pose / emotion / status protocol; what differs is
 * the rig that maps the shared pose onto *its* shell, plate, eyes, mouth and
 * notch.
 *
 * Pose units are "Jojo units" (see pose.ts). `rigPose` converts a pose into
 * the character's own units; for Jojo the rig is the identity, so Jojo's
 * output is byte-for-byte the approved one.
 */
import { SOLVED } from './characters/solved.generated'
import { EMOTION_LIST } from './emotions'
import {
  buildShape, discInside, discOutside, pointInPoly, rotateShape, transformShape,
  type Affine, type Built, type Pt, type ShapeDesc,
} from './shapes'

/* ------------------------------------------------------------------ */
/* Authoring schema (source pixels)                                     */
/* ------------------------------------------------------------------ */

/** A capsule eye: `w` = stroke thickness, `h` = full length including caps, `rot` = long axis from vertical (deg, + = top leans right). */
export interface EyeDesc {
  cx: number
  cy: number
  w: number
  h: number
  rot?: number
}

/** Mouth capsule at rest; `w === h` is a round dot mouth. `rot`: tilt in the world (deg, + = clockwise), default level. */
export interface MouthDesc {
  cx: number
  cy: number
  w: number
  h: number
  rot?: number
}

export interface PaletteDesc {
  shell: string
  face: string
  /** eyes, mouth, brows */
  ink: string
  dot: string
  /** mouth colour when it differs from the eyes (default: ink) */
  mouth?: string
  /** optional overrides; lift/deep default to ±4% lightness of the base */
  shellLift?: string
  shellDeep?: string
  faceLift?: string
  faceDeep?: string
  dotLift?: string
  shine?: string
  blush?: string
  tear?: string
  tearLift?: string
  tongue?: string
  /** working gauge track (drawn on the shell near the notch) */
  track?: string
  trackOpacity?: number
  /** the "!" of error, the check of success */
  mark?: string
}

export type TailSide = 'left' | 'right' | 'down'

export interface BubbleDesc {
  x: number
  y: number
  w: number
  h: number
  tail: TailSide
}

export interface CharacterSpec {
  /** stable machine id — never changes when the display name does */
  id: string
  /** catalogue number 1..26 */
  no: number
  name: { en: string; zh: string }
  /** one light, fictional line — not a job title, not a real capability */
  persona: { en: string; zh: string }
  source: {
    /** path inside reference/ */
    file: string
    sha256: string
    batch: 'hero' | 'h-family' | 'options-20'
    /** position inside its batch as the source numbered it */
    index: string
    /** square size of the source image in px */
    size: number
    /** sha256 of the original file when the public copy differs (metadata stripped, pixels identical) */
    originalSha256?: string
  }
  /** what is visibly distinctive, in words (manifest + docs) */
  form: string
  /** source glitches that were deliberately cleaned while redrawing */
  cleanup?: string[]

  shell: ShapeDesc
  face: ShapeDesc
  /** clip the plate to the shell (default) or let it overhang */
  faceClip?: 'shell' | 'none'
  /** plate + features rotated about the plate's box centre (deg) */
  faceRotate?: number
  /** shadow silhouette (default: the shell) */
  silhouette?: 'shell' | 'shell+face'
  /** viewer-left then viewer-right eye (for stacked eyes: top then bottom) */
  eyes: readonly [EyeDesc, EyeDesc]
  mouth: MouthDesc
  dot: { cx: number; cy: number; r: number }
  /** direction from the notch towards open space, deg (screen: -90 = up, 180 = left, 0 = right) */
  notchDir: number
  palette: PaletteDesc

  /* ---- optional authoring hints, all in source px ---- */
  brows?: readonly [{ cx: number; cy: number; len: number }, { cx: number; cy: number; len: number }]
  cheeks?: readonly [{ cx: number; cy: number }, { cx: number; cy: number }]
  zzz?: { x: number; y: number }
  bubble?: BubbleDesc
  /** half-span of the working gauge around the inward direction, deg (default 110) */
  gaugeHalfSpan?: number
  /** tear drift direction per eye: -1 = towards viewer-left, 1 = right, 0 = straight down */
  tearDrift?: readonly [number, number]
  rig?: RigOverrides
  /** normalisation override: target box size on the shared canvas, and a nudge (canvas units, + = right / down) */
  fit?: { size?: number; dx?: number; dy?: number }
}

export interface RigOverrides {
  /** arc (happy/laugh/sob) size relative to the default, per eye or both */
  arc?: number | readonly [number, number]
  /** arc stroke relative to the default */
  arcThick?: number
  /** feature offset scale relative to default (eye/mouth/brow travel) */
  feat?: number
  /** mouth width change gain relative to default */
  mouthW?: number
  /** mouth opening (curve offsets) gain relative to default */
  mouthCurve?: number
  /** mouth stroke-thickness change gain relative to default */
  mouthThick?: number
  /** parallax/gaze travel relative to default */
  gaze?: number
}

/* ------------------------------------------------------------------ */
/* Built character (shared canvas units)                                */
/* ------------------------------------------------------------------ */

export interface Eye {
  cx: number
  cy: number
  w: number
  h: number
}

export interface Palette {
  shell: string
  shellLift: string
  shellDeep: string
  face: string
  faceLift: string
  faceDeep: string
  ink: string
  mouth: string
  dot: string
  dotLift: string
  shine: string
  blush: string
  tear: string
  tearLift: string
  tongue: string
  shadow: string
  offline: string
  track: string
  trackOpacity: number
  /** working gauge fill: the dot colour, deepened when it would read as the same grey as the shell */
  gauge: string
  bubble: string
  bubbleEdge: string
  ask: string
  check: string
  mark: string
  spark: string
  confetti: readonly [string, string, string, string]
}

export interface Bubble {
  x: number
  y: number
  w: number
  h: number
  rx: number
  stroke: number
  glyph: number
}

export interface TearLane {
  /** pool offset from the eye's centre-x / visible bottom */
  pool: Pt
  poolScale: number
  /** drop start offset (x from centre, y from bottom) and end (x offset, absolute y) */
  drop0: Pt
  drop1x: number
  drop1y: number
  dropScale: number
  /** stream: start x offset, first control (x offset, dy), second control (x offset, y), end (x offset, y) */
  s0x: number
  s1: Pt
  s2: Pt
  s3: Pt
}

export interface EyeRig {
  len0: number
  thick0: number
  rot0: number
  /** Jojo's rest length/thickness for this side (pose baseline) */
  jLen: number
  jThick: number
  arc: number
  arcThick: number
}

export interface Rig {
  body: number
  feat: number
  dot: number
  eye: readonly [EyeRig, EyeRig]
  mouth: { w0: number; t0: number; kW: number; kT: number; kC: number; rot0: number }
}

export interface Character {
  id: string
  no: number
  name: { en: string; zh: string }
  persona: { en: string; zh: string }
  source: CharacterSpec['source']
  form: string
  cleanup: readonly string[]
  spec: CharacterSpec
  /** source px → shared canvas */
  fit: Affine

  shell: Built
  face: Built
  faceClip: boolean
  faceRotate: { deg: number; cx: number; cy: number } | null
  /** shadow outline(s) */
  silhouette: string
  eyeL: Eye
  eyeR: Eye
  mouth: Eye
  dot: { cx: number; cy: number; r: number }
  browL: { cx: number; cy: number; len: number }
  browR: { cx: number; cy: number; len: number }
  browWidth: number
  cheekL: { cx: number; cy: number }
  cheekR: { cx: number; cy: number }
  pivot: { x: number; y: number }
  shadowOffset: { x: number; y: number }
  palette: Palette

  /** multipliers for the frame code; 1 for Jojo */
  k: { body: number; face: number; dot: number; eye: number; gaze: number }
  tearL: TearLane
  tearR: TearLane
  tearStroke: number
  zzz: { x: number; y: number }
  signal: {
    /** outward direction (deg) and the unit vector pointing back into the shell */
    outward: number
    inward: Pt
    /** working gauge: angular span, and ring gap/width (dot units, × dot scale) at full and small sizes */
    gauge: { from: number; to: number; full: { gap: number; width: number }; small: { gap: number; width: number } }
    /** `smallTail`: the small-size bubble may sit on another side when only that side has room */
    bubble: { full: Bubble; small: Bubble; tail: TailSide; smallTail?: TailSide }
    /** extra dot scale while the success badge shows at small sizes (Jojo 0.55) */
    checkBoostSmall: number
    /** unit vector the badge grows along: into the notch, or outwards when the plate is too close */
    badgeDir: Pt
    /** dot (and status shape) scale at small sizes, ≥ 1 (Jojo 1) */
    smallDot: number
  }
  /** null = identity (Jojo) */
  rig: Rig | null
  /** the solved placements (what scripts/gen-solved.ts caches); null for Jojo */
  solved: Solved | null
}

/* ------------------------------------------------------------------ */
/* Jojo reference numbers (pose baseline)                               */
/* ------------------------------------------------------------------ */

/** Jojo's rest features — the units every shared pose is written in. */
export const JOJO_BASE = {
  eyeL: { cx: 589, cy: 690, w: 68, h: 196 },
  eyeR: { cx: 802, cy: 680, w: 110, h: 215 },
  mouth: { cx: 804, cy: 846.5, w: 162, h: 47 },
  dotR: 53,
  face: { w: 577, h: 506 },
  shellArea: 735 * 700,
} as const

/** The shared canvas: every character is normalised into Jojo's frame. */
export const CANVAS = {
  centre: { x: 627.5, y: 601 },
  /** max width / height of shell ∪ plate ∪ dot */
  size: { w: 760, h: 714 },
  viewBox: {
    full: { x: 190, y: 160, w: 900, h: 900 },
    tight: { x: 224, y: 186, w: 800, h: 800 },
  },
} as const

/* ------------------------------------------------------------------ */
/* Colour helpers                                                       */
/* ------------------------------------------------------------------ */

function hexToRgb(h: string): [number, number, number] {
  const s = h.replace('#', '')
  const n = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex([r, g, b]: [number, number, number]) {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

/** Mix towards white (t > 0) or black (t < 0). */
export function shade(hex: string, t: number) {
  const [r, g, b] = hexToRgb(hex)
  const to = t > 0 ? 255 : 0
  const a = Math.abs(t)
  return rgbToHex([r + (to - r) * a, g + (to - g) * a, b + (to - b) * a])
}

/** Relative luminance 0..1. */
export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const FAMILY = {
  indigo: '#2d3272',
  mint: '#cff0e6',
  coral: '#fe6a4a',
  coralLift: '#ff8a6c',
  tear: '#6fb9ec',
  tearLift: '#d8f0ff',
  blush: '#ff9a86',
  shadow: '#5e4828',
  offline: '#a9a8b8',
  confetti: ['#fe6a4a', '#5fc4a6', '#2d3272', '#ffbf3c'] as const,
} as const

/** Subtle gradient ends, matched to Jojo's own (≈ ±6 levels either way). */
const lift = (c: string) => shade(c, luminance(c) < 0.2 ? 0.03 : 0.15)
const deep = (c: string) => shade(c, luminance(c) < 0.2 ? -0.08 : -0.025)

/** 0..255 greyscale value, as the small-size readability test sees it */
const grey = (hex: string) => {
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** The dot colour, deepened step by step until it separates from the shell in greyscale. */
function gaugeTone(dot: string, shell: string) {
  let c = dot
  for (let i = 0; i < 6 && Math.abs(grey(c) - grey(shell)) < 70; i++) c = shade(c, grey(shell) > grey(c) ? -0.14 : 0.14)
  return c
}

export function buildPalette(p: PaletteDesc): Palette {
  const lightInk = luminance(p.ink) > 0.45
  return {
    shell: p.shell,
    shellLift: p.shellLift ?? lift(p.shell),
    shellDeep: p.shellDeep ?? deep(p.shell),
    face: p.face,
    faceLift: p.faceLift ?? lift(p.face),
    faceDeep: p.faceDeep ?? deep(p.face),
    ink: p.ink,
    mouth: p.mouth ?? p.ink,
    dot: p.dot,
    dotLift: p.dotLift ?? shade(p.dot, 0.2),
    shine: p.shine ?? (lightInk ? '#ffffff' : '#effcf7'),
    blush: p.blush ?? FAMILY.blush,
    tear: p.tear ?? FAMILY.tear,
    tearLift: p.tearLift ?? FAMILY.tearLift,
    tongue: p.tongue ?? FAMILY.coralLift,
    shadow: FAMILY.shadow,
    offline: FAMILY.offline,
    track: p.track ?? (luminance(p.shell) < 0.2 ? FAMILY.mint : FAMILY.indigo),
    trackOpacity: p.trackOpacity ?? (luminance(p.shell) < 0.2 ? 0.4 : 0.22),
    gauge: gaugeTone(p.dot, p.shell),
    bubble: '#ffffff',
    // the bubble floats over the page, so its edge must read against paper (peach / amber dots deepen)
    bubbleEdge: gaugeTone(p.dot, '#f6f3ec'),
    ask: FAMILY.indigo,
    check: '#ffffff',
    mark: p.mark ?? '#ffffff',
    spark: p.dot,
    confetti: [p.dot, '#5fc4a6', FAMILY.indigo, '#ffbf3c'],
  }
}

/* ------------------------------------------------------------------ */
/* Solved placements (cache)                                            */
/* ------------------------------------------------------------------ */

/** Bump when the placement solvers change; stale cache entries are then ignored. */
export const SOLVER_VERSION = 7

export interface SolvedSignal {
  outwardGauge: boolean
  gauge: Character['signal']['gauge']
  bubble: Character['signal']['bubble']
  checkBoostSmall: number
  badgeDir: Pt
  smallDot: number
}

export interface Solved {
  hash: string
  browL: Character['browL']
  browR: Character['browR']
  cheekL: Character['cheekL']
  cheekR: Character['cheekR']
  signal: SolvedSignal
}

/** Stable hash of a spec + solver version (FNV-1a over canonical JSON). */
export function specHash(spec: CharacterSpec) {
  const canon = (v: unknown): string =>
    Array.isArray(v) ? `[${v.map(canon).join(',')}]`
      : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${k}:${canon((v as Record<string, unknown>)[k])}`).join(',')}}`
        : JSON.stringify(v)
  const str = `v${SOLVER_VERSION}|${canon(spec)}`
  let h = 2166136261
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619)
  return (h >>> 0).toString(16).padStart(8, '0')
}

/* ------------------------------------------------------------------ */
/* Build                                                                */
/* ------------------------------------------------------------------ */

const rad = (d: number) => (d * Math.PI) / 180

function unionBox(boxes: Array<{ x0: number; y0: number; x1: number; y1: number }>) {
  return {
    x0: Math.min(...boxes.map((b) => b.x0)),
    y0: Math.min(...boxes.map((b) => b.y0)),
    x1: Math.max(...boxes.map((b) => b.x1)),
    y1: Math.max(...boxes.map((b) => b.y1)),
  }
}

/** Lowest point of the outline straight below (x, y). */
function floorBelow(poly: readonly Pt[], x: number, y: number) {
  let best = Infinity
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xa, ya] = poly[j], [xb, yb] = poly[i]
    if ((xa - x) * (xb - x) > 0 || xa === xb) continue
    const t = (x - xa) / (xb - xa)
    const yy = ya + (yb - ya) * t
    if (yy > y && yy < best) best = yy
  }
  return best
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** `opts.solve`: ignore the cache and run every placement solver (generator, tests). */
export function buildCharacter(spec: CharacterSpec, opts: { solve?: boolean } = {}): Character {
  // --- normalise onto the shared canvas ----------------------------------
  const rawShell = buildShape(spec.shell)
  const rawFace = buildShape(spec.face)
  const dotBox = { x0: spec.dot.cx - spec.dot.r, y0: spec.dot.cy - spec.dot.r, x1: spec.dot.cx + spec.dot.r, y1: spec.dot.cy + spec.dot.r }
  const ub = unionBox(spec.faceClip === 'none' ? [rawShell.box, rawFace.box, dotBox] : [rawShell.box, dotBox])
  const bw = ub.x1 - ub.x0, bh = ub.y1 - ub.y0
  const target = spec.fit?.size ?? 1
  const s = round2(Math.min(CANVAS.size.w / bw, CANVAS.size.h / bh) * target * 1000) / 1000
  const fit: Affine = {
    s,
    tx: round2(CANVAS.centre.x + (spec.fit?.dx ?? 0) - ((ub.x0 + ub.x1) / 2) * s),
    ty: round2(CANVAS.centre.y + (spec.fit?.dy ?? 0) - ((ub.y0 + ub.y1) / 2) * s),
  }
  const X = (x: number) => x * fit.s + fit.tx
  const Y = (y: number) => y * fit.s + fit.ty
  const S = (v: number) => v * fit.s

  const shell = buildShape(transformShape(spec.shell, fit))
  const faceDesc = transformShape(spec.face, fit)
  const faceLocal = buildShape(faceDesc)
  const faceRotate = spec.faceRotate
    ? { deg: spec.faceRotate, cx: (faceLocal.box.x0 + faceLocal.box.x1) / 2, cy: (faceLocal.box.y0 + faceLocal.box.y1) / 2 }
    : null
  // the plate is authored upright; features live in plate space, so the face
  // group is rotated as a whole. `face` stays in plate space (clip + tests).
  const face = faceLocal
  const faceWorld = faceRotate && faceDesc.type !== 'circle' && faceDesc.type !== 'path'
    ? buildShape(rotateShape(faceDesc, faceRotate.deg, faceRotate.cx, faceRotate.cy))
    : faceLocal

  // features are authored in world (source) space; bring them into plate space
  const unrot = (x: number, y: number): Pt => {
    if (!faceRotate) return [x, y]
    const r = rad(-faceRotate.deg)
    const dx = x - faceRotate.cx, dy = y - faceRotate.cy
    return [faceRotate.cx + dx * Math.cos(r) - dy * Math.sin(r), faceRotate.cy + dx * Math.sin(r) + dy * Math.cos(r)]
  }
  const eyeOf = (e: EyeDesc): Eye & { rot: number } => {
    const [cx, cy] = unrot(X(e.cx), Y(e.cy))
    // spec tilt: + = top leans right (screen clockwise, like faceRotate); the
    // eye renderer measures the other way round, so convert once here
    return { cx: round2(cx), cy: round2(cy), w: round2(S(e.w)), h: round2(S(e.h)), rot: -((e.rot ?? 0) - (spec.faceRotate ?? 0)) }
  }
  const eL = eyeOf(spec.eyes[0])
  const eR = eyeOf(spec.eyes[1])
  const [mcx, mcy] = unrot(X(spec.mouth.cx), Y(spec.mouth.cy))
  const mouth = { cx: round2(mcx), cy: round2(mcy), w: round2(S(spec.mouth.w)), h: round2(S(spec.mouth.h)) }
  const dot = { cx: round2(X(spec.dot.cx)), cy: round2(Y(spec.dot.cy)), r: round2(S(spec.dot.r)) }

  // --- scales relative to Jojo -------------------------------------------
  const J = JOJO_BASE
  const fw = face.box.x1 - face.box.x0, fh = face.box.y1 - face.box.y0
  const kFace = Math.min(fw / J.face.w, fh / J.face.h)
  const sb = shell.box
  const kBody = Math.sqrt(((sb.x1 - sb.x0) * (sb.y1 - sb.y0)) / J.shellArea)
  const kDot = dot.r / J.dotR
  const size = (e: { w: number; h: number }) => Math.sqrt(e.w * e.h)
  const kEyeL = size(eL) / size(J.eyeL)
  const kEyeR = size(eR) / size(J.eyeR)
  const kEye = (kEyeL + kEyeR) / 2
  const ro = spec.rig ?? {}
  const arcOv = typeof ro.arc === 'number' ? [ro.arc, ro.arc] : ro.arc ?? [1, 1]
  // arcs follow the eye's own size but never shrink below a readable fraction of the face
  const arcK = (k: number, i: 0 | 1) => Math.max(k, 0.55 * kFace) * arcOv[i]
  const eyeRig = (e: typeof eL, j: { w: number; h: number }, k: number, i: 0 | 1): EyeRig => ({
    len0: Math.max(0.5, e.h - e.w),
    thick0: e.w,
    rot0: e.rot,
    jLen: j.h - j.w,
    jThick: j.w,
    arc: arcK(k, i),
    arcThick: arcK(k, i) * (ro.arcThick ?? 1),
  })
  const kFeat = Math.min(kFace, 1) * (ro.feat ?? 1)
  const rig: Rig = {
    body: kBody,
    feat: kFeat,
    dot: kDot,
    eye: [eyeRig(eL, J.eyeL, kEyeL, 0), eyeRig(eR, J.eyeR, kEyeR, 1)],
    mouth: {
      w0: Math.max(0, mouth.w - mouth.h),
      t0: mouth.h,
      kW: Math.max(kFace * 0.8, mouth.w / J.mouth.w) * (ro.mouthW ?? 1),
      kT: (mouth.h / J.mouth.h) * (ro.mouthThick ?? 1),
      kC: Math.max(kFace * 0.75, Math.sqrt(mouth.w * mouth.h / (J.mouth.w * J.mouth.h))) * (ro.mouthCurve ?? 1),
      // a mouth keeps its world angle on a tilted plate (like the eyes do)
      rot0: (spec.mouth.rot ?? 0) - (spec.faceRotate ?? 0),
    },
  }

  // --- clearance helpers (plate space / world space) ------------------------
  const kGaze = kFeat * (ro.gaze ?? 1)
  // how far gaze moves features inside the plate, and the plate inside the shell
  const featTravel = { x: 21 * kGaze, y: 17 * kGaze }
  const plateShift = [[0, 0], [9, 7], [-9, 7], [9, -7], [-9, -7]].map(([x, y]) => [x * kGaze, y * kGaze] as Pt)
  const toWorld = (x: number, y: number): Pt => {
    if (!faceRotate) return [x, y]
    const r = rad(faceRotate.deg)
    const dx = x - faceRotate.cx, dy = y - faceRotate.cy
    return [faceRotate.cx + dx * Math.cos(r) - dy * Math.sin(r), faceRotate.cy + dx * Math.sin(r) + dy * Math.cos(r)]
  }
  /** a disc in plate space that must stay on the visible plate, wherever gaze moves it */
  const onVisiblePlate = (x: number, y: number, m: number) => {
    if (!discInside(x, y, m, face.poly)) return false
    if (spec.faceClip === 'none') return true
    return plateShift.every(([sx, sy]) => {
      const [wx, wy] = toWorld(x + sx, y + sy)
      return discInside(wx, wy, m, shell.poly)
    })
  }
  /** a disc in shell space that must stay off the plate (at rest, like the approved Jojo rule) */
  const offPlate = (x: number, y: number, m: number) => discOutside(x, y, m, faceWorld.poly)

  // --- brows: as close to the default as the plate allows ---------------------
  const stacked = Math.abs(eL.cx - eR.cx) < Math.max(eL.w, eR.w)
  const browWidth = 20 * Math.max(0.6, Math.min(1, kFace))
  const plateCx = (face.box.x0 + face.box.x1) / 2
  const browFits = (cx: number, cy: number, len: number) => {
    for (const rot of [-26, 0, 22]) {
      for (const dy of [-30 * kFeat - 7 * kFeat, 12 * kFeat + 8 * kFeat]) {
        for (const tx of [-featTravel.x, featTravel.x]) {
          for (const ty of [-featTravel.y, featTravel.y]) {
            const r = rad(rot)
            const hx = (Math.cos(r) * len) / 2, hy = (Math.sin(r) * len) / 2
            const y0 = cy + dy + ty, x0 = cx + tx
            const pts: Pt[] = [[x0 - hx, y0 - hy], [x0 + hx, y0 + hy], [x0 + Math.sin(r) * 4 * kFace, y0 - Math.cos(r) * 4 * kFace]]
            if (!pts.every(([x, y]) => onVisiblePlate(x, y, browWidth / 2))) return false
          }
        }
      }
    }
    return true
  }
  const browFor = (e: typeof eL, i: 0 | 1) => {
    const h = spec.brows?.[i]
    if (h) {
      const [x, y] = unrot(X(h.cx), Y(h.cy))
      return { cx: round2(x), cy: round2(y), len: round2(S(h.len)) }
    }
    const extent = Math.abs(Math.sin(rad(e.rot))) * e.h + Math.abs(Math.cos(rad(e.rot))) * e.w
    const vext = Math.abs(Math.cos(rad(e.rot))) * e.h + Math.abs(Math.sin(rad(e.rot))) * e.w
    const len0 = Math.max(extent * 0.9, 48 * kFeat)
    const top = e.cy - vext / 2
    const toward = Math.sign(plateCx - e.cx)
    let fallback = { cx: e.cx, cy: round2(top - 27 * kFeat), len: round2(len0 * 0.55) }
    for (const lf of [1, 0.85, 0.7, 0.55]) {
      for (const gap of [50, 44, 38, 32, 27]) {
        for (const dx of [0, 0.2, 0.4]) {
          const cand = { cx: round2(e.cx + toward * dx * len0), cy: round2(top - gap * kFeat), len: round2(len0 * lf) }
          if (browFits(cand.cx, cand.cy, cand.len)) return cand
          if (lf === 0.55 && gap === 27 && dx === 0) fallback = cand
        }
      }
    }
    return fallback
  }
  // placements are pure functions of the spec: use the generated cache when it
  // matches this exact spec (and solver version), otherwise solve now
  const hash = specHash(spec)
  const cached = !opts.solve && SOLVED[spec.id]?.hash === hash ? SOLVED[spec.id] : null
  const browL = cached?.browL ?? browFor(eL, 0)
  const browR = cached?.browR ?? browFor(eR, 1)

  // --- cheeks: pulled towards the plate centre until the fullest blush fits ---
  const blushFits = (cx: number, cy: number, big: number) => {
    const rx = 48 * kFace * big, ry = 25 * kFace * big
    for (let a = 0; a < 360; a += 30) {
      if (!onVisiblePlate(cx + Math.cos(rad(a)) * rx, cy + Math.sin(rad(a)) * ry, 2)) return false
    }
    return true
  }
  const plateCy = (face.box.y0 + face.box.y1) / 2
  const cheekFor = (i: 0 | 1) => {
    const h = spec.cheeks?.[i]
    if (h) {
      const [x, y] = unrot(X(h.cx), Y(h.cy))
      return { cx: round2(x), cy: round2(y) }
    }
    const e = i === 0 ? eL : eR
    const other = i === 0 ? eR : eL
    const side = stacked ? 1 : i === 0 ? -1 : 1
    const gap = stacked ? e.w * 1.6 : Math.abs(other.cx - e.cx) * 0.42
    let cx = e.cx + side * gap
    let cy = Math.max(e.cy + e.h / 2, other.cy + other.h / 2) + 14 * kFeat
    for (let n = 0; n < 60 && !blushFits(cx, cy, 1); n++) {
      const dx = plateCx - cx, dy = plateCy - cy
      const d = Math.hypot(dx, dy) || 1
      cx += (dx / d) * 6
      cy += (dy / d) * 6
    }
    return { cx: round2(cx), cy: round2(cy) }
  }
  const cheekL = cached?.cheekL ?? cheekFor(0)
  const cheekR = cached?.cheekR ?? cheekFor(1)

  // --- tears: lanes that stay on the plate -----------------------------------
  const tearDrift = spec.tearDrift ?? (stacked ? [1, 1] : [-1, 1])
  const lane = (e: Eye, kE: number, dir: number): TearLane => {
    const k = Math.max(kE, 0.5 * kFace)
    const bottom = e.cy + e.h / 2
    const x0 = e.cx + dir * e.w * 0.3
    const floor = floorBelow(face.poly, x0, bottom)
    const room = Math.max(40 * k, floor - bottom)
    let drift = dir * Math.min(70 * k, room * 0.35)
    // keep the lane end on the plate
    const endY = bottom + room - 48 * k
    for (let i = 0; i < 20 && !discInside(x0 + drift, endY, 26 * k, face.poly); i++) drift *= 0.8
    return {
      pool: [dir * e.w * 0.3, 16 * k],
      poolScale: 0.78 * k,
      drop0: [dir * e.w * 0.3, 22 * k],
      drop1x: dir * e.w * 0.3 + drift,
      drop1y: endY,
      dropScale: k,
      s0x: dir * e.w * 0.3,
      s1: [dir * e.w * 0.3 + drift * 0.1, 60 * k],
      s2: [dir * e.w * 0.3 + drift * 0.7, endY - 50 * k],
      s3: [dir * e.w * 0.3 + drift, endY + 8 * k],
    }
  }

  // --- signals ---------------------------------------------------------------
  // Status shapes are solved against this character's own plate and frame, for
  // every emotion's rest pose (where it carries the dot, and how it tilts /
  // squashes / lifts the body the shapes ride on). Jojo's approved values are
  // the first choice everywhere; anything else is a fallback.
  const outward = spec.notchDir
  // (+ 0 turns -0 into 0, so solved values round-trip through JSON)
  const inward: Pt = [round2(-Math.cos(rad(outward))) + 0, round2(-Math.sin(rad(outward))) + 0]
  const outVec: Pt = [0 - inward[0], 0 - inward[1]]
  const inDeg = outward + 180
  const solveSignals = (): SolvedSignal => {
    const vb = CANVAS.viewBox
    type Frame = { x: number; y: number; w: number; h: number }
    type DotPose = { x: number; y: number; s: number; rot: number; sx: number; sy: number; tx: number; ty: number }
    const pivot = { x: (sb.x0 + sb.x1) / 2, y: sb.y1 }
    // at full intensity and at the default 0.7–0.8 blend (poses blend from calm, see config.poseMix)
    const dotPoses: DotPose[] = [{ x: 0, y: 0, s: 1, rot: 0, sx: 1, sy: 1, tx: 0, ty: 0 }]
    for (const m of [1, 0.89, 0.835]) {
      for (const e of EMOTION_LIST) {
        const q = e.pose
        dotPoses.push({
          x: (q.dotX ?? 0) * kDot * m, y: (q.dotY ?? 0) * kDot * m, s: 1 + ((q.dotS ?? 1) - 1) * m,
          rot: (q.rot ?? 0) * m, sx: 1 + ((q.sx ?? 1) - 1) * m, sy: 1 + ((q.sy ?? 1) - 1) * m,
          tx: (q.tx ?? 0) * kBody * m, ty: (q.ty ?? 0) * kBody * m,
        })
      }
    }
    const toView = (dp: DotPose, x: number, y: number): Pt => {
      const r = rad(dp.rot)
      const dx = (x - pivot.x) * dp.sx, dy = (y - pivot.y) * dp.sy
      return [pivot.x + dx * Math.cos(r) - dy * Math.sin(r) + dp.tx, pivot.y + dx * Math.sin(r) + dy * Math.cos(r) + dp.ty]
    }
    /**
     * A disc (shell space) stays in the frame under a pose's body transform. Like
     * the approved Jojo rule, it may rise as high as the dot's own top when the
     * dot itself sits above the frame's top edge.
     */
    const inView = (dp: DotPose, x: number, y: number, hw: number, f: Frame, sd = 1, m = 4) => {
      const [vx, vy] = toView(dp, x, y)
      const dotTop = toView(dp, dot.cx + dp.x, dot.cy + dp.y - dot.r * dp.s * sd)[1]
      return vx - hw >= f.x + m && vx + hw <= f.x + f.w - m && vy - hw >= Math.min(f.y + m, dotTop) && vy + hw <= f.y + f.h - m
    }

    // working gauge: a ring lining the notch on the shell side (Jojo: gap/width 20
    // full, 34 small, ±110°). Thickness matters more than the gap — at 24 px a thin
    // ring vanishes — so the gap closes first and the ring hugs the dot. When the
    // plate wraps the notch too closely the ring runs over the dot's open side.
    const ringClear = (centre: number, half: number, gap: number, width: number, frame: Frame, sd = 1, keyline = 0) =>
      dotPoses.every((dp) => {
        const c = { x: dot.cx + dp.x, y: dot.cy + dp.y }
        const r = dot.r * dp.s * sd + gap * kDot + (width * kDot) / 2
        const hw = (width * kDot) / 2 + keyline * kDot
        for (let i = 0; i <= 24; i++) {
          const a = rad(centre + half - (2 * half * i) / 24)
          const x = c.x + Math.cos(a) * r, y = c.y + Math.sin(a) * r
          if (!offPlate(x, y, hw + 3) || !inView(dp, x, y, hw, frame, sd)) return false
        }
        return true
      })
    const RINGS = {
      full: [[20, 20], [14, 20], [8, 20], [4, 18], [2, 16], [2, 14]],
      small: [[34, 34], [24, 34], [14, 34], [6, 32], [2, 30], [2, 26], [2, 22]],
    } as const
    const spans = spec.gaugeHalfSpan !== undefined ? [spec.gaugeHalfSpan] : [110, 100, 90, 80, 70]
    let gaugeCentre = inDeg
    let half = spans[0]
    let ringFull = { gap: 20, width: 20 }
    full: for (const centre of [inDeg, outward]) {
      for (const h of spans) {
        // a side only counts if the small ring fits there too
        if (!RINGS.small.some(([g, w]) => ringClear(centre, h, g, w, vb.tight, 1, 8))) continue
        for (const [g, w] of RINGS.full) {
          if (ringClear(centre, h, g, w, vb.full)) {
            gaugeCentre = centre
            half = h
            ringFull = { gap: g, width: w }
            break full
          }
        }
      }
    }
    const smallRing = (sd: number) => {
      for (const [g, w] of RINGS.small) if (ringClear(gaugeCentre, half, g, w, vb.tight, sd, 8)) return { gap: g, width: w }
      return null
    }

    // success badge at small sizes: grows (Jojo: +55 %) into the notch, or outwards
    // when the plate leaves no room there
    const badgeClear = (b: number, dir: Pt, sd: number) =>
      dotPoses.every((dp) => {
        const scale = 1.15 * (1 + b)
        const r = dot.r * dp.s * sd * scale
        const shift = (scale - 1) * dot.r * dp.s * sd
        const cx = dot.cx + dp.x + shift * dir[0], cy = dot.cy + dp.y + shift * dir[1]
        for (let a = 0; a < 360; a += 15) if (!offPlate(cx + Math.cos(rad(a)) * r, cy + Math.sin(rad(a)) * r, 4)) return false
        return inView(dp, cx, cy, r, vb.tight, sd)
      })
    const smallBadge = (sd: number) => {
      for (const b of [0.55, 0.45, 0.35, 0.25]) {
        if (badgeClear(b, inward, sd)) return { boost: b, dir: inward }
        if (badgeClear(b, outVec, sd)) return { boost: b, dir: outVec }
      }
      for (const b of [0.15, 0.08, 0]) if (badgeClear(b, inward, sd)) return { boost: b, dir: inward }
      return { boost: 0, dir: inward }
    }

    // needs-input bubble: beside the dot on the open side, else the other side, else above
    const tipFor = (tail: TailSide, sd = 1) => {
      const reach = dot.r * sd * 0.82 + 8 * kDot
      return tail === 'right' ? { x: dot.cx - reach, y: dot.cy + 14 * kDot }
        : tail === 'down' ? { x: dot.cx + 14 * kDot, y: dot.cy - reach }
          : { x: dot.cx + reach, y: dot.cy + 14 * kDot }
    }
    const boxOk = (b: Bubble, tail: TailSide, frame: Frame, top: number, sd = 1) => {
      if (b.x < frame.x + 26 || b.x + b.w > frame.x + frame.w - 26 || b.y < frame.y + top || b.y + b.h > frame.y + frame.h - 26) return false
      const tip = tipFor(tail, sd)
      // every corner stays in frame for every pose, including the pop-in overshoot
      // (the bubble scales up to ~1.035× about its tail tip, which rides on the dot)
      for (const dp of dotPoses) {
        const tx = tip.x + dp.x, ty = tip.y + dp.y
        for (const [x, y] of [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]] as Pt[]) {
          if (!inView(dp, tx + (x - tx) * 1.035, ty + (y - ty) * 1.035, b.stroke / 2, frame, sd, 2)) return false
        }
      }
      if (tail === 'left' && (b.x < tip.x + 16 * kDot || tip.y < b.y + b.rx * 0.6 || tip.y > b.y + b.h - b.rx * 0.2 + 30 * kDot)) return false
      if (tail === 'right' && (b.x + b.w > tip.x - 16 * kDot || tip.y < b.y + b.rx * 0.6 || tip.y > b.y + b.h - b.rx * 0.2 + 30 * kDot)) return false
      if (tail === 'down' && (b.y + b.h > tip.y - 16 * kDot || tip.x < b.x + 10 * kDot || tip.x > b.x + b.w - 10 * kDot)) return false
      for (let i = 0; i <= 6; i++) {
        const t = i / 6
        for (const [x, y] of [[b.x + b.w * t, b.y], [b.x + b.w * t, b.y + b.h], [b.x, b.y + b.h * t], [b.x + b.w, b.y + b.h * t]] as Pt[]) {
          if (!offPlate(x, y, b.stroke / 2 + 4)) return false
        }
      }
      return true
    }
    const place = (tail: TailSide, w: number, h: number, grow: number, sd = 1, small = false): Bubble => {
      const W = w * grow, H = h * grow
      const r = dot.r * sd
      // the small-size bubble keeps a bold edge and glyph: it often sits over the
      // page, where white alone vanishes
      const g = small ? { rx: Math.min(60 * kDot, H * 0.42), stroke: 16 * kDot, glyph: 19 } : { rx: 46 * kDot, stroke: 10 * kDot, glyph: 14 }
      if (tail === 'left') return { x: dot.cx + r + 54 * kDot, y: dot.cy - H / 2 - 27 * kDot * grow, w: W, h: H, ...g }
      if (tail === 'right') return { x: dot.cx - r - 54 * kDot - W, y: dot.cy - H / 2 - 27 * kDot * grow, w: W, h: H, ...g }
      return { x: dot.cx - W * 0.35, y: dot.cy - r - 44 * kDot - H, w: W, h: H, ...g }
    }
    /** nudge a box into the frame (keeps its tail side) */
    const fitIn = (b: Bubble, frame: Frame, top: number): Bubble => ({
      ...b,
      x: Math.min(Math.max(b.x, frame.x + 26), frame.x + frame.w - 26 - b.w),
      y: Math.min(Math.max(b.y, frame.y + top), frame.y + frame.h - 26 - b.h),
    })
    // candidate positions: as placed, then nudged towards the frame centre (a bubble
    // pressed against an edge swings out of frame when the body tilts)
    const nudges = (b: Bubble, frame: Frame, top: number): Bubble[] => {
      const cx = frame.x + frame.w / 2
      const dir = Math.sign(cx - (b.x + b.w / 2)) || 1
      const out: Bubble[] = []
      for (const dy of [0, 24, 48]) for (const k of [0, 1, 2, 3, 4, 5]) out.push(fitIn({ ...b, x: b.x + dir * k * 28, y: b.y + dy }, frame, top))
      return out
    }
    const sideFirst: TailSide = dot.cx < (sb.x0 + sb.x1) / 2 ? 'left' : 'right'
    const tails: TailSide[] = [sideFirst, sideFirst === 'left' ? 'right' : 'left', 'down']
    let fullBubble: Bubble | null = null
    let fullTail: TailSide = spec.bubble?.tail ?? sideFirst
    if (spec.bubble) {
      fullBubble = { ...place(spec.bubble.tail, 178 * kDot, 128 * kDot, 1), x: X(spec.bubble.x), y: Y(spec.bubble.y), w: S(spec.bubble.w), h: S(spec.bubble.h) }
    } else {
      search: for (const tail of tails) {
        for (const shrink of [1, 0.9, 0.8, 0.72]) {
          for (const b of nudges(fitIn(place(tail, 178 * kDot * shrink, 128 * kDot * shrink, 1), vb.full, 52), vb.full, 52)) {
            if (boxOk(b, tail, vb.full, 52)) {
              fullBubble = b
              fullTail = tail
              break search
            }
          }
        }
      }
    }
    if (!fullBubble) fullBubble = fitIn(place(fullTail, 150 * kDot, 108 * kDot, 1), vb.full, 52)
    // small bubble: its own search (bigger and borderless when there is room),
    // preferring the full-size bubble's side so the two read as one design
    const smallBubble = (sd: number) => {
      for (const tail of [fullTail, ...tails.filter((t) => t !== fullTail)]) {
        for (const grow of [1.35, 1.2, 1.05, 0.95, 0.85, 0.75, 0.65, 0.58]) {
          for (const b of nudges(fitIn(place(tail, 178 * kDot, 128 * kDot, grow, sd, true), vb.tight, 42), vb.tight, 42)) {
            if (boxOk(b, tail, vb.tight, 42, sd)) return { b, tail }
          }
        }
      }
      return null
    }

    // small sizes: the largest dot scale (towards Jojo's dot size, at most 1.6×)
    // for which a thick ring, a readable badge and a small bubble all still fit
    const sdTarget = round2(Math.min(1.6, Math.max(1, 58 / dot.r)))
    const scales = [sdTarget]
    for (let v = sdTarget - 0.1; v > 1; v -= 0.1) scales.push(round2(v))
    if (sdTarget > 1) scales.push(1)
    let smallDot = 1
    let ringSmall = smallRing(1) ?? { gap: 34, width: 34 }
    let badge = smallBadge(1)
    let sBubble = smallBubble(1)
    for (const sd of scales) {
      const ring = smallRing(sd), bdg = smallBadge(sd), bub = smallBubble(sd)
      if (ring && ring.width >= 30 && bdg.boost >= 0.25 && bub) {
        smallDot = sd
        ringSmall = ring
        badge = bdg
        sBubble = bub
        break
      }
    }
    return {
      outwardGauge: gaugeCentre !== inDeg,
      gauge: { from: gaugeCentre + half, to: gaugeCentre - half, full: ringFull, small: ringSmall },
      bubble: {
        full: fullBubble,
        small: sBubble?.b ?? fitIn(place(fullTail, 150 * kDot, 108 * kDot, 1.35, smallDot, true), vb.tight, 42),
        tail: fullTail,
        smallTail: sBubble?.tail ?? fullTail,
      },
      checkBoostSmall: badge.boost,
      badgeDir: badge.dir,
      smallDot,
    }
  }
  const solved = cached?.signal ?? solveSignals()

  const zz = spec.zzz ? { x: X(spec.zzz.x), y: Y(spec.zzz.y) } : { x: sb.x1 + 15, y: sb.y0 + 34 }

  const silhouette =
    spec.silhouette === 'shell+face' ? `${shell.d} ${faceWorld.d}` : shell.d

  return {
    id: spec.id,
    no: spec.no,
    name: spec.name,
    persona: spec.persona,
    source: spec.source,
    form: spec.form,
    cleanup: spec.cleanup ?? [],
    spec,
    fit,
    shell,
    face,
    faceClip: spec.faceClip !== 'none',
    faceRotate,
    silhouette,
    eyeL: { cx: eL.cx, cy: eL.cy, w: eL.w, h: eL.h },
    eyeR: { cx: eR.cx, cy: eR.cy, w: eR.w, h: eR.h },
    mouth,
    dot,
    browL,
    browR,
    browWidth,
    cheekL,
    cheekR,
    pivot: { x: round2((sb.x0 + sb.x1) / 2), y: round2(sb.y1) },
    shadowOffset: { x: round2(62 * kBody), y: round2(67 * kBody) },
    // an arc over the dot's open side sits on the page, not the shell: contrast it with paper
    palette: solved.outwardGauge ? { ...buildPalette(spec.palette), gauge: gaugeTone(spec.palette.dot, '#f6f3ec') } : buildPalette(spec.palette),
    k: { body: kBody, face: kFace, dot: kDot, eye: kEye, gaze: kGaze },
    tearL: lane(eL, kEyeL, tearDrift[0]),
    tearR: lane(eR, kEyeR, tearDrift[1]),
    tearStroke: 24 * Math.max(0.5, kEye),
    zzz: zz,
    signal: {
      outward,
      inward,
      gauge: solved.gauge,
      bubble: solved.bubble,
      checkBoostSmall: solved.checkBoostSmall,
      badgeDir: solved.badgeDir,
      smallDot: solved.smallDot,
    },
    rig,
    solved: {
      hash,
      browL,
      browR,
      cheekL,
      cheekR,
      signal: solved,
    },
  }
}

/** Is a point (plate space) on the visible plate? (plate ∩ shell when clipped) */
export function onPlate(ch: Character, x: number, y: number) {
  return pointInPoly(x, y, ch.face.poly)
}
