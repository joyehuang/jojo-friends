import { describe, expect, it } from 'vitest'
import { targetPose } from '../src/library/config'
import { EMOTION_IDS, EMOTION_LIST, EMOTIONS } from '../src/library/emotions'
import { EYE_L, EYE_R, FACE_BOX, MOUTH, BROW_L, BROW_R } from '../src/library/geometry'
import { addDelta, BASE_POSE, POSE_KEYS, type Pose } from '../src/library/pose'
import { motionAmp } from '../src/library/config'

const REQUIRED = {
  calm: '平静', focus: '专注', think: '思考', puzzled: '疑惑', curious: '好奇', happy: '开心',
  laugh: '大笑', smug: '得意', shy: '害羞', surprised: '惊讶', angry: '生气', aggrieved: '委屈',
  cry: '轻哭', sob: '嚎啕', sleepy: '困倦', celebrate: '庆祝',
} as const

describe('emotion catalogue', () => {
  it('has all 16 required expressions with their Chinese labels', () => {
    expect(EMOTION_IDS.length).toBeGreaterThanOrEqual(16)
    for (const [id, label] of Object.entries(REQUIRED)) {
      expect(EMOTIONS[id as keyof typeof REQUIRED]?.label).toBe(label)
    }
    expect(new Set(EMOTION_LIST.map((e) => e.label)).size).toBe(EMOTION_LIST.length)
  })

  it('only uses known pose keys with finite values', () => {
    for (const e of EMOTION_LIST) {
      for (const [k, v] of Object.entries(e.pose)) {
        expect(POSE_KEYS as readonly string[]).toContain(k)
        expect(Number.isFinite(v)).toBe(true)
      }
      expect(e.cue.length).toBeGreaterThan(8)
      expect(e.breath.period).toBeGreaterThan(1)
    }
  })

  it('every expression changes eyes AND at least one of mouth/body/dot (not a mouth-only swap)', () => {
    const eyeKeys = POSE_KEYS.filter((k) => /^[lr](Len|Thick|Rot|Bend|Lid|Dy|Open)/.test(k) || k === 'lookX' || k === 'lookY')
    const other = POSE_KEYS.filter((k) => /^(m|tx|ty|rot|sx|sy|dot|tongue)/.test(k))
    for (const e of EMOTION_LIST) {
      if (e.id === 'calm') continue
      const p = targetPose(e.id, 1)
      expect(eyeKeys.some((k) => Math.abs(p[k] - BASE_POSE[k]) > 1e-6), `${e.id} eyes`).toBe(true)
      expect(other.some((k) => Math.abs(p[k] - BASE_POSE[k]) > 1e-6), `${e.id} mouth/body/dot`).toBe(true)
    }
  })

  it('all pairs of expressions are clearly different poses', () => {
    // normalise each key by a rough "noticeable change" unit
    const unit = (k: string) =>
      /Lid|Open|shine|blush|tear|tears|stream|confetti|zzz|tongue|brow$/.test(k) ? 0.2
        : /look/.test(k) ? 0.25 : /^(sx|sy|dotS)$/.test(k) ? 0.03 : /Rot|rot/.test(k) ? 8 : /Sharp/.test(k) ? 0.15 : 14
    const poses = EMOTION_LIST.map((e) => [e.id, targetPose(e.id, 0.8)] as const)
    let min = Infinity
    let pair = ''
    for (let i = 0; i < poses.length; i++) {
      for (let j = i + 1; j < poses.length; j++) {
        let d = 0
        for (const k of POSE_KEYS) d += Math.abs(poses[i][1][k] - poses[j][1][k]) / unit(k)
        if (d < min) {
          min = d
          pair = `${poses[i][0]}/${poses[j][0]}`
        }
      }
    }
    expect(min, `closest pair ${pair}`).toBeGreaterThan(6)
  })

  it('intensity 0 still reads (differs from calm) and 1 is the full pose', () => {
    for (const e of EMOTION_LIST) {
      if (e.id === 'calm') continue
      const lo = targetPose(e.id, 0)
      const diff = POSE_KEYS.reduce((s, k) => s + Math.abs(lo[k] - BASE_POSE[k]), 0)
      expect(diff, e.id).toBeGreaterThan(1)
      const hi = targetPose(e.id, 1)
      for (const [k, v] of Object.entries(e.pose)) expect(hi[k as keyof Pose]).toBeCloseTo(v as number, 6)
    }
  })

  it('sadness ladder escalates: 委屈 < 轻哭 < 嚎啕', () => {
    const [a, c, s] = (['aggrieved', 'cry', 'sob'] as const).map((id) => targetPose(id, 0.7))
    expect(a.tears).toBe(0)
    expect(c.tears).toBeGreaterThan(0)
    expect(c.stream).toBe(0)
    expect(s.stream).toBeGreaterThan(0)
    const open = (p: Pose) => (p.mL1 + p.mL2 - p.mU1 - p.mU2) / 2
    expect(open(s)).toBeGreaterThan(open(c))
  })

  it('thinking does not spin: no loop key rotates continuously', () => {
    const loop = EMOTIONS.think.loop!
    const rots = Array.from({ length: 200 }, (_, i) => loop(i * 0.05).rot ?? 0)
    expect(Math.max(...rots.map(Math.abs))).toBeLessThan(3)
    // and it pauses: the dot is still for part of each 2.4s cycle
    const dots = Array.from({ length: 48 }, (_, i) => loop(i * 0.05).dotY ?? 0)
    expect(dots.filter((d) => Math.abs(d) < 0.01).length).toBeGreaterThan(10)
  })
})

