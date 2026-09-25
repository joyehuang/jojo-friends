// Perceptual look-alike audit for the whole family, from the real component
// output. The silhouette IoU test in tests/characters.test.ts only proves two
// outlines are not identical; this looks at what a person sees at icon size:
// the calm face rendered at 24/32/48 px, in greyscale, compared pixel by pixel.
//   pnpm exec tsx scripts/distinctness.tsx [outDir]
// writes: blind (unlabelled, shuffled) greyscale sheets at 24/32/48/96 px,
// a labelled key, and distinctness.json with the closest pairs.
import { Resvg } from '@resvg/resvg-js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { AvatarStatic, CHARACTER_LIST, type Character } from '../src/library'

export const SIZES = [24, 32, 48] as const
const BG = '#f6f3ec'

/** Greyscale luminance (0..255) of the calm idle face at `px`, on the light page colour. */
export function grey(ch: string | Character, px: number, emotion: 'calm' | 'happy' = 'calm') {
  const svg = renderToStaticMarkup(<AvatarStatic character={ch} emotion={emotion} size={px} decorative />)
  const d = new Resvg(svg, { fitTo: { mode: 'width', value: px }, background: BG }).render().pixels
  const out = new Float64Array(px * px)
  for (let i = 0; i < px * px; i++) out[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]
  return out
}

/** Mean absolute greyscale difference, 0..1 (0 = the same picture). */
export function dist(a: Float64Array, b: Float64Array) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i])
  return s / a.length / 255
}

function zscore(a: Float64Array) {
  const m = a.reduce((s, v) => s + v, 0) / a.length
  const sd = Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length) || 1
  return a.map((v) => (v - m) / sd)
}

/** Normalised cross-correlation of two greyscale images, -1..1 (1 = the same light/dark layout). */
export function ncc(a: Float64Array, b: Float64Array) {
  const A = zscore(a), B = zscore(b)
  let s = 0
  for (let i = 0; i < A.length; i++) s += A[i] * B[i]
  return s / A.length
}

/**
 * Look-alike score for every pair: the normalised correlation of the calm
 * faces in greyscale, averaged over 24/32/48 px. Colour and overall
 * brightness are deliberately thrown away — what is left is the light/dark
 * layout (outline, plate position, eyes, mouth, notch) that makes two faces
 * read as "the same face" at icon size. `mad` (mean |Δgrey|) is reported too.
 */
export function pairDistances(list: readonly Character[] = CHARACTER_LIST) {
  const imgs = list.map((c) => SIZES.map((px) => grey(c, px)))
  const pairs: Array<{ a: string; b: string; ncc: number; mad: number }> = []
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const n = SIZES.reduce((s, _, k) => s + ncc(imgs[i][k], imgs[j][k]), 0) / SIZES.length
      const d = SIZES.reduce((s, _, k) => s + dist(imgs[i][k], imgs[j][k]), 0) / SIZES.length
      pairs.push({ a: list[i].id, b: list[j].id, ncc: +n.toFixed(3), mad: +d.toFixed(3) })
    }
  return pairs.sort((x, y) => y.ncc - x.ncc)
}

/** Deterministic shuffle so the blind sheet is reproducible (the key sheet names the order). */
export function blindOrder(seed = 20260925) {
  const ids = CHARACTER_LIST.map((c) => c.id)
  let s = seed
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]]
  }
  return ids
}

/** Every character at true pixel size, upscaled with no smoothing, in a grid per size; greyscale and unlabelled unless asked. */
export function blindSheetSvg(ids: readonly string[], opts: { labels?: boolean; greyscale?: boolean; sizes?: number[]; cols?: number } = {}) {
  const sizes = opts.sizes ?? [24, 32, 48, 96]
  const cols = opts.cols ?? 13
  const cell = 150, gap = 12, pad = 24, labelH = opts.labels ? 22 : 0, headH = 30
  const rowsPer = Math.ceil(ids.length / cols)
  const blockH = headH + rowsPer * (cell + labelH + gap)
  const W = pad * 2 + cols * (cell + gap)
  const H = pad * 2 + sizes.length * (blockH + gap)
  const blocks = sizes.map((px, b) => {
    const top = pad + b * (blockH + gap)
    const k = Math.floor(cell / px * 100) / 100
    const head = `<text x="${pad}" y="${top + 20}" font-size="18" font-family="Helvetica" fill="#6b6d8f">${px} px${px < 96 ? ` (×${k.toFixed(1)}, nearest-neighbour)` : ''}</text>`
    return head + ids.map((id, i) => {
      const x = pad + (i % cols) * (cell + gap), y = top + headH + Math.floor(i / cols) * (cell + labelH + gap)
      const svg = renderToStaticMarkup(<AvatarStatic character={id} size={px} decorative />)
      const png = new Resvg(svg, { fitTo: { mode: 'width', value: px }, background: BG }).render().asPng()
      const img = `<image x="${x}" y="${y}" width="${px * k}" height="${px * k}" image-rendering="pixelated" style="image-rendering:pixelated" href="data:image/png;base64,${Buffer.from(png).toString('base64')}"/>`
      const label = opts.labels ? `<text x="${x + cell / 2}" y="${y + cell + 16}" text-anchor="middle" font-size="15" font-family="Helvetica" fill="#2d3272">${id}</text>` : ''
      return img + label
    }).join('')
  }).join('')
  const filter = opts.greyscale === false ? '' : ' filter="url(#g)"'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><filter id="g"><feColorMatrix type="saturate" values="0"/></filter></defs><rect width="${W}" height="${H}" fill="${BG}"/><g${filter}>${blocks}</g></svg>`
}

export function sheetPng(svg: string) {
  return new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng()
}

if (process.argv[1]?.endsWith('distinctness.tsx')) {
  const out = process.argv[2] ?? 'out/distinctness'
  mkdirSync(out, { recursive: true })
  const order = blindOrder()
  writeFileSync(join(out, 'blind-greyscale.png'), sheetPng(blindSheetSvg(order)))
  writeFileSync(join(out, 'blind-key.png'), sheetPng(blindSheetSvg(order, { labels: true, greyscale: false })))
  const pairs = pairDistances()
  const nearest: Record<string, { to: string; ncc: number }> = {}
  for (const p of pairs) {
    if (!nearest[p.a] || p.ncc > nearest[p.a].ncc) nearest[p.a] = { to: p.b, ncc: p.ncc }
    if (!nearest[p.b] || p.ncc > nearest[p.b].ncc) nearest[p.b] = { to: p.a, ncc: p.ncc }
  }
  writeFileSync(join(out, 'distinctness.json'), JSON.stringify({ method: 'normalised cross-correlation of the calm face in greyscale at 24/32/48 px on #f6f3ec, averaged (1 = same light/dark layout); mad = mean |Δgrey| 0..1', blindOrder: order, closest: pairs.slice(0, 25), nearest }, null, 1))
  console.log(pairs.slice(0, 20).map((p) => `${p.a}/${p.b} ncc ${p.ncc.toFixed(3)} mad ${p.mad.toFixed(3)}`).join('\n'))
}
