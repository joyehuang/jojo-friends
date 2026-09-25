// Fingerprints every character's exact component output: for each emotion, a
// sha256 over the static markup of all 6 statuses × 4 sizes × 3 intensities,
// gaze extremes, flat / tight variants, and the animated <Avatar>'s first paint.
// tests/fixtures/family-hashes.json holds the fingerprints of the last
// approved design of each character; the test fails if a character's output
// changes without its design revision being bumped deliberately.
//   pnpm exec tsx scripts/family-hashes.tsx            (print)
//   pnpm exec tsx scripts/family-hashes.tsx --write    (update the fixture)
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { Avatar, AvatarStatic, CHARACTER_LIST, designRevision, EMOTION_IDS, STATUS_IDS, type Character, type EmotionId } from '../src/library'

export const FIXTURE = 'tests/fixtures/family-hashes.json'
const SIZES = [512, 96, 32, 24] as const
const GAZES = [{ x: 1, y: 1 }, { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }] as const
const sha = (s: string) => createHash('sha256').update(s).digest('hex')

export function emotionFingerprint(ch: Character, e: EmotionId) {
  const h = createHash('sha256')
  const add = (s: string) => h.update(sha(s))
  for (const s of STATUS_IDS) {
    for (const px of SIZES) for (const k of [0.3, 0.8, 1]) add(renderToStaticMarkup(<AvatarStatic character={ch.id} emotion={e} status={s} size={px} intensity={k} />))
    add(renderToStaticMarkup(<Avatar character={ch.id} emotion={e} status={s} size={96} intensity={0.8} />))
  }
  for (const g of GAZES) add(renderToStaticMarkup(<AvatarStatic character={ch.id} emotion={e} gaze={g} size={240} intensity={1} />))
  add(renderToStaticMarkup(<AvatarStatic character={ch.id} emotion={e} size={240} flat framing='tight' shadow={false} />))
  add(renderToStaticMarkup(<AvatarStatic character={ch.id} emotion={e} size={48} flat={false} framing='full' shadow brows />))
  return h.digest('hex').slice(0, 32)
}

export interface FamilyFingerprint { revision: number; emotions: Record<string, string> }

export function familyHashes(list: readonly Character[] = CHARACTER_LIST) {
  const out: Record<string, FamilyFingerprint> = {}
  for (const ch of list) out[ch.id] = { revision: designRevision(ch).revision, emotions: Object.fromEntries(EMOTION_IDS.map((e) => [e, emotionFingerprint(ch, e)])) }
  return out
}

if (process.argv[1]?.endsWith('family-hashes.tsx')) {
  const text = JSON.stringify(familyHashes(), null, 1) + '\n'
  if (process.argv.includes('--write')) {
    writeFileSync(FIXTURE, text)
    console.log('wrote', FIXTURE)
  } else process.stdout.write(text)
}
