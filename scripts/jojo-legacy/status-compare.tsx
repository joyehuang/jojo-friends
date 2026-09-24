// Side-by-side sheet of the three task statuses (working / needs-input /
// success) next to idle, from the real JojoStatic output (resvg), at hero
// size and true 32/24px on light and dark, plus a grayscale copy.
//   pnpm tsx scripts/status-compare.tsx [emotion] [outDir]
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp, { type OverlayOptions } from 'sharp'
import type { EmotionId } from '../../src/library/emotions'
import { STATUSES, type StatusId } from '../../src/library/status'
import { componentSvg, svgToPng } from '../sheet'

const ORDER: StatusId[] = ['idle', 'working', 'needs-input', 'success']

export async function statusCompare(emotion: EmotionId, outDir: string) {
  mkdirSync(outDir, { recursive: true })
  const hero = 300, gap = 24, pad = 32
  const colW = hero + gap
  const W = pad * 2 + ORDER.length * colW - gap
  const smallRow = 120
  const H = pad + 40 + hero + 40 + smallRow * 2 + pad
  const layers: OverlayOptions[] = []
  const texts: string[] = []
  ORDER.forEach((s, i) => {
    const x = pad + i * colW
    layers.push({ input: svgToPng(componentSvg({ emotion, status: s, size: hero, intensity: 0.8 }), hero), left: x, top: pad + 40 })
    texts.push(`<text x="${x + hero / 2}" y="${pad + 24}" text-anchor="middle" font-size="24" font-weight="700" fill="#2d3272">${STATUSES[s].label} · ${s}</text>`)
    for (const [row, bg] of [[0, '#f6f3ec'], [1, '#17182f']] as const) {
      const y = pad + 40 + hero + 40 + row * smallRow
      layers.push({ input: { create: { width: hero, height: smallRow - 12, channels: 4, background: bg } }, left: x, top: y })
      let cx = x + 20
      for (const px of [96, 32, 24]) {
        const png = svgToPng(componentSvg({ emotion, status: s, size: px, intensity: 0.8 }), px)
        layers.push({ input: png, left: cx, top: y + Math.round((smallRow - 12 - px) / 2) })
        cx += px + 34
      }
    }
  })
  const labels = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${texts.join('')}` +
      `<text x="${pad}" y="${H - 10}" font-size="14" fill="#6b6d8f">JojoStatic 实际输出（resvg 栅格化）· 表情 ${emotion} · 每格 96 / 32 / 24px，上米白下深色</text></svg>`,
  )
  const sheet = await sharp({ create: { width: W, height: H, channels: 4, background: '#fbfaf6' } })
    .composite([...layers, { input: labels, left: 0, top: 0 }])
    .png()
    .toBuffer()
  const base = join(outDir, `status-compare-${emotion}`)
  writeFileSync(`${base}.png`, sheet)
  await sharp(sheet).grayscale().png().toFile(`${base}-gray.png`)
  return base
}

if (process.argv[1]?.endsWith('status-compare.tsx')) {
  const [emotion = 'calm', out = 'out/status'] = process.argv.slice(2)
  statusCompare(emotion as EmotionId, out).then((b) => console.log(b))
}
