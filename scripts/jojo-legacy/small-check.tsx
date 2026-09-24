// True-size renders (24/32/48px) of every emotion from the component, then a
// 4× nearest-neighbour zoom so single pixels can be inspected.
import sharp, { type OverlayOptions } from 'sharp'
import { EMOTION_LIST } from '../../src/library/emotions'
import { componentSvg, svgToPng } from '../sheet'

export async function smallSizesSheet(out: string) {
  const sizes = [24, 32, 48]
  const cell = 56, pad = 8
  const W = pad * 2 + EMOTION_LIST.length * cell
  const rows = sizes.length * 2
  const H = pad * 2 + rows * cell
  const layers: OverlayOptions[] = []
  sizes.forEach((px, si) => {
    for (const bg of [0, 1]) {
      EMOTION_LIST.forEach((e, i) => {
        const png = svgToPng(componentSvg({ emotion: e.id, size: px, intensity: 0.8 }), px)
        layers.push({ input: png, left: pad + i * cell + (cell - px) / 2, top: pad + (si * 2 + bg) * cell + (cell - px) / 2 })
      })
    }
  })
  const bgs: OverlayOptions[] = sizes.flatMap((_, si) => [0, 1].map((bg) => ({
    input: { create: { width: W, height: cell, channels: 4 as const, background: bg ? '#17182f' : '#f6f3ec' } },
    left: 0, top: pad + (si * 2 + bg) * cell,
  })))
  const base = await sharp({ create: { width: W, height: H, channels: 4, background: '#ffffff' } })
    .composite([...bgs, ...layers]).png().toBuffer()
  await sharp(base).resize(W * 4, H * 4, { kernel: 'nearest' }).png().toFile(out)
  await sharp(base).png().toFile(out.replace('.png', '-1x.png'))
}

if (process.argv[1]?.endsWith('small-check.tsx')) smallSizesSheet('out/small-sizes-check.png').then(() => console.log('ok'))
