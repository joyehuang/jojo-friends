// @vitest-environment node
import { Resvg } from '@resvg/resvg-js'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { baselineHashes } from '../scripts/baseline-hashes'
import { JojoStatic } from '../src/library/Jojo'
import { resolveConfig, targetPose } from '../src/library/config'
import { EMOTION_IDS } from '../src/library/emotions'
import { staticFx } from '../src/library/engine'
import { FX_STATIC } from '../src/library/frame'
import { DOT, FACE_BOX, PIVOT, VIEWBOX } from '../src/library/geometry'
import type { Pose } from '../src/library/pose'
import { statusBounds, type Box } from '../src/library/signals'
import { STATUSES, type StatusId } from '../src/library/status'

const TASK = ['working', 'needs-input', 'success'] as const

function gray(status: StatusId, px: number, bg: string, emotion: (typeof EMOTION_IDS)[number] = 'calm') {
  const svg = renderToStaticMarkup(<JojoStatic emotion={emotion} status={status} size={px} intensity={0.8} />)
  const img = new Resvg(svg, { fitTo: { mode: 'width', value: px }, background: bg }).render()
  const d = img.pixels
  const out = new Float64Array(px * px)
  for (let i = 0; i < px * px; i++) out[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]
  return out
}
const differing = (a: Float64Array, b: Float64Array) => a.reduce((n, v, i) => n + (Math.abs(v - b[i]) > 40 ? 1 : 0), 0)

describe('status shapes read apart in grayscale at true size', () => {
  for (const px of [24, 32]) {
    for (const bg of ['#f6f3ec', '#17182f']) {
      it(`${px}px on ${bg}: idle / working / needs-input / success all differ by real pixels`, () => {
        const order: StatusId[] = ['idle', ...TASK]
        const imgs = order.map((s) => gray(s, px, bg))
        for (let i = 0; i < order.length; i++) {
          for (let j = i + 1; j < order.length; j++) {
            // ≥ 4 clearly different grey pixels at 24px, more at 32px
            expect(differing(imgs[i], imgs[j]), `${order[i]} vs ${order[j]}`).toBeGreaterThanOrEqual(px === 24 ? 4 : 7)
          }
        }
      })
    }
  }

  it('holds for every emotion at 24px (not just calm)', () => {
    for (const e of EMOTION_IDS) {
      const imgs = (['idle', ...TASK] as StatusId[]).map((s) => gray(s, 24, '#f6f3ec', e))
      for (let i = 0; i < imgs.length; i++)
        for (let j = i + 1; j < imgs.length; j++) expect(differing(imgs[i], imgs[j]), `${e} ${i}/${j}`).toBeGreaterThanOrEqual(4)
    }
  }, 60_000)
})

/* body transform: translate(tx,ty) translate(P) rotate(rot) scale(sx,sy) translate(-P) */
function toView(p: Pose, x: number, y: number) {
  const r = (p.rot * Math.PI) / 180
  const dx = (x - PIVOT.x) * p.sx, dy = (y - PIVOT.y) * p.sy
  return { x: PIVOT.x + dx * Math.cos(r) - dy * Math.sin(r) + p.tx, y: PIVOT.y + dx * Math.sin(r) + dy * Math.cos(r) + p.ty }
}
function viewBox(p: Pose, b: Box) {
  const pts = [toView(p, b.x0, b.y0), toView(p, b.x1, b.y0), toView(p, b.x0, b.y1), toView(p, b.x1, b.y1)]
  return { x0: Math.min(...pts.map((q) => q.x)), x1: Math.max(...pts.map((q) => q.x)), y0: Math.min(...pts.map((q) => q.y)), y1: Math.max(...pts.map((q) => q.y)) }
}

describe('16 emotions × 3 statuses: no clipping, no covering the face', () => {
  const cases: string[] = []
  for (const size of [24, 32, 96, 240]) {
   it(`${size}px: every shape, at rest and in every animated frame, stays in frame and off the face`, () => {
    for (const e of EMOTION_IDS) {
      for (const s of TASK) {
        const cfg = resolveConfig({ emotion: e, status: s, size, intensity: 0.8 }, true)
        const p = targetPose(e, 0.8)
        const vb = VIEWBOX[cfg.framing]
        // idle dot's own top (the kit already lets a raised dot touch the edge)
        const dotTop = viewBox(p, { x0: DOT.cx + p.dotX, x1: DOT.cx + p.dotX, y0: DOT.cy + p.dotY - DOT.r * p.dotS, y1: DOT.cy + p.dotY - DOT.r * p.dotS }).y0
        // rest pose plus every animated frame of the entry / loop
        const fxs = [staticFx(cfg)]
        for (let t = 0; t <= 3; t += 1 / 30) fxs.push({ ...FX_STATIC, ...STATUSES[s].still, ...STATUSES[s].live!(t, true) })
        for (const fx of fxs) {
          const shell = statusBounds(s, p, fx, cfg.frame.small)
          const v = viewBox(p, shell)
          const key = `${e}/${s}/${size}`
          expect(shell.y1, `${key} reaches the face plate`).toBeLessThan(FACE_BOX.y0)
          expect(v.x0, `${key} left`).toBeGreaterThanOrEqual(vb.x)
          expect(v.x1, `${key} right`).toBeLessThanOrEqual(vb.x + vb.w)
          expect(v.y1, `${key} bottom`).toBeLessThanOrEqual(vb.y + vb.h)
          expect(v.y0, `${key} top`).toBeGreaterThanOrEqual(Math.min(vb.y, dotTop) - 0.5)
        }
        cases.push(`${e}/${s}/${size}`)
      }
    }
   }, 30_000)
  }
  it('covers 16 × 3 × 4 sizes', () => expect(cases.length).toBe(16 * 3 * 4))
})

describe('approved baseline is untouched', () => {
  it('static SVG markup of all 16 emotions × idle/error/offline × 4 sizes (and first paint) is byte-identical to commit 1c6ed7e', () => {
    const want = JSON.parse(readFileSync(new URL('./fixtures/baseline-hashes.json', import.meta.url), 'utf8')) as Record<string, string>
    const got = baselineHashes()
    expect(Object.keys(got).length).toBe(240)
    expect(got).toEqual(want)
  })
})
