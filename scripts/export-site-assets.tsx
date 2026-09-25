// Builds every downloadable file the site links to, from the real component
// output, into public/ (served as-is by Vite, copied to dist/):
//   public/downloads/<id>/<id>.svg              calm master (512, with shadow)
//   public/downloads/<id>/<id>-512.png|.webp     transparent raster of the same
//   public/downloads/<id>/<id>-emotions.svg      16-emotion contact sheet (vector)
//   public/downloads/<id>/<id>-kit.zip           all 16 emotions × 6 statuses as SVG + the above
//   public/downloads/jojo-friends-kit.zip        the whole family + manifest
//   public/reference/…                           the AI-generated source art (shown on each page)
//   public/favicon.svg
// Runs in `pnpm build`, so a deployment always ships assets from its own commit.
import { Resvg } from '@resvg/resvg-js'
import { strToU8, zipSync, type Zippable } from 'fflate'
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import sharp from 'sharp'
import { AvatarStatic, CHARACTER_LIST, designRevision, EMOTION_LIST, STATUS_LIST, type Character } from '../src/library'
import { renderSvg } from '../src/library/render'

const OUT = 'public/downloads'
const XML = '<?xml version="1.0" encoding="UTF-8"?>\n'

function png(svg: string, px: number) {
  return new Resvg(svg, { fitTo: { mode: 'width', value: px }, background: 'rgba(0,0,0,0)', font: { loadSystemFonts: false } }).render().asPng()
}

/** 16 emotions in a 4 × 4 grid, vector only (labels use the viewer's fonts). */
export function emotionSheetSvg(ch: Character) {
  const cell = 200, labelH = 34, pad = 24, head = 64
  const W = pad * 2 + cell * 4, H = pad * 2 + head + (cell + labelH) * 4
  return XML + renderToStaticMarkup(
    <svg xmlns='http://www.w3.org/2000/svg' width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect width={W} height={H} fill='#f6f3ec' />
      <text x={pad} y={pad + 34} fontSize='28' fontWeight='700' fill='#2d3272' fontFamily='Georgia, serif'>
        {`No.${String(ch.no).padStart(2, '0')} ${ch.name.en} ${ch.name.zh}`}
      </text>
      {EMOTION_LIST.map((e, i) => {
        const x = pad + (i % 4) * cell, y = pad + head + Math.floor(i / 4) * (cell + labelH)
        return (
          <g key={e.id}>
            <g transform={`translate(${x + 16},${y})`}>
              <AvatarStatic character={ch.id} emotion={e.id} intensity={0.8} size={cell - 32} decorative />
            </g>
            <text x={x + cell / 2} y={y + cell + 10} textAnchor='middle' fontSize='18' fill='#2d3272'>{`${e.label} · ${e.id}`}</text>
          </g>
        )
      })}
    </svg>,
  )
}

const LICENSE_NOTE = `Jojo & Friends — asset kit
These files are exported from the Jojo & Friends React/SVG components.
The character designs are shown publicly for review; usage rights for the
characters/mascots have NOT been granted yet (no licence is given here) and
no trademark search has been done. Source art was AI-generated (ChatGPT image
generation) and redrawn as layered vectors.
Repository: https://github.com/joyehuang/jojo-friends
`

async function main() {
  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT, { recursive: true })
  const family: Zippable = { 'README.txt': strToU8(LICENSE_NOTE) }
  const manifest: unknown[] = []

  for (const ch of CHARACTER_LIST) {
    const dir = join(OUT, ch.id)
    mkdirSync(dir, { recursive: true })
    const title = ch.name.zh === ch.name.en ? ch.name.en : `${ch.name.en}（${ch.name.zh}）`
    const master = renderSvg({ character: ch.id, emotion: 'calm', size: 512, title })
    const raster = png(master, 512)
    const webp = await sharp(raster).webp({ quality: 92, alphaQuality: 100 }).toBuffer()
    const sheet = emotionSheetSvg(ch)
    writeFileSync(join(dir, `${ch.id}.svg`), master)
    writeFileSync(join(dir, `${ch.id}-512.png`), raster)
    writeFileSync(join(dir, `${ch.id}-512.webp`), webp)
    writeFileSync(join(dir, `${ch.id}-emotions.svg`), sheet)

    const rev = designRevision(ch)
    const readme = rev.fromSource ? LICENSE_NOTE : LICENSE_NOTE +
      `\nDesign: ${ch.name.en} (${ch.id}) is design revision ${rev.revision} (${rev.date}), deliberately revised away from its source image\n` +
      `(${ch.source.file}, kept as a historical reference). Every file in this kit is revision ${rev.revision}.\n`
    const kit: Zippable = {
      'README.txt': strToU8(readme),
      [`${ch.id}.svg`]: strToU8(master),
      [`${ch.id}-512.png`]: raster,
      [`${ch.id}-512.webp`]: webp,
      [`${ch.id}-emotions.svg`]: strToU8(sheet),
    }
    for (const e of EMOTION_LIST) {
      for (const s of STATUS_LIST) {
        kit[`svg/${e.id}/${ch.id}-${e.id}-${s.id}.svg`] = strToU8(renderSvg({ character: ch.id, emotion: e.id, status: s.id, size: 512, intensity: 0.8 }))
      }
    }
    writeFileSync(join(dir, `${ch.id}-kit.zip`), zipSync(kit, { level: 9 }))
    family[ch.id] = Object.fromEntries(Object.entries(kit).filter(([k]) => k !== 'README.txt')) as Zippable
    const design = rev
    manifest.push({
      id: ch.id, no: ch.no, name: ch.name, persona: ch.persona, source: ch.source,
      design: design.fromSource
        ? { revision: 1, basis: 'redrawn from source' }
        : { revision: design.revision, basis: 'revised away from source; source is a historical reference', date: design.date, previous: design.previous?.file },
      files: Object.keys(kit).length,
    })
  }
  family['manifest.json'] = strToU8(JSON.stringify(manifest, null, 1))
  writeFileSync(join(OUT, 'jojo-friends-kit.zip'), zipSync(family, { level: 9 }))

  // reference art for each character page
  rmSync('public/reference', { recursive: true, force: true })
  // plus the superseded design of every revised character (shown as history, never as the current design)
  for (const ch of CHARACTER_LIST) {
    for (const f of [ch.source.file, designRevision(ch).previous?.file]) {
      if (!f) continue
      mkdirSync(dirname(join('public', f)), { recursive: true })
      copyFileSync(f, join('public', f))
    }
  }

  writeFileSync('public/favicon.svg', renderSvg({ character: 'jojo', size: 64, shadow: false, flat: true, framing: 'tight', decorative: true }))
  console.log(`assets: ${CHARACTER_LIST.length} characters → ${OUT}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
