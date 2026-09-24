// Identity check: the calm vector master of each character, rendered in its
// source image's own framing, against the source pixels.
//   pnpm exec tsx scripts/ref/identity.tsx [id ...] [--out dir]
// Writes <out>/<id>-identity.png (source | vector | difference) and prints
// per-colour IoU. Classes come from the source's own flat palette (plus the
// paper and the drop shadow, which are never scored), so the score says "same
// shapes in the same places", not "same anti-aliasing".
import { Resvg } from '@resvg/resvg-js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { CHARACTER_LIST, type Character } from '../../src/library'
import { renderSvg } from '../../src/library/render'
import { loadRgb, measure } from './measure'

export interface IdentityResult {
  id: string
  file: string
  iou: Record<string, number>
  /** area-weighted mean IoU over the character's colour classes */
  mean: number
}

export function sourceFrameSvg(ch: Character, size: number) {
  const s = ch.fit.s
  const vb = `${ch.fit.tx} ${ch.fit.ty} ${ch.source.size * s} ${ch.source.size * s}`
  const svg = renderSvg({ character: ch, emotion: 'calm', size: 900, flat: true, shadow: false, brows: false, framing: 'full', xmlDeclaration: false, decorative: true })
  return svg
    .replace(/viewBox="[^"]+"/, `viewBox="${vb}"`)
    .replace(/ width="900" height="900"/, ` width="${size}" height="${size}"`)
}

export async function identity(ch: Character, outDir?: string): Promise<IdentityResult> {
  const file = ch.source.file
  const m = await measure(file)
  const src = await loadRgb(file)
  const W = src.w
  const svg = sourceFrameSvg(ch, W)
  const bgHex = m.bg
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W }, background: bgHex }).render().asPng()
  const ren = await loadRgb(png)
  const pal = m.palette.map((p) => [parseInt(p.color.slice(1, 3), 16), parseInt(p.color.slice(3, 5), 16), parseInt(p.color.slice(5, 7), 16)])
  const bg = [parseInt(bgHex.slice(1, 3), 16), parseInt(bgHex.slice(3, 5), 16), parseInt(bgHex.slice(5, 7), 16)]
  // the flat drop shadow (warm ink at ~10 % over the paper) is its own class, so a
  // cream shell or plate a few levels away from it is not credited with the shadow
  const shadow = bg.map((v, i) => v * 0.9 + [0x5e, 0x48, 0x28][i] * 0.1)
  const cls = (d: Buffer, i: number) => {
    const c = [d[i * 3], d[i * 3 + 1], d[i * 3 + 2]]
    const dist = (q: number[]) => (c[0] - q[0]) ** 2 + (c[1] - q[1]) ** 2 + (c[2] - q[2]) ** 2
    let best = -1, bd = Math.min(40 ** 2, dist(bg), dist(shadow))
    pal.forEach((q, k) => {
      const dd = dist(q)
      if (dd < bd) { bd = dd; best = k }
    })
    return best
  }
  const inter = new Array(pal.length).fill(0), uni = new Array(pal.length).fill(0), area = new Array(pal.length).fill(0)
  const diff = Buffer.alloc(W * W * 3)
  for (let i = 0; i < W * W; i++) {
    const a = cls(src.data, i), b = cls(ren.data, i)
    for (let k = 0; k < pal.length; k++) {
      const ia = a === k, ib = b === k
      if (ia) area[k]++
      if (ia && ib) inter[k]++
      if (ia || ib) uni[k]++
    }
    // difference view: agree = faded source, source-only = magenta, vector-only = cyan
    const o = i * 3
    if (a === b) {
      diff[o] = 235 - (235 - src.data[o]) * 0.35
      diff[o + 1] = 235 - (235 - src.data[o + 1]) * 0.35
      diff[o + 2] = 235 - (235 - src.data[o + 2]) * 0.35
    } else if (a >= 0 && b !== a) {
      diff[o] = 230; diff[o + 1] = 30; diff[o + 2] = 160
    } else {
      diff[o] = 20; diff[o + 1] = 170; diff[o + 2] = 220
    }
  }
  // score only the classes the character is made of (shell, plate, ink, dot)
  const want = new Set(
    [ch.palette.shell, ch.palette.face, ch.palette.ink, ch.palette.dot].map((h) => {
      const q = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
      let best = 0, bd = Infinity
      pal.forEach((c, k) => {
        const dd = (c[0] - q[0]) ** 2 + (c[1] - q[1]) ** 2 + (c[2] - q[2]) ** 2
        if (dd < bd) { bd = dd; best = k }
      })
      return best
    }),
  )
  const iou: Record<string, number> = {}
  let num = 0, den = 0
  m.palette.forEach((p, k) => {
    if (!want.has(k) || area[k] < W * W * 0.001) return
    const v = inter[k] / Math.max(1, uni[k])
    iou[p.color] = +v.toFixed(4)
    num += v * area[k]
    den += area[k]
  })
  const res: IdentityResult = { id: ch.id, file, iou, mean: +(num / Math.max(1, den)).toFixed(4) }
  if (outDir) {
    mkdirSync(outDir, { recursive: true })
    const tile = 384
    const [a, b, c] = await Promise.all([
      sharp(src.data, { raw: { width: W, height: W, channels: 3 } }).resize(tile, tile).png().toBuffer(),
      sharp(png).resize(tile, tile).png().toBuffer(),
      sharp(diff, { raw: { width: W, height: W, channels: 3 } }).resize(tile, tile).png().toBuffer(),
    ])
    await sharp({ create: { width: tile * 3 + 16, height: tile, channels: 3, background: '#ffffff' } })
      .composite([{ input: a, left: 0, top: 0 }, { input: b, left: tile + 8, top: 0 }, { input: c, left: tile * 2 + 16, top: 0 }])
      .png()
      .toFile(join(outDir, `${ch.id}-identity.png`))
  }
  return res
}

if (process.argv[1]?.endsWith('identity.tsx')) {
  const args = process.argv.slice(2)
  const oi = args.indexOf('--out')
  const out = oi >= 0 ? args[oi + 1] : 'out/identity'
  const ids = args.filter((a, i) => !a.startsWith('--') && (oi < 0 || i !== oi + 1))
  const list = ids.length ? CHARACTER_LIST.filter((c) => ids.includes(c.id)) : CHARACTER_LIST
  ;(async () => {
    const all: IdentityResult[] = []
    for (const ch of list) {
      const r = await identity(ch, out)
      all.push(r)
      console.log(`${ch.id.padEnd(6)} mean IoU ${r.mean.toFixed(3)}  ${Object.entries(r.iou).map(([k, v]) => `${k}:${v.toFixed(3)}`).join('  ')}`)
    }
    writeFileSync(join(out, 'identity.json'), JSON.stringify(all, null, 1))
  })()
}
