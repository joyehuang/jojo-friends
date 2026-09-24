// sha256 of JojoStatic's exact SVG markup for every emotion × idle/error/offline
// × size, plus the animated <Jojo>'s first-paint markup. Run on the approved
// commit to create tests/fixtures/baseline-hashes.json; the test re-runs it.
import { createHash } from 'node:crypto'
import { renderToStaticMarkup } from 'react-dom/server'
import { Jojo, JojoStatic } from '../src/library/Jojo'
import { EMOTION_IDS } from '../src/library/emotions'

export const BASE_STATUSES = ['idle', 'error', 'offline'] as const
export const BASE_SIZES = [512, 96, 32, 24] as const
const sha = (s: string) => createHash('sha256').update(s).digest('hex')

export function baselineHashes() {
  const out: Record<string, string> = {}
  for (const e of EMOTION_IDS) {
    for (const s of BASE_STATUSES) {
      for (const px of BASE_SIZES) {
        out[`static/${e}/${s}/${px}`] = sha(renderToStaticMarkup(<JojoStatic emotion={e} status={s} size={px} intensity={0.8} />))
      }
      out[`animated-first-paint/${e}/${s}/96`] = sha(renderToStaticMarkup(<Jojo emotion={e} status={s} size={96} intensity={0.8} />))
    }
  }
  return out
}

if (process.argv[1]?.endsWith('baseline-hashes.tsx')) console.log(JSON.stringify(baselineHashes(), null, 1))
