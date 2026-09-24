// @vitest-environment node
// Family-wide contract: every character, every emotion, every status.
// Run one character while authoring:  CHAR=o07 pnpm exec vitest run tests/characters.test.ts
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { AvatarStatic, CHARACTER_LIST, EMOTION_IDS, EMOTION_LIST, STATUS_IDS, type Character } from '../src/library'
import { discOutside, rotateShape, buildShape } from '../src/library/shapes'
import type { StatusId } from '../src/library/status'
import { plateViolations, statusViolations, tearViolations } from './helpers/geo'

const ONLY = process.env.CHAR?.split(',')
const LIST = ONLY ? CHARACTER_LIST.filter((c) => ONLY.includes(c.id)) : CHARACTER_LIST

describe('catalogue', () => {
  it.skipIf(!!ONLY)('has 26 characters with unique stable ids, numbers and names', () => {
    expect(CHARACTER_LIST.length).toBe(26)
    const uniq = (xs: unknown[]) => new Set(xs).size === xs.length
    expect(uniq(CHARACTER_LIST.map((c) => c.id))).toBe(true)
    expect(CHARACTER_LIST.map((c) => c.no)).toEqual(Array.from({ length: 26 }, (_, i) => i + 1))
    expect(uniq(CHARACTER_LIST.map((c) => c.name.en.toLowerCase()))).toBe(true)
    expect(uniq(CHARACTER_LIST.map((c) => c.name.zh))).toBe(true)
    for (const c of CHARACTER_LIST) expect(c.id).toMatch(/^[a-z][a-z0-9-]*$/)
    expect(CHARACTER_LIST[0].id).toBe('jojo')
  })

  it.skipIf(!!ONLY)('maps one-to-one onto the 26 authorised sources (hero + h-family 02–06 + options 01–20)', () => {
    const want = ['reference/hero-h.png', ...['02', '03', '04', '05', '06'].map((n) => `reference/h-family/${n}.png`),
      ...Array.from({ length: 20 }, (_, i) => `reference/options-20/${String(i + 1).padStart(2, '0')}.png`)]
    expect(CHARACTER_LIST.map((c) => c.source.file).sort()).toEqual(want.sort())
  })

  for (const ch of LIST) {
    it(`${ch.id}: source file exists, hash recorded, persona and form written`, () => {
      expect(existsSync(ch.source.file)).toBe(true)
      const h = createHash('sha256').update(readFileSync(ch.source.file)).digest('hex')
      expect(ch.source.sha256, `${ch.id} sha256 of the public copy`).toBe(h)
      expect(ch.persona.zh.length).toBeGreaterThan(6)
      expect(ch.persona.en.length).toBeGreaterThan(10)
      expect(ch.form.length).toBeGreaterThan(10)
    })
  }
})

describe('every character is its own design, not a recolour', () => {
  it.skipIf(!!ONLY)('no two characters share a shell + plate outline', () => {
    const sig = (c: Character) => `${c.shell.d}|${c.face.d}`
    expect(new Set(CHARACTER_LIST.map(sig)).size).toBe(CHARACTER_LIST.length)
  })

  it.skipIf(!!ONLY)('outlines differ in shape, not only in colour (silhouette IoU vs every other character < 0.97)', () => {
    // rasterise shell ∪ plate on a coarse grid in the shared canvas
    const mask = (c: Character) => {
      const m = new Uint8Array(96 * 96)
      const faceW = c.faceRotate ? buildShape(rotateShape({ type: 'poly', pts: c.face.poly.map(([x, y]) => [x, y] as [number, number]) }, c.faceRotate.deg, c.faceRotate.cx, c.faceRotate.cy)).poly : c.face.poly
      for (let j = 0; j < 96; j++) for (let i = 0; i < 96; i++) {
        const x = 190 + (i + 0.5) * (900 / 96), y = 160 + (j + 0.5) * (900 / 96)
        const inS = !discOutside(x, y, 0, c.shell.poly)
        const inF = !discOutside(x, y, 0, faceW)
        m[j * 96 + i] = (inS ? 1 : 0) | (inF ? 2 : 0)
      }
      return m
    }
    const ms = CHARACTER_LIST.map(mask)
    const pairs: string[] = []
    for (let a = 0; a < ms.length; a++) for (let b = a + 1; b < ms.length; b++) {
      let same = 0, any = 0
      for (let i = 0; i < ms[a].length; i++) {
        if (ms[a][i] || ms[b][i]) any++
        if (ms[a][i] === ms[b][i] && ms[a][i]) same++
      }
      if (same / any > 0.97) pairs.push(`${CHARACTER_LIST[a].id}/${CHARACTER_LIST[b].id} ${(same / any).toFixed(3)}`)
    }
    expect(pairs).toEqual([])
  })
})

