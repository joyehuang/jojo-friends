import { EYE_L, EYE_R, MOUTH } from './geometry'

/**
 * A pose is a flat bag of numbers so it can be sprung, blended and scaled by
 * intensity without knowing what each number means. `frame.ts` turns it into
 * SVG attributes.
 *
 * Units are PNG pixels unless noted. Eye prefixes: `l` = viewer's left
 * (the thin eye), `r` = viewer's right (the wide eye).
 */
export const POSE_KEYS = [
  // shell: offset, tilt (deg, about bottom centre), squash
  'tx', 'ty', 'rot', 'sx', 'sy',
  // gaze, -1..1 (moves eyes/mouth/face inside the shell)
  'lookX', 'lookY',
  // left eye: offset, capsule length (between cap centres), thickness,
  // centre-line angle (deg, 0 = vertical), bend (+ = right when vertical,
  // up when horizontal), sharpness 0.67 (arc) .. 1 (chevron),
  // lids as fraction of eye height, lid slope (+ = inner end lower), open 0..1
  'lDx', 'lDy', 'lLen', 'lThick', 'lRot', 'lBend', 'lSharp', 'lLidTop', 'lLidTilt', 'lLidBot', 'lOpen',
  'rDx', 'rDy', 'rLen', 'rThick', 'rRot', 'rBend', 'rSharp', 'rLidTop', 'rLidTilt', 'rLidBot', 'rOpen',
  // brows: visibility 0..1, offset, rotation (+ = inner end lower)
  'brow', 'lBrowDy', 'lBrowRot', 'rBrowDy', 'rBrowRot',
  // mouth: offset, corner distance, stroke, upper/lower control offsets
  // (+ = down, at 1/3 and 2/3 of the width), rotation, tongue 0..1
  'mDx', 'mDy', 'mW', 'mThick', 'mU1', 'mU2', 'mL1', 'mL2', 'mRot', 'tongue',
  // signal dot: offset, scale, glow 0..1
  'dotX', 'dotY', 'dotS', 'dotGlow',
  // decoration layers, all 0..1 visibility
  'shine', 'blush', 'tearPool', 'tears', 'stream', 'confetti', 'zzz',
] as const

export type PoseKey = (typeof POSE_KEYS)[number]
export type Pose = Record<PoseKey, number>
export type PoseDelta = Partial<Pose>

export const BASE_POSE: Pose = {
  tx: 0, ty: 0, rot: 0, sx: 1, sy: 1,
  lookX: 0, lookY: 0,
  lDx: 0, lDy: 0, lLen: EYE_L.h - EYE_L.w, lThick: EYE_L.w, lRot: 0, lBend: 0, lSharp: 0.67,
  lLidTop: 0, lLidTilt: 0, lLidBot: 0, lOpen: 1,
  rDx: 0, rDy: 0, rLen: EYE_R.h - EYE_R.w, rThick: EYE_R.w, rRot: 0, rBend: 0, rSharp: 0.67,
  rLidTop: 0, rLidTilt: 0, rLidBot: 0, rOpen: 1,
  brow: 0, lBrowDy: 0, lBrowRot: 0, rBrowDy: 0, rBrowRot: 0,
  mDx: 0, mDy: 0, mW: MOUTH.w - MOUTH.h, mThick: MOUTH.h, mU1: 0, mU2: 0, mL1: 0, mL2: 0, mRot: 0, tongue: 0,
  dotX: 0, dotY: 0, dotS: 1, dotGlow: 0,
  shine: 0, blush: 0, tearPool: 0, tears: 0, stream: 0, confetti: 0, zzz: 0,
}

export function makePose(over: PoseDelta = {}): Pose {
  return { ...BASE_POSE, ...over }
}

/** base + (target - base) * t, key by key. */
export function blendPose(base: Pose, target: Pose, t: number, out: Pose = { ...base }): Pose {
  for (const k of POSE_KEYS) out[k] = base[k] + (target[k] - base[k]) * t
  return out
}

/** Adds a sparse delta (already scaled) onto a pose in place. */
export function addDelta(pose: Pose, delta: PoseDelta | undefined, scale = 1): Pose {
  if (!delta) return pose
  for (const k in delta) {
    const v = delta[k as PoseKey]
    if (v !== undefined) pose[k as PoseKey] += v * scale
  }
  return pose
}

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
