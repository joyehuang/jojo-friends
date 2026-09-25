// @vitest-environment node
// The site's static avatars are centred on the character itself (shell, plate
// and signal dot — not the drop shadow), all by the same rule as the private
// standard avatar files. The rule's geometry is analytic; this checks it
// against the real rendered alpha mask of every character.
import { Resvg } from '@resvg/resvg-js'
import { describe, expect, it } from 'vitest'
import { CHARACTER_LIST } from '../src/library'
import { VIEWBOX } from '../src/library/geometry'
import { renderSvg } from '../src/library/render'
import { centreShift, framePlacement, SAFE_R, SIZE, subjectGeometry } from '../src/site/avatar-frame'

function alphaBox(id: string) {
  const px = 900
  const svg = renderSvg({ character: id, size: px, shadow: false, framing: 'full', xmlDeclaration: false, decorative: true })
  const img = new Resvg(svg, { fitTo: { mode: 'width', value: px }, font: { loadSystemFonts: false } }).render()
  const d = img.pixels
  let x0 = px, y0 = px, x1 = 0, y1 = 0
  for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) if (d[(y * px + x) * 4 + 3] >= 128) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1)
  }
  const vb = VIEWBOX.full
  return { x0: vb.x + x0, y0: vb.y + y0, x1: vb.x + x1, y1: vb.y + y1 }
}

describe('avatar centring', () => {
  it.each(CHARACTER_LIST.map((c) => [c.id, c] as const))('%s: analytic subject box matches the rendered alpha mask (±1.5 units of 900)', (_, ch) => {
    const g = subjectGeometry(ch)
    const a = alphaBox(ch.id)
    for (const k of ['x0', 'y0', 'x1', 'y1'] as const) expect(Math.abs(g.box[k] - a[k]), k).toBeLessThanOrEqual(1.5)
  })

  it('the placement puts every subject centre on the box centre and scales to the same safe radius', () => {
    const vb = VIEWBOX.full
    for (const ch of CHARACTER_LIST) {
      const p = framePlacement(ch)
      const g = subjectGeometry(ch)
      const u = p.width / 100 / vb.w
      const cx = p.left / 100 + (g.cx - vb.x) * u
      const cy = p.top / 100 + (g.cy - vb.y) * u
      expect(Math.abs(cx - 0.5) * SIZE, ch.id).toBeLessThan(0.01)
      expect(Math.abs(cy - 0.5) * SIZE, ch.id).toBeLessThan(0.01)
      expect(g.radius * u * SIZE, ch.id).toBeCloseTo(SAFE_R, 3)
    }
  })

  it('the fixed-size shift is constant per character (never per frame) and uses the framing the library will pick', () => {
    const jojo = CHARACTER_LIST[0]
    expect(centreShift(jojo, 260)).toEqual(centreShift(jojo, 320))
    expect(centreShift(jojo, 48)).not.toEqual(centreShift(jojo, 260))
    // Jojo's full framing leaves shadow room down-right: the subject sits up-left of centre
    const s = centreShift(jojo, 260)
    expect(s.x).toBeGreaterThan(1)
    expect(s.y).toBeGreaterThan(0.5)
  })
})
