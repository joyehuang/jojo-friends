// Tiny synthesized sound effects (no audio files): a bright blip for each
// harvested piece landing in the basket, a two-note ding for an answer.
let ctx: AudioContext | null = null
let last = 0

function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(a: AudioContext, at: number, from: number, to: number, dur: number, gain: number, type: OscillatorType = 'sine') {
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(from, at)
  o.frequency.exponentialRampToValueAtTime(to, at + dur * 0.6)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(gain, at + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  o.connect(g).connect(a.destination)
  o.start(at)
  o.stop(at + dur + 0.02)
}

export function play(kind: 'harvest' | 'answer') {
  const a = audio()
  if (!a) return
  const now = a.currentTime
  if (kind === 'harvest') {
    // landings come in quick bursts: step the pitch up a little each time
    const step = now - last < 0.4 ? 1.12 : 1
    last = now
    const base = 620 * step
    tone(a, now, base, base * 1.6, 0.18, 0.08, 'triangle')
  } else {
    tone(a, now, 880, 880, 0.22, 0.07)
    tone(a, now + 0.11, 1320, 1320, 0.3, 0.06)
  }
}
