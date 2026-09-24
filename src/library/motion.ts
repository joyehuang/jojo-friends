import type { PoseDelta, PoseKey } from './pose'

export type Track = {
  /** seconds */
  duration: number
  sample: (t: number) => PoseDelta | undefined
}

const smooth = (x: number) => x * x * (3 - 2 * x)

/**
 * Keyframed additive accent. Starts and ends at zero, eases between keys with
 * smoothstep so anticipation → action → settle never pops.
 */
export function track(keys: Array<[number, PoseDelta]>): Track {
  const all: Array<[number, PoseDelta]> = [[0, {}], ...keys]
  const duration = all[all.length - 1][0]
  if (Object.keys(all[all.length - 1][1]).length) throw new Error('track must end at rest ({})')
  const names = new Set<PoseKey>()
  for (const [, d] of all) for (const k in d) names.add(k as PoseKey)
  return {
    duration,
    sample(t) {
      if (t <= 0 || t >= duration) return undefined
      let i = 1
      while (i < all.length && all[i][0] < t) i++
      const [t0, a] = all[i - 1]
      const [t1, b] = all[i]
      const u = smooth((t - t0) / Math.max(1e-6, t1 - t0))
      const out: PoseDelta = {}
      for (const k of names) {
        const va = a[k] ?? 0
        const vb = b[k] ?? 0
        if (va || vb) out[k] = va + (vb - va) * u
      }
      return out
    },
  }
}

/** A single smooth bump: 0 → 1 → 0 across [start, start+width]. */
export function bump(t: number, start: number, width: number) {
  const x = (t - start) / width
  if (x <= 0 || x >= 1) return 0
  return Math.sin(Math.PI * x) ** 2
}

/** Holds value a, eases to b at `at` over `ease` seconds (periodic helper). */
export function stepTo(t: number, at: number, ease: number) {
  if (t <= at) return 0
  if (t >= at + ease) return 1
  return smooth((t - at) / ease)
}

export const TAU = Math.PI * 2