/* ---------------- geometry stays on the face plate ---------------- */

// face plate as a rounded rect with the hero's per-corner radii
const R = { tl: 130, tr: 70, br: 120, bl: 80 }
function insideFace(x: number, y: number, m: number) {
  const { x0, y0, x1, y1 } = FACE_BOX
  if (x < x0 + m || x > x1 - m || y < y0 + m || y > y1 - m) return false
  const corner = (cx: number, cy: number, r: number, inX: boolean, inY: boolean) =>
    !(inX && inY) || Math.hypot(x - cx, y - cy) <= r - m
  return (
    corner(x0 + R.tl, y0 + R.tl, R.tl, x < x0 + R.tl, y < y0 + R.tl) &&
    corner(x1 - R.tr, y0 + R.tr, R.tr, x > x1 - R.tr, y < y0 + R.tr) &&
    corner(x1 - R.br, y1 - R.br, R.br, x > x1 - R.br, y > y1 - R.br) &&
    corner(x0 + R.bl, y1 - R.bl, R.bl, x < x0 + R.bl, y > y1 - R.bl)
  )
}

function featurePoints(p: Pose) {
  // relative to the face plate: features move by look*(30|21) minus the plate's look*9
  const ex = p.lookX * 21, ey = p.lookY * 17
  const mx = p.lookX * 12, my = p.lookY * 7
  const pts: Array<[number, number, number, string]> = []
  for (const s of ['l', 'r'] as const) {
    const base = s === 'l' ? EYE_L : EYE_R
    const g = (k: string) => p[(s + k) as keyof Pose]
    const r = (g('Rot') * Math.PI) / 180
    const L = Math.max(0.5, g('Len')) / 2
    const cx = base.cx + g('Dx') + ex, cy = base.cy + g('Dy') + ey
    const dx = Math.sin(r), dy = Math.cos(r)
    const bend = g('Bend') / (0.75 * Math.max(0.5, g('Sharp')))
    const t = g('Thick') / 2
    pts.push([cx - dx * L, cy - dy * L, t, s + ' eye a'], [cx + dx * L, cy + dy * L, t, s + ' eye b'])
    pts.push([cx + dy * bend, cy - dx * bend, t, s + ' eye bend'])
  }
  const w = Math.max(0, p.mW) / 2
  const mr = (p.mRot * Math.PI) / 180
  const rotp = (x: number, y: number): [number, number] => [
    MOUTH.cx + p.mDx + mx + x * Math.cos(mr) - y * Math.sin(mr),
    MOUTH.cy + p.mDy + my + x * Math.sin(mr) + y * Math.cos(mr),
  ]
  const t = p.mThick / 2
  for (const [x, y] of [[-w, 0], [w, 0], [-w / 3, p.mU1], [w / 3, p.mU2], [-w / 3, p.mL1 * 0.75], [w / 3, p.mL2 * 0.75]]) {
    const [X, Y] = rotp(x, y)
    pts.push([X, Y, t, 'mouth'])
  }
  if (p.brow > 0) {
    for (const [b, dx, dy, rot, side, name] of [
      [BROW_L, p.lDx, p.lDy * 0.5 + p.lBrowDy, p.lBrowRot, 1, 'brow l'],
      [BROW_R, p.rDx, p.rDy * 0.5 + p.rBrowDy, p.rBrowRot, -1, 'brow r'],
    ] as const) {
      const a = (rot * side * Math.PI) / 180
      const hx = (Math.cos(a) * b.len) / 2, hy = (Math.sin(a) * b.len) / 2
      const cx = b.cx + dx + ex, cy = b.cy + dy + ey
      pts.push([cx - hx, cy - hy, 10, name], [cx + hx, cy + hy, 10, name], [cx, cy - 8, 10, name])
    }
  }
  return pts
}

