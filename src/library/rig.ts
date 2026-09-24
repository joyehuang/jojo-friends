import type { Character } from './character'
import { clamp, type Pose } from './pose'

/**
 * Maps a pose written in Jojo units onto a character.
 *
 * - body travel (tx/ty) scales with the shell, rotation/squash do not;
 * - feature travel (eye/mouth/brow offsets) scales with the plate;
 * - an eye keeps its *own* shape (length, thickness, tilt) and only takes the
 *   emotion's relative change — a dot eye stays a dot that grows or narrows —
 *   until the emotion reshapes it into an arc / chevron (happy, laugh, sob…),
 *   which is drawn at the character's arc size instead. The two blend by how
 *   far the eye has turned/bent, so springs between them never pop;
 * - the mouth takes the emotion's change in width / opening, scaled to the
 *   character's own mouth.
 *
 * The identity rig (Jojo) returns the pose untouched; `small` enlarges the
 * signal dot by the character's `signal.smallDot`.
 */
export function rigPose(p: Pose, ch: Character, out: Pose = { ...p }, small = false): Pose {
  const r = ch.rig
  if (!r) return p
  if (out !== p) Object.assign(out, p)
  // tiny avatars: the signal dot (and every status shape built on it) is drawn
  // larger so status still reads at 24 px — as far as this character's plate allows
  if (small) out.dotS = p.dotS * ch.signal.smallDot

  out.tx = p.tx * r.body
  out.ty = p.ty * r.body

  for (const [i, s] of [[0, 'l'], [1, 'r']] as const) {
    const e = r.eye[i]
    const rot = p[`${s}Rot`]
    const bend = p[`${s}Bend`]
    // 0 = the eye's own capsule, 1 = fully reshaped into an arc/chevron
    const w = clamp(Math.max(Math.abs(rot) / 90, Math.abs(bend) / 26), 0, 1)
    const len = p[`${s}Len`], thick = p[`${s}Thick`]
    const ownLen = e.len0 * (len / e.jLen)
    const ownThick = e.thick0 * (thick / e.jThick)
    out[`${s}Len`] = ownLen + (len * e.arc - ownLen) * w
    out[`${s}Thick`] = ownThick + (thick * e.arcThick - ownThick) * w
    out[`${s}Rot`] = rot + e.rot0 * (1 - w)
    out[`${s}Bend`] = bend * e.arc
    out[`${s}Dx`] = p[`${s}Dx`] * r.feat
    out[`${s}Dy`] = p[`${s}Dy`] * r.feat
  }
  out.lBrowDy = p.lBrowDy * r.feat
  out.rBrowDy = p.rBrowDy * r.feat

  const m = r.mouth
  out.mDx = p.mDx * r.feat
  out.mDy = p.mDy * r.feat
  // never exactly 0: a zero-length outline draws nothing, and a dot mouth must stay a dot
  out.mW = Math.max(1, m.w0 + (p.mW - 115) * m.kW)
  out.mThick = Math.max(4, m.t0 + (p.mThick - 47) * m.kT)
  out.mU1 = p.mU1 * m.kC
  out.mU2 = p.mU2 * m.kC
  out.mL1 = p.mL1 * m.kC
  out.mL2 = p.mL2 * m.kC
  out.mRot = p.mRot + m.rot0
  // A narrow mouth with a thick stroke bends tighter than half its stroke, and
  // rasterisers leave slivers inside the curve. Move the excess thickness into
  // the outline itself (wider, upper edge up, lower edge down) so the outer
  // shape is unchanged but the stroke stays thin enough to bend cleanly.
  const t = out.mThick
  const tMax = Math.max(6, (out.mW + t) * 0.35)
  if (t > tMax) {
    const ex = t - tMax
    out.mThick = tMax
    out.mW += ex
    const lift = ex / 1.5 // the curve's peak is 0.75 × its control offset
    out.mU1 -= lift
    out.mU2 -= lift
    out.mL1 += lift
    out.mL2 += lift
  }

  out.dotX = p.dotX * r.dot
  out.dotY = p.dotY * r.dot
  return out
}
