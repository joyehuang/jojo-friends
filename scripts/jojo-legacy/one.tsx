import { writeFileSync } from 'node:fs'
import { componentSvg, svgToPng } from '../sheet'
const [emotion = 'calm', size = '480', status = 'idle', intensity = '0.8'] = process.argv.slice(2)
const svg = componentSvg({ emotion: emotion as never, size: Number(size), status: status as never, intensity: Number(intensity) })
writeFileSync(`out/one-${emotion}.svg`, svg)
writeFileSync(`out/one-${emotion}.png`, svgToPng(svg, Number(size)))
