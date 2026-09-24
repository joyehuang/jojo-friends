// @vitest-environment node
// Every character's task statuses read apart at true small size, in greyscale.
import { Resvg } from '@resvg/resvg-js'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AvatarStatic, CHARACTER_LIST, type StatusId } from '../src/library'

const ONLY = process.env.CHAR?.split(',')
const LIST = ONLY ? CHARACTER_LIST.filter((c) => ONLY.includes(c.id)) : CHARACTER_LIST

function gray(id: string, status: StatusId, px: number, bg: string) {
  const svg = renderToStaticMarkup(<AvatarStatic character={id} status={status} size={px} intensity={0.8} />)
  const d = new Resvg(svg, { fitTo: { mode: 'width', value: px }, background: bg }).render().pixels
  const out = new Float64Array(px * px)
  for (let i = 0; i < px * px; i++) out[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]
  return out
}
const differing = (a: Float64Array, b: Float64Array) => a.reduce((n, v, i) => n + (Math.abs(v - b[i]) > 40 ? 1 : 0), 0)

// Jojo's own suite (status-node.test.tsx) holds Jojo to ≥ 4 pixels at 24 px. The
// companions' dots sit in tighter notches, so their shapes have less room: they
// must differ by ≥ 4 clearly different pixels at 32 px and ≥ 2 at 24 px, on a
// light and a dark page (status is always spelled out in text as well).
describe('status shapes read apart at small sizes in greyscale, every character', () => {
  for (const ch of LIST) {
    it(`${ch.id}: idle / working / needs-input / success differ by real pixels on light and dark`, () => {
      const order: StatusId[] = ['idle', 'working', 'needs-input', 'success']
      for (const [px, min] of [[32, 4], [24, 2]] as const) {
        for (const bg of ['#f6f3ec', '#17182f']) {
          const imgs = order.map((s) => gray(ch.id, s, px, bg))
          for (let i = 0; i < order.length; i++)
            for (let j = i + 1; j < order.length; j++)
              expect(differing(imgs[i], imgs[j]), `${px}px ${bg} ${order[i]} vs ${order[j]}`).toBeGreaterThanOrEqual(min)
        }
      }
    })
  }
})
