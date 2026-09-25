// @joyehuang/jojo-web/runtime — browser entry. Jojo only; no react-dom/server,
// no other family member. React 19 is a peer dependency.
export { JojoWeb as Jojo } from './JojoWeb'
export type { JojoWebProps as JojoProps } from './JojoWeb'
export type { JojoHandle } from '../library/Jojo'
export { usePrefersReducedMotion } from '../library/Jojo'
export { EMOTION_IDS } from '../library/emotions'
export type { EmotionId } from '../library/emotions'
export { STATUS_IDS } from '../library/status'
export type { StatusId } from '../library/status'
export type { GazeInput, MotionPref } from '../library/config'
export { ticker } from '../library/engine'

import { DOT, PIVOT, VIEWBOX } from '../library/geometry'

/**
 * Where things sit inside the SVG, for callers that choreograph around Jojo
 * (e.g. a tether from the signal dot). Units are the SVG's own; divide by the
 * viewBox to get fractions of the rendered box.
 */
export const JOJO_GEOMETRY = {
  viewBox: { full: { ...VIEWBOX.full }, tight: { ...VIEWBOX.tight } },
  dot: { ...DOT },
  pivot: { ...PIVOT },
} as const