describe('all 16 emotions × 6 statuses render as real vectors', () => {
  for (const ch of LIST) {
    it(`${ch.id}: 96 static SVGs, no NaN, the right layers, no raster`, () => {
      for (const e of EMOTION_IDS) {
        for (const s of STATUS_IDS) {
          const svg = renderToStaticMarkup(createElement(AvatarStatic, { character: ch.id, emotion: e, status: s, size: 96 }))
          expect(svg.startsWith('<svg')).toBe(true)
          expect(svg).not.toMatch(/NaN|undefined|Infinity|<image|data:image/)
          expect(svg).toContain(`data-character="${ch.id}"`)
          expect(svg).toContain(`data-emotion="${e}"`)
          expect(svg).toContain(`data-status="${s}"`)
          const has = (l: string) => svg.includes(`data-layer="${l}"`)
          expect(has('shell') && has('face') && has('eye-left') && has('eye-right') && has('mouth') && has('signal-dot')).toBe(true)
          expect(has('status-working')).toBe(s === 'working')
          expect(has('status-needs-input')).toBe(s === 'needs-input')
          expect(has('status-success')).toBe(s === 'success')
        }
      }
    })
  }

  it.skipIf(!!ONLY)('the same pose differs between characters (geometry is per character)', () => {
    const eyes = new Set(CHARACTER_LIST.map((c) => {
      const svg = renderToStaticMarkup(createElement(AvatarStatic, { character: c.id, emotion: 'happy', size: 96 }))
      return /data-part="eyeLPath" d="([^"]+)"/.exec(svg)![1] + /data-part="eyeL" transform="([^"]+)"/.exec(svg)![1]
    }))
    expect(eyes.size).toBe(CHARACTER_LIST.length)
  })
})

describe('features stay on each plate (every emotion × intensity × loop time × gaze)', () => {
  for (const ch of LIST) {
    it(`${ch.id}: eyes, mouth, brows and blush never leave the visible plate`, () => {
      const bad = plateViolations(ch, { step: 0.35 })
      const by: Record<string, number> = {}
      for (const b of bad) by[b.split(' ')[0]] = (by[b.split(' ')[0]] ?? 0) + 1
      expect({ by, sample: bad.slice(0, 5) }).toEqual({ by: {}, sample: [] })
    }, 60_000)

    it(`${ch.id}: tears stay on the plate through the whole drop cycle`, () => {
      expect(tearViolations(ch).slice(0, 6)).toEqual([])
    })
  }
})

/* ---------------- status shapes: in frame, off the plate ---------------- */

describe('status shapes: inside the frame and clear of the plate, every emotion × size', () => {
  for (const ch of LIST) {
    it(`${ch.id}: gauge / bubble / badge at rest and in every animated frame`, () => {
      expect(statusViolations(ch).slice(0, 8)).toEqual([])
    }, 60_000)
  }
})

describe('status never changes the face; the face never hides the status', () => {
  for (const ch of LIST) {
    it(`${ch.id}: face markup identical across all 6 statuses for every emotion`, () => {
      const face = (svg: string) => svg.replace(/<g data-part="gauge"[\s\S]*?<\/g>/, '')
        .match(/data-layer="face"[\s\S]*?data-layer="tears"/)![0]
      for (const e of EMOTION_IDS) {
        const base = face(renderToStaticMarkup(createElement(AvatarStatic, { character: ch.id, emotion: e, size: 96 })))
        for (const s of STATUS_IDS) {
          expect(face(renderToStaticMarkup(createElement(AvatarStatic, { character: ch.id, emotion: e, status: s as StatusId, size: 96 }))), `${e}/${s}`).toBe(base)
        }
      }
    })
  }
})

it.skipIf(!!ONLY)('covers 26 × 16 × 6 combinations', () => {
  expect(CHARACTER_LIST.length * EMOTION_LIST.length * STATUS_IDS.length).toBe(26 * 16 * 6)
})

describe('solved placement cache', () => {
  it.skipIf(!!ONLY)('solved.generated.ts matches a fresh solve of every spec (run scripts/gen-solved.ts if not)', async () => {
    const { solveAll } = await import('../scripts/gen-solved')
    const { SOLVED } = await import('../src/library/characters/solved.generated')
    expect(SOLVED).toEqual(solveAll())
    for (const c of CHARACTER_LIST) if (c.rig) expect(c.solved, c.id).toEqual(SOLVED[c.id])
  }, 120_000)
})
