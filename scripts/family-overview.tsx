// The whole family on one sheet, from the real component output: every
// character calm, plus rows of one shared emotion across all 26.
//   pnpm exec tsx scripts/family-overview.tsx [out.png]
import { writeFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { AvatarStatic, CHARACTER_LIST, EMOTIONS, type EmotionId } from '../src/library'
import { svgToPng } from './sheet'

const ROWS: EmotionId[] = ['happy', 'surprised', 'sleepy', 'sob']

export function familyOverviewSvg() {
  const cols = 9, cell = 190, labelH = 58, pad = 40, head = 110
  const rowsCalm = Math.ceil(CHARACTER_LIST.length / cols)
  const mini = 66
  const stripTop = pad + head + rowsCalm * (cell + labelH) + 30
  const W = pad * 2 + cols * cell
  const stripRowH = mini + 34
  const H = stripTop + ROWS.length * stripRowH + pad
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    renderToStaticMarkup(
      <svg xmlns='http://www.w3.org/2000/svg' width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect width={W} height={H} fill='#f6f3ec' />
        <text x={pad} y={pad + 48} fontSize='46' fontWeight='700' fill='#2d3272'>Jojo &amp; Friends</text>
        <text x={pad} y={pad + 86} fontSize='18' fill='#6b6d8f'>
          26 位同一家族的 UI 角色 · 每位都有 16 种表情与 6 种业务状态 · 由组件实际输出渲染（resvg）
        </text>
        {CHARACTER_LIST.map((c, i) => {
          const x = pad + (i % cols) * cell, y = pad + head + Math.floor(i / cols) * (cell + labelH)
          return (
            <g key={c.id}>
              <g transform={`translate(${x + 15},${y})`}>
                <AvatarStatic character={c.id} size={cell - 30} decorative />
              </g>
              <text x={x + cell / 2} y={y + cell + 4} textAnchor='middle' fontSize='20' fontWeight='600' fill='#2d3272'>
                {`${String(c.no).padStart(2, '0')} ${c.name.en}`}
              </text>
              <text x={x + cell / 2} y={y + cell + 28} textAnchor='middle' fontSize='15' fill='#6b6d8f'>{`${c.name.zh} · ${c.id}`}</text>
            </g>
          )
        })}
        {ROWS.map((e, r) => (
          <g key={e}>
            <text x={pad} y={stripTop + r * stripRowH + mini / 2 + 6} fontSize='18' fontWeight='600' fill='#2d3272'>{EMOTIONS[e].label}</text>
            {CHARACTER_LIST.map((c, i) => (
              <g key={c.id} transform={`translate(${pad + 64 + i * ((W - pad * 2 - 64) / CHARACTER_LIST.length)},${stripTop + r * stripRowH})`}>
                <AvatarStatic character={c.id} emotion={e} intensity={0.8} size={mini} decorative />
              </g>
            ))}
          </g>
        ))}
      </svg>,
    )
  )
}

if (process.argv[1]?.endsWith('family-overview.tsx')) {
  const out = process.argv[2] ?? 'out/family-overview.png'
  writeFileSync(out, svgToPng(familyOverviewSvg(), 1800))
  console.log('wrote', out)
}
