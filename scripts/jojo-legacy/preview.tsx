import { writeFileSync } from 'node:fs'
import { contactSheetSvg, svgToPng } from '../sheet'
const svg = contactSheetSvg({ title: 'Jojo 表情联系表 · preview' })
writeFileSync('out/preview.svg', svg)
writeFileSync('out/preview.png', svgToPng(svg, 1200))
console.log('ok')
