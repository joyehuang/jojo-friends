// Contact sheet rendered from the real component output (JojoStatic →
// renderToStaticMarkup → resvg). Not a hand-drawn mock-up.
import { Resvg } from '@resvg/resvg-js'
import { renderToStaticMarkup } from 'react-dom/server'
import { JojoStatic } from '../src/library/Jojo'
import { EMOTION_LIST, EMOTION_GROUPS } from '../src/library/emotions'
import type { JojoStaticProps } from '../src/library/Jojo'

export const CJK_FONT = '/System/Library/Fonts/Hiragino Sans GB.ttc'

export function svgToPng(svg: string, width: number) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { fontFiles: [CJK_FONT], loadSystemFonts: false, defaultFontFamily: 'Hiragino Sans GB' },
    background: 'rgba(0,0,0,0)',
  })
  return r.render().asPng()
}

/** A standalone SVG document of the component at one pose. */
export function componentSvg(props: JojoStaticProps) {
  return renderToStaticMarkup(<JojoStatic {...props} />)
}

export function contactSheetSvg(opts: { cell?: number; cols?: number; intensity?: number; bg?: string; title?: string } = {}) {
  const cell = opts.cell ?? 260
  const cols = opts.cols ?? 4
  const labelH = 64
  const pad = 36
  const headH = opts.title ? 86 : 0
  const rows = Math.ceil(EMOTION_LIST.length / cols)
  const W = pad * 2 + cols * cell
  const H = pad * 2 + headH + rows * (cell + labelH)
  const cells = EMOTION_LIST.map((e, i) => {
    const x = pad + (i % cols) * cell
    const y = pad + headH + Math.floor(i / cols) * (cell + labelH)
    return (
      <g key={e.id}>
        <g transform={`translate(${x + 20},${y + 10})`}>
          <JojoStatic emotion={e.id} intensity={opts.intensity ?? 0.8} size={cell - 40} decorative />
        </g>
        <text x={x + cell / 2} y={y + cell + 6} textAnchor='middle' fontSize='30' fill='#2d3272' fontWeight='600'>
          {e.label}
        </text>
        <text x={x + cell / 2} y={y + cell + 38} textAnchor='middle' fontSize='18' fill='#6b6d8f'>
          {`${e.en} · ${EMOTION_GROUPS[e.group].replace(/（.*）/, '')}`}
        </text>
      </g>
    )
  })
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    renderToStaticMarkup(
      <svg xmlns='http://www.w3.org/2000/svg' width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <rect width={W} height={H} fill={opts.bg ?? '#f6f3ec'} />
        {opts.title && (
          <>
            <text x={pad} y={pad + 40} fontSize='36' fontWeight='700' fill='#2d3272'>{opts.title}</text>
            <text x={pad} y={pad + 74} fontSize='18' fill='#6b6d8f'>
              由 JojoStatic 组件实际输出的 SVG 渲染（resvg），力度 {String(opts.intensity ?? 0.8)}；情绪是视觉表达，不代表 Agent 真实心理。
            </text>
          </>
        )}
        {cells}
      </svg>,
    )
  )
}
