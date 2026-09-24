import type { Character } from './character'
import { CHARACTERS, DEFAULT_CHARACTER, isCharacterId } from './characters'
import { EMOTIONS, isEmotionId, type EmotionId } from './emotions'
import type { FrameOptions } from './frame'
import { VIEWBOX, type Framing } from './geometry'
import { BASE_POSE, blendPose, clamp, makePose, type Pose, type PoseKey } from './pose'
import { isStatusId, type StatusId } from './status'

export type MotionPref = 'auto' | 'full' | 'transitions' | 'static'
/** What actually runs after `auto` and prefers-reduced-motion are applied. */
export type MotionMode = 'full' | 'transitions' | 'static'
export type GazeInput = 'auto' | 'pointer' | 'center' | { x: number; y: number }

export interface JojoOptions {
  /**
   * which family member to draw: a stable id (see CHARACTER_IDS) or a
   * `Character` built with `buildCharacter` (your own). Default `jojo`.
   */
  character?: string | Character
  /** facial/body expression (visual only). Default `calm`. */
  emotion?: EmotionId
  /** business status, drives the signal dot only. Default `idle`. */
  status?: StatusId
  /** 0..1, how strongly the expression and its motion read. Default 0.7. */
  intensity?: number
  /**
   * `auto` (default): `full`, or `static` when the OS asks for reduced motion.
   * `full`: blink, breathing, idle loops and transitions.
   * `transitions`: animate changes only, then hold still (good for lists of small avatars).
   * `static`: no animation at all.
   */
  motion?: MotionPref
  /** `auto`: the expression's own look plus small saccades; `pointer` follows the pointer (bounded); `center` looks at you; or an explicit {x, y} in -1..1. */
  gaze?: GazeInput
  /** rendered size in px (number) or any CSS length. Default 96. */
  size?: number | string
  /** soft drop shadow like the hero art. `auto`: on at ≥ 72px. */
  shadow?: boolean | 'auto'
  /** restrained brows on expressions that use them. `auto`: off below 56px. */
  brows?: boolean | 'auto'
  /** `auto`: tight framing at ≤ 64px. */
  framing?: Framing | 'auto'
  /** flat fills instead of the subtle gradients. `auto`: flat at ≤ 40px. */
  flat?: boolean | 'auto'
}

export interface ResolvedConfig {
  character: Character
  emotion: EmotionId
  status: StatusId
  intensity: number
  motion: MotionMode
  gaze: GazeInput
  px: number | null
  cssSize: string
  framing: Framing
  flat: boolean
  frame: FrameOptions
}

export const DEFAULTS = {
  emotion: 'calm' as EmotionId,
  status: 'idle' as StatusId,
  intensity: 0.7,
  size: 96,
}

const warned = new Set<string>()
function warnOnce(msg: string) {
  const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.NODE_ENV
  if (env === 'production' || warned.has(msg)) return
  warned.add(msg)
  console.warn(`[jojo] ${msg}`)
}

function num(v: unknown, fallback: number) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

export function resolveGaze(g: unknown): GazeInput {
  if (g === 'auto' || g === 'pointer' || g === 'center') return g
  if (g && typeof g === 'object') {
    const o = g as { x?: unknown; y?: unknown }
    return { x: clamp(num(o.x, 0), -1, 1), y: clamp(num(o.y, 0), -1, 1) }
  }
  if (g !== undefined) warnOnce(`unknown gaze ${JSON.stringify(g)}, using "auto"`)
  return 'auto'
}

