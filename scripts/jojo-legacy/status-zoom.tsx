// True-size 24/32px renders of the status shapes, zoomed 8× (nearest) so
// single pixels can be inspected. Light and dark rows, grayscale copy.
import sharp, { type OverlayOptions } from 'sharp'
import type { EmotionId } from '../../src/library/emotions'
import type { StatusId } from '../../src/library/status'
import { componentSvg, svgToPng } from '../sheet'

const ORDER: StatusId[] = ['idle', 'working', 'needs-input', 'success', 'error', 'offline']

export async function statusZoom(emotions: EmotionId[], out: string) {
  const cell = 44
  const W = ORDER.length * 2 * cell
  const H = emotions.length * 2 * cell
  const layers: OverlayOptions[] = []
  emotions.forEach((e, ei) => {
    for (const bg of [0, 1]) {
      const y = (ei * 2 + bg) * cell
      layers.push({ input: { create: { width: W, height: cell, channels: 4, background: bg ? '#17182f' : '#f6f3ec' } }, left: 0, top: y })
      ORDER.forEach((s, si) => {
        ;[32, 24].forEach((px, k) => {
          const png = svgToPng(componentSvg({ emotion: e, status: s, size: px, intensity: 0.8 }), px)
          layers.push({ input: png, left: (si * 2 + k) * cell + (cell - px) / 2, top: y + (cell - px) / 2 })
        })
      })
    }
  })
  const base = await sharp({ create: { width: W, height: H, channels: 4, background: '#fff' } }).composite(layers).png().toBuffer()
  await sharp(base).resize(W * 6, H * 6, { kernel: 'nearest' }).png().toFile(out)
  await sharp(base).resize(W * 6, H * 6, { kernel: 'nearest' }).grayscale().png().toFile(out.replace('.png', '-gray.png'))
  await sharp(base).png().toFile(out.replace('.png', '-1x.png'))
}

if (process.argv[1]?.endsWith('status-zoom.tsx')) {
  const [out = 'out/status/status-small-zoom.png', ...em] = process.argv.slice(2)
  statusZoom((em.length ? em : ['calm']) as EmotionId[], out).then(() => console.log(out))
}
