// @vitest-environment node
// Design revisions: which characters changed, that nobody else did, that the
// changed ones really read apart, and that their provenance stays honest.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CHARACTER_LIST, CHARACTERS, designRevision } from '../src/library'
const JOJO = CHARACTERS.jojo
import { specHash } from '../src/library/character'
import { familyHashes, FIXTURE } from '../scripts/family-hashes'
import { pairDistances } from '../scripts/distinctness'

const REVISED = ['o05', 'o16', 'o07']
const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex')

describe('every character renders exactly its approved revision', () => {
  // A fingerprint covers all 16 emotions × 6 statuses × 4 sizes × 3 intensities,
  // gaze extremes, flat / tight variants and the animated first paint. Changing
  // a character's output means recording a new design revision and updating
  // the fixture deliberately (scripts/family-hashes.tsx --write).
  const fixture = JSON.parse(readFileSync(FIXTURE, 'utf8')) as ReturnType<typeof familyHashes>
  const now = familyHashes()
  for (const ch of CHARACTER_LIST) {
    it(`${ch.id}: revision ${designRevision(ch).revision}, output identical to the fixture`, () => {
      expect(now[ch.id].revision).toBe(fixture[ch.id].revision)
      expect(now[ch.id].emotions).toEqual(fixture[ch.id].emotions)
    })
  }

  it('only Pocket, Mino and Dotty are revised; Jojo and the other 22 are still the redraws of their sources', () => {
    expect(CHARACTER_LIST.filter((c) => designRevision(c).revision > 1).map((c) => c.id).sort()).toEqual([...REVISED].sort())
    expect(designRevision(JOJO)).toEqual({ revision: 1, fromSource: true, changes: [] })
    expect(JOJO.spec.design).toBeUndefined()
  })

  it('design notes never move the solved-placement hash (metadata only)', () => {
    const o05 = CHARACTERS.o05.spec
    const { design: _d, ...bare } = o05
    expect(specHash(o05)).toBe(specHash(bare))
  })
})

describe('revised characters keep an honest record of what they were', () => {
  for (const id of REVISED) {
    const ch = CHARACTERS[id]
    const d = designRevision(ch)
    it(`${id}: source art is untouched and still recorded; the superseded design is kept with its hash`, () => {
      expect(d.fromSource).toBe(false)
      expect(d.revision).toBe(2)
      expect(d.reason!.en.length).toBeGreaterThan(20)
      expect(d.reason!.zh.length).toBeGreaterThan(10)
      expect(d.changes.length).toBeGreaterThanOrEqual(2)
      // the original AI source stays the historical reference, byte for byte
      expect(sha(ch.source.file)).toBe(ch.source.sha256)
      // the superseded vector is kept and hashed
      expect(existsSync(d.previous!.file)).toBe(true)
      expect(sha(d.previous!.file)).toBe(d.previous!.sha256)
      expect(readFileSync(d.previous!.file, 'utf8')).toContain(`data-character="${id}"`)
      expect(d.previous!.form).not.toBe(ch.form)
    })
  }
})

describe('the family reads apart at icon size (greyscale, 24/32/48 px)', () => {
  // The silhouette-IoU test only proves two outlines aren't identical; r1 of
  // Pocket and Mino passed it and still read as Jojo. This compares what a
  // person sees: the light/dark layout of the calm face, colour thrown away
  // (normalised cross-correlation, 1 = same layout). r1 values in comments.
  const pairs = pairDistances()
  const get = (a: string, b: string) => pairs.find((p) => (p.a === a && p.b === b) || (p.a === b && p.b === a))!.ncc

  it('Pocket and Mino no longer share Jojo’s face (r1: 0.637 and 0.702)', () => {
    expect(get('jojo', 'o05')).toBeLessThan(0.45)
    expect(get('jojo', 'o16')).toBeLessThan(0.45)
  })

  it('Pocket, Mino and Kiri (Jojo’s other look-alikes) read apart from each other (r1: o01/o16 0.646)', () => {
    expect(get('o05', 'o16')).toBeLessThan(0.5)
    expect(get('o01', 'o05')).toBeLessThan(0.55)
    expect(get('o01', 'o16')).toBeLessThan(0.55)
  })

  it('Dotty no longer duplicates Zaza (r1: 0.738) and did not land on another character', () => {
    expect(get('h05', 'o07')).toBeLessThan(0.6)
    for (const p of pairs.filter((q) => q.a === 'o07' || q.b === 'o07')) expect(p.ncc, `${p.a}/${p.b}`).toBeLessThan(0.68)
  })

  it('no revised character is anyone’s closest match above 0.6', () => {
    for (const p of pairs.filter((q) => REVISED.includes(q.a) || REVISED.includes(q.b))) expect(p.ncc, `${p.a}/${p.b}`).toBeLessThan(0.65)
  })

  it('no pair in the family is closer than the current ceiling (0.75)', () => {
    expect(pairs[0].ncc).toBeLessThan(0.75)
  })
}, 60_000)
