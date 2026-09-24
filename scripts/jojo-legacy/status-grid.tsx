// All 16 emotions × working / needs-input / success from the real JojoStatic
// output (resvg): 120px (full framing) and 32px (tight framing) per cell,
// used to check that no status shape is clipped or covers the face.
import sharp, { type OverlayOptions } from 'sharp'
import { EMOTION_LIST } from '../../src/library/emotions'
import type { StatusId } from '../../src/library/status'
import { componentSvg, svgToPng } from '../sheet'

const COLS: StatusId[] = ['working', 'needs-input', 'success']

export async function statusGrid(out: string) {
  const big = 120, small = 32, cellW = big + small + 36, cellH = big + 16, labW = 0
  const W = labW + COLS.length * cellW * 2
  const rows = Math.ceil(EMOTION_LIST.length / 2)
  const H = rows * cellH
  const layers: OverlayOptions[] = []
  EMOTION_LIST.forEach((e, i) => {
    const half = i % 2, r = Math.floor(i / 2)
    COLS.forEach((s, c) => {
      const x = labW + (half * COLS.length + c) * cellW
      const y = r * cellH
      layers.push({ input: { create: { width: cellW - 4, height: cellH - 4, channels: 4, background: (r + c + half) % 2 ? '#f6f3ec' : '#ece8de' } }, left: x, top: y })
      layers.push({ input: svgToPng(componentSvg({ emotion: e.id, status: s, size: big, intensity: 0.8 }), big), left: x + 6, top: y + 6 })
      layers.push({ input: svgToPng(componentSvg({ emotion: e.id, status: s, size: small, intensity: 0.8 }), small), left: x + big + 18, top: y + 50 })
    })
  })
  await sharp({ create: { width: W, height: H, channels: 4, background: '#fff' } }).composite(layers).png().toFile(out)
}

if (process.argv[1]?.endsWith('status-grid.tsx')) statusGrid(process.argv[2] ?? 'out/status/status-grid-16x3.png').then(() => console.log('ok'))