/** Normalises props. Invalid input falls back to defaults (with a dev warning), never throws. */
export function resolveConfig(o: JojoOptions, prefersReducedMotion: boolean): ResolvedConfig {
  let character = DEFAULT_CHARACTER
  if (o.character !== undefined) {
    if (typeof o.character === 'object' && o.character && 'rig' in o.character && 'shell' in o.character) character = o.character
    else if (isCharacterId(o.character)) character = CHARACTERS[o.character]
    else warnOnce(`unknown character "${String(o.character)}", using "jojo"`)
  }
  let emotion = o.emotion ?? DEFAULTS.emotion
  if (!isEmotionId(emotion)) {
    warnOnce(`unknown emotion "${String(emotion)}", using "calm"`)
    emotion = DEFAULTS.emotion
  }
  let status = o.status ?? DEFAULTS.status
  if (!isStatusId(status)) {
    warnOnce(`unknown status "${String(status)}", using "idle"`)
    status = DEFAULTS.status
  }
  const intensity = clamp(num(o.intensity, DEFAULTS.intensity), 0, 1)

  const pref = o.motion ?? 'auto'
  let motion: MotionMode
  if (pref === 'full' || pref === 'transitions' || pref === 'static') motion = pref
  else {
    if (pref !== 'auto') warnOnce(`unknown motion "${String(pref)}", using "auto"`)
    motion = 'full'
  }
  // reduced motion always wins, even over an explicit `full`
  if (prefersReducedMotion) motion = 'static'

  const size = o.size ?? DEFAULTS.size
  let px: number | null = null
  let cssSize: string
  if (typeof size === 'number' && Number.isFinite(size) && size > 0) {
    px = size
    cssSize = `${size}px`
  } else if (typeof size === 'string' && size.trim()) {
    cssSize = size.trim()
    const m = /^(\d+(?:\.\d+)?)px$/.exec(cssSize)
    if (m) px = Number(m[1])
  } else {
    warnOnce(`invalid size ${JSON.stringify(size)}, using ${DEFAULTS.size}px`)
    px = DEFAULTS.size
    cssSize = `${DEFAULTS.size}px`
  }

  const small = px !== null && px <= 40
  const framing: Framing = o.framing === 'full' || o.framing === 'tight' ? o.framing : px !== null && px <= 64 ? 'tight' : 'full'
  const shadow = o.shadow === true || o.shadow === false ? o.shadow : px === null || px >= 72
  const brows = o.brows === true || o.brows === false ? o.brows : px === null || px >= 56
  const flat = o.flat === true || o.flat === false ? o.flat : small
  // keep hairlines ≥ ~1.4 device px when tiny
  const unitsPerPx = px ? VIEWBOX[framing].w / px : 0
  const minStroke = px ? Math.min(60, 1.4 * unitsPerPx) : 0

  return {
    character,
    emotion,
    status,
    intensity,
    motion,
    gaze: resolveGaze(o.gaze),
    px,
    cssSize,
    framing,
    flat,
    frame: { small, brows, shadow: shadow && framing === 'full', minStroke, character },
  }
}

/** Intensity keeps the expression recognisable at 0 and full at 1. */
export const poseMix = (intensity: number) => 0.45 + 0.55 * clamp(intensity, 0, 1)
export const motionAmp = (intensity: number) => 0.4 + 0.6 * clamp(intensity, 0, 1)

const fullPoses = new Map<EmotionId, Pose>()
export function fullPose(id: EmotionId): Pose {
  let p = fullPoses.get(id)
  if (!p) {
    p = makePose(EMOTIONS[id].pose)
    fullPoses.set(id, p)
  }
  return p
}

/** Effect layers read as on/off; intensity changes their motion, not their opacity. */
const ALWAYS_FULL: PoseKey[] = ['tears', 'stream', 'confetti', 'zzz']
const EYE_SHAPE = ['Len', 'Thick', 'Rot', 'Bend', 'Sharp'] as const

/**
 * Pose for an emotion at a given intensity. Most keys blend from the calm
 * baseline, but an eye that changes *shape* (arc, chevron) keeps its full
 * shape at any intensity so a soft "happy" never becomes a tilted capsule.
 */
export function targetPose(id: EmotionId, intensity: number, out?: Pose): Pose {
  const full = fullPose(id)
  const p = blendPose(BASE_POSE, full, poseMix(intensity), out)
  const def = EMOTIONS[id].pose
  for (const k of ALWAYS_FULL) p[k] = full[k]
  for (const side of ['l', 'r'] as const) {
    const reshaped = def[`${side}Rot`] !== undefined || def[`${side}Bend`] !== undefined || def[`${side}Sharp`] !== undefined
    if (!reshaped) continue
    for (const s of EYE_SHAPE) {
      const k = `${side}${s}` as PoseKey
      p[k] = full[k]
    }
  }
  return p
}
