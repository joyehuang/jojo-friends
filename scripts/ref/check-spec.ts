// One-stop check for a character while it is being authored — works on a
// draft module outside the registry, so a half-finished spec never breaks
// anyone else's build.
//   pnpm exec tsx scripts/ref/check-spec.ts path/to/draft.ts [--sheet] [--out dir]
// Prints the normalised geometry, the solved signal placements, identity IoU
// against the source, and every containment / clearance violation.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Character } from '../../src/library/character'
import { plateViolations, statusViolations, tearViolations } from '../../tests/helpers/geo'
import { characterSheetSvg } from '../character-sheet'
import { svgToPng } from '../sheet'
import { identity } from './identity'

const args = process.argv.slice(2)
const oi = args.indexOf('--out')
const out = oi >= 0 ? args[oi + 1] : 'out/check'
const file = args.find((a, i) => !a.startsWith('--') && i !== oi + 1)!
const mod = await import(pathToFileURL(resolve(file)).href)
const ch = Object.values(mod).find((v): v is Character => !!v && typeof v === 'object' && 'rig' in v && 'shell' in v)
if (!ch) throw new Error(`no Character export in ${file}`)
mkdirSync(out, { recursive: true })

const r2 = (n: number) => Math.round(n * 10) / 10
const box = (b: { x0: number; y0: number; x1: number; y1: number }) => `${r2(b.x0)},${r2(b.y0)}..${r2(b.x1)},${r2(b.y1)}`
console.log(`${ch.id} (${ch.name.en} ${ch.name.zh}) no.${ch.no}  fit s=${ch.fit.s} t=${ch.fit.tx},${ch.fit.ty}`)
console.log(`  shell ${box(ch.shell.box)}  plate ${box(ch.face.box)}${ch.faceRotate ? ` rot ${ch.faceRotate.deg}°` : ''}${ch.faceClip ? '' : ' (overhangs)'}`)
console.log(`  k body ${ch.k.body.toFixed(2)} face ${ch.k.face.toFixed(2)} dot ${ch.k.dot.toFixed(2)} eye ${ch.k.eye.toFixed(2)} gaze ${ch.k.gaze.toFixed(2)}`)
const g = ch.signal.gauge
console.log(`  gauge ${r2(g.from)}→${r2(g.to)} full ${g.full.gap}/${g.full.width} small ${g.small.gap}/${g.small.width}; bubble tail ${ch.signal.bubble.tail}; small badge boost ${ch.signal.checkBoostSmall}`)
console.log(`  brows L ${r2(ch.browL.cx)},${r2(ch.browL.cy)} len ${r2(ch.browL.len)}  R ${r2(ch.browR.cx)},${r2(ch.browR.cy)} len ${r2(ch.browR.len)}; cheeks ${r2(ch.cheekL.cx)},${r2(ch.cheekL.cy)} / ${r2(ch.cheekR.cx)},${r2(ch.cheekR.cy)}`)

const id = await identity(ch, out)
console.log(`  identity mean IoU ${id.mean}  ${Object.entries(id.iou).map(([k, v]) => `${k}:${v}`).join('  ')}  → ${join(out, `${ch.id}-identity.png`)}`)

const summarise = (name: string, bad: string[]) => {
  const by: Record<string, number> = {}
  for (const b of bad) {
    const k = b.split(' ')[0] + (b.match(/ (eye[LR]|mouth|brow[LR]|blush[LR]|pool[LR]|drop[LR]|stream[LR])/)?.[0] ?? '')
    by[k] = (by[k] ?? 0) + 1
  }
  console.log(`  ${name}: ${bad.length ? `${bad.length} FAIL ${JSON.stringify(by)}\n      e.g. ${bad.slice(0, 3).join(' | ')}` : 'ok'}`)
}
summarise('features on plate', plateViolations(ch, { step: 0.35 }))
summarise('tears on plate', tearViolations(ch))
summarise('status shapes', statusViolations(ch))

if (args.includes('--sheet')) {
  const p = join(out, `${ch.id}-sheet.png`)
  writeFileSync(p, svgToPng(characterSheetSvg(ch), 1400))
  console.log(`  sheet → ${p}`)
}
