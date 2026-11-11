// The avatar pack for apps that draw the family from static SVG files (for example a native
// client that cannot run React):
//
//   <out>/<id>/<emotion>-<px>.svg   the character with that emotion, at status idle
//   <out>/<id>/offline-<px>.svg     offline: sleepy and dimmed
//   <out>/boxes.json                painted bounds `[x, y, w, h]` of the character without its status layers, per
//                                   `<id>__<emotion>`, in view-box units
//   <out>/manifest.json             version, licences, ids, emotions, statuses, sizes
//
// Status is a second channel that never changes the face (docs/SPEC.md §3.4): the app draws it
// beside the character (a dot, a label, the offline dimming), so the pack has one file per
// emotion and no emotion × status grid. The script checks that promise for every character,
// emotion, status and size before it writes anything.
//
//   pnpm export:pack <out dir>
import { Resvg } from '@resvg/resvg-js'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHARACTER_IDS, EMOTION_IDS, STATUS_IDS } from '../src/library'
import { renderSvg } from '../src/library/render'

export const SIZES = [16, 20, 24, 32, 48, 64, 128] as const

/** The status layers, in markup order: everything from the first of these to the end of the body group. */
const STATUS_LAYERS = ['status-working', 'status-success-spark', 'signal-dot', 'status-needs-input']

/**
 * Smaller files, same picture: drop data-, aria- and style attributes and round coordinates
 * (|n| ≥ 10) to 0.1 of the 800-unit box. The root `style` carries the offline dimming as CSS;
 * native SVG renderers (resvg) read it more reliably as a group.
 */
export function minify(svg: string) {
  const root = /^<svg([^>]*?) style="([^"]*)"([^>]*)>/.exec(svg)
  if (root) {
    const style = root[2]
    const filter = /filter:([^;]+)/.exec(style)?.[1]
    const opacity = /opacity:([^;]+)/.exec(style)?.[1]
    const attrs = (filter ? ` filter="${filter}"` : '') + (opacity ? ` opacity="${opacity}"` : '')
    svg = `<svg${root[1]}${root[3]}>` + (attrs ? `<g${attrs}>` : '') + svg.slice(root[0].length, -'</svg>'.length) + (attrs ? '</g>' : '') + '</svg>'
  }
  return svg
    .replace(/ (data-(?!layer=)[a-z-]+|aria-hidden|focusable|style|overflow)="[^"]*"/g, '')
    .replace(/-?\d{2,}\.\d{2,}/g, (n) => {
      const r = Math.round(Number(n) * 10) / 10
      return Object.is(r, -0) ? '0' : String(r)
    })
}

function full(character: string, emotion: string, status: string, size: number) {
  return minify(
    renderSvg({ character, emotion: emotion as never, status: status as never, size, decorative: true, xmlDeclaration: false }),
  )
}

/** A render without its status layers: what the status must not change. */
export function face(svg: string) {
  const starts = STATUS_LAYERS.map((l) => svg.indexOf(`data-layer="${l}"`)).filter((i) => i >= 0)
  if (!starts.length) throw new Error('no status layer')
  const start = svg.lastIndexOf('<g', Math.min(...starts))
  // the body group closes right before the confetti
  const end = svg.lastIndexOf('</g>', svg.indexOf('<g data-layer="confetti"'))
  if (start < 0 || end < start) throw new Error('unexpected markup')
  return svg.slice(0, start) + svg.slice(end)
}

/** The `data-layer` hooks are only needed for the check; the files drop them. */
const strip = (s: string) => s.replace(/ data-layer="[^"]*"/g, '')

/** Painted bounds in view-box units, from the alpha of a 1024 px raster. */
function bounds(svg: string): number[] {
  const [vx, vy, vw, vh] = /viewBox="([^"]+)"/.exec(svg)![1].split(' ').map(Number)
  const px = 1024
  const img = new Resvg(svg, { fitTo: { mode: 'width', value: px }, font: { loadSystemFonts: false } }).render()
  const { width, height, pixels } = img
  let x0 = width, y0 = height, x1 = -1, y1 = -1
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (pixels[(y * width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
  const k = vw / width
  const r = (n: number) => Math.round(n * 10) / 10
  return [r(vx + x0 * k), r(vy + y0 * (vh / height)), r((x1 + 1 - x0) * k), r((y1 + 1 - y0) * (vh / height))]
}

function main() {
  const out = process.argv[2]
  if (!out) throw new Error('usage: pnpm export:pack <out dir>')
  rmSync(out, { recursive: true, force: true })
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  const boxes: Record<string, number[]> = {}
  let files = 0, bytes = 0
  const write = (path: string, svg: string) => {
    writeFileSync(path, svg + '\n')
    files++
    bytes += svg.length + 1
  }
  for (const c of CHARACTER_IDS) {
    mkdirSync(join(out, c), { recursive: true })
    for (const px of SIZES) {
      for (const e of EMOTION_IDS) {
        const idle = full(c, e, 'idle', px)
        for (const s of STATUS_IDS) {
          if (s === 'idle' || s === 'offline') continue
          if (face(full(c, e, s, px)) !== face(idle)) throw new Error(`${c} ${e} ${s} ${px}: the status changed the face`)
        }
        const svg = strip(idle)
        write(join(out, c, `${e}-${px}.svg`), svg)
        // the character alone, at 64 px (no drop shadow): apps that fit it into a tile leave the status out
        if (px === 64) boxes[`${c}__${e}`] = bounds(strip(face(idle)))
      }
      write(join(out, c, `offline-${px}.svg`), strip(full(c, 'sleepy', 'offline', px)))
    }
  }
  writeFileSync(join(out, 'boxes.json'), JSON.stringify(boxes) + '\n')
  writeFileSync(
    join(out, 'manifest.json'),
    JSON.stringify(
      {
        name: 'jojo-friends avatar pack',
        version: pkg.version,
        license: { code: 'MIT', art: 'CC-BY-4.0' },
        attribution: 'Jojo & Friends by Joye Huang, https://github.com/joyehuang/jojo-friends, CC BY 4.0',
        characters: CHARACTER_IDS,
        emotions: EMOTION_IDS,
        statuses: STATUS_IDS,
        sizes: SIZES,
        files: { emotion: '<id>/<emotion>-<px>.svg', offline: '<id>/offline-<px>.svg' },
      },
      null,
      2,
    ) + '\n',
  )
  console.log(`${files} files, ${(bytes / 1e6).toFixed(2)} MB`)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