describe('features never leave the face plate', () => {
  it('holds for every emotion, intensity, loop time and gaze extreme', () => {
    const failures: string[] = []
    for (const e of EMOTION_LIST) {
      for (const k of [0, 0.5, 1]) {
        for (let t = 0; t < 7; t += 0.1) {
          for (const [gx, gy] of [[0, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
            const p = { ...targetPose(e.id, k) }
            addDelta(p, e.enter?.sample(t), motionAmp(k))
            addDelta(p, e.loop?.(t), motionAmp(k))
            // external gaze pulls the pose look toward the target by gazeFollow
            p.lookX = Math.max(-1, Math.min(1, p.lookX + (gx - p.lookX) * e.gazeFollow + 0.3 * e.drift))
            p.lookY = Math.max(-1, Math.min(1, p.lookY + (gy - p.lookY) * e.gazeFollow + 0.16 * e.drift))
            for (const [x, y, r, what] of featurePoints(p)) {
              if (!insideFace(x, y, r - 2)) failures.push(`${e.id} k=${k} t=${t.toFixed(1)} g=${gx},${gy} ${what} @${x.toFixed(0)},${y.toFixed(0)}`)
            }
          }
        }
      }
    }
    const byEmotion: Record<string, number> = {}
    for (const f of failures) byEmotion[f.split(' ')[0]] = (byEmotion[f.split(' ')[0]] ?? 0) + 1
    expect({ byEmotion, sample: failures.slice(0, 6) }).toEqual({ byEmotion: {}, sample: [] })
  })
})

describe('tears stay on the face plate (never clipped)', () => {
  it('pool, drops and streams stay inside the plate across the whole cycle', async () => {
    const { framePose, FX_STATIC } = await import('../src/library/frame')
    const opts = { small: false, brows: true, shadow: true, minStroke: 0 }
    const bad: string[] = []
    for (const id of ['aggrieved', 'cry', 'sob'] as const) {
      for (const [gx, gy] of [[0, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const p = { ...targetPose(id, 1), lookX: gx, lookY: gy }
        for (let ph = 0; ph < 1; ph += 0.02) {
          const fr = framePose(p, { ...FX_STATIC, dropL: ph, dropR: ph }, opts)
          const [, tx, ty] = /translate\(([-\d.]+),([-\d.]+)\)/.exec(fr.tears.transform)!.map(Number)
          for (const n of ['poolL', 'poolR', 'dropL', 'dropR']) {
            if (Number(fr[n].opacity) < 0.05) continue
            const m = /translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+)\)/.exec(fr[n].transform)!
            const x = Number(m[1]) + tx, y = Number(m[2]) + ty, s = Number(m[3])
            // tear shape spans ±22 wide, -36..+32 tall at scale 1; tears sit inside the
            // face group, so plate-relative = local + features shift
            const fx = x, fy = y
            if (!insideFace(fx, fy + 32 * s, 22 * s) || !insideFace(fx, fy - 36 * s, 4)) bad.push(`${id} ${n} ph=${ph.toFixed(2)} g=${gx},${gy}`)
          }
          for (const n of ['streamL', 'streamR']) {
            if (Number(fr[n].opacity) < 0.05) continue
            const nums = fr[n].d.match(/-?[\d.]+/g)!.map(Number)
            const ex = nums[nums.length - 2] + tx, ey = nums[nums.length - 1] + ty
            if (!insideFace(ex, ey, 12)) bad.push(`${id} ${n} end ${ex.toFixed(0)},${ey.toFixed(0)} g=${gx},${gy}`)
          }
        }
      }
    }
    expect(bad.slice(0, 8)).toEqual([])
  })
})
