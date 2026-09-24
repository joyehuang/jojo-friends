// Per-character contact sheet from the real component output (AvatarStatic →
// renderToStaticMarkup → resvg): 16 emotions + the 6 statuses.
//   pnpm exec tsx scripts/character-sheet.tsx [id ...] [--out dir] [--intensity 0.8]
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { AvatarStatic, CHARACTER_LIST, EMOTION_LIST, STATUS_LIST, type Character } from '../src/library'
import { svgToPng } from './sheet'

export function characterSheetSvg(ch: Character, opts: { intensity?: number; cell?: number } = {}) {
  const cell = opts.cell ?? 220
  const cols = 8
  const labelH = 44
  const pad = 32
  const headH = 96
  const rowsE = Math.ceil(EMOTION_LIST.length / cols)
  const W = pad * 2 + cols * cell
  const statusTop = pad + headH + rowsE * (cell + labelH) + 30
  const H = statusTop + 40 + cell + labelH + pad
  const k = opts.intensity ?? 0.8
  const tile = (x: number, y: number, key: string, label: string, sub: string, props: Record<string, unknown>) => (
    <g key={key}>
      <g transform={`translate(${x + 14},${y + 6})`}>
        <AvatarStatic character={ch} intensity={k} size={cell - 28} decorative {...props} />
      </g>
      <text x={x + cell / 2} y={y + cell + 4} textAnchor='middle' fontSize='22' fill='#2d3272' fontWeight='600'>{label}</text>
      <text x={x + cell / 2} y={y + cell + 30} textAnchor='middle' fontSize='14' fill='#6b6d8f'>{sub}</text>
    </g>
  )
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    renderToStaticMarkup(
      <svg xmlns='http://www.w3.org/2000/svg' width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect width={W} height={H} fill='#f6f3ec' />
        <text x={pad} y={pad + 40} fontSize='36' fontWeight='700' fill='#2d3272'>
          {`No.${String(ch.no).padStart(2, '0')} ${ch.name.en} · ${ch.name.zh}`}
        </text>
        <text x={pad} y={pad + 72} fontSize='16' fill='#6b6d8f'>
          {`id "${ch.id}" · 16 种表情（力度 ${k}）+ 6 种业务状态 · AvatarStatic 实际输出经 resvg 栅格化`}
        </text>
        {EMOTION_LIST.map((e, i) =>
          tile(pad + (i % cols) * cell, pad + headH + Math.floor(i / cols) * (cell + labelH), e.id, e.label, e.en, { emotion: e.id }),
        )}
        <text x={pad} y={statusTop + 20} fontSize='18' fontWeight='700' fill='#2d3272'>业务状态（表情保持平静）</text>
        {STATUS_LIST.map((s, i) => tile(pad + i * cell, statusTop + 40, s.id, s.label, s.en, { status: s.id }))}
      </svg>,
    )
  )
}

if (process.argv[1]?.endsWith('character-sheet.tsx')) {
  const args = process.argv.slice(2)
  const oi = args.indexOf('--out')
  const out = oi >= 0 ? args[oi + 1] : 'out/sheets'
  const ii = args.indexOf('--intensity')
  const intensity = ii >= 0 ? Number(args[ii + 1]) : 0.8
  const skip = new Set([oi, oi + 1, ii, ii + 1].filter((i) => i >= 0 && (i === oi || i === ii || i === oi + 1 && oi >= 0 || i === ii + 1 && ii >= 0)))
  const ids = args.filter((a, i) => !a.startsWith('--') && !skip.has(i))
  mkdirSync(out, { recursive: true })
  for (const ch of CHARACTER_LIST.filter((c) => !ids.length || ids.includes(c.id))) {
    const svg = characterSheetSvg(ch, { intensity })
    writeFileSync(join(out, `${ch.id}-sheet.png`), svgToPng(svg, 1400))
    console.log('wrote', join(out, `${ch.id}-sheet.png`))
  }
}
