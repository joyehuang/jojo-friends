// Pure-compute benchmark (no DOM): pose composition + frame attribute generation
// per instance-frame, the part of the engine's work that is independent of the browser.
import { motionAmp, targetPose } from '../../src/library/config'
import { EMOTION_IDS, EMOTIONS } from '../../src/library/emotions'
import { framePose, FX_STATIC } from '../../src/library/frame'
import { addDelta } from '../../src/library/pose'
const opts = { small: false, brows: true, shadow: true, minStroke: 0 }
const N = 20000
const res: Record<string, number> = {}
for (const id of EMOTION_IDS) {
  const def = EMOTIONS[id]
  const base = targetPose(id, 0.7)
  let t = 0
  for (let i = 0; i < 2000; i++) framePose(base, FX_STATIC, opts) // warm-up
  const t0 = performance.now()
  for (let i = 0; i < N; i++) {
    t += 1 / 60
    const p = { ...base }
    addDelta(p, def.enter?.sample(t % 1), motionAmp(0.7))
    addDelta(p, def.loop?.(t), motionAmp(0.7))
    framePose(p, { ...FX_STATIC, dropL: t % 1, dropR: (t + 0.5) % 1, flow: t * 60, burst: t % 1 }, opts)
  }
  res[id] = +(((performance.now() - t0) / N) * 1000).toFixed(1)
}
const vals = Object.values(res)
console.log(JSON.stringify({ unit: 'microseconds per instance-frame (node ' + process.version + ')', perEmotion: res, max: Math.max(...vals), mean: +(vals.reduce((a, b) => a + b) / vals.length).toFixed(1) }, null, 1))
