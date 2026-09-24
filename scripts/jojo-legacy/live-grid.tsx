// Rasterises SVG outerHTML captured from the running demo page (engine-driven
// frames) into a labelled grid. This is a DOM capture, NOT a browser screenshot.
import { readFileSync, writeFileSync } from 'node:fs'
import { svgToPng } from '../sheet'
const data = JSON.parse(readFileSync('out/qa/live-dom.json', 'utf8')) as Record<string, { html: string }>
const keys = Object.keys(data)
const cell = 240, cols = 7, lab = 34
const rows = Math.ceil(keys.length / cols)
const W = cols * cell, H = rows * (cell + lab) + 60
let body = ''
keys.forEach((k, i) => {
  const x = (i % cols) * cell, y = 60 + Math.floor(i / cols) * (cell + lab)
  // every capture comes from the same instance, so make its ids unique in this sheet
  const svg = data[k].html
    .replace(/id="([^"]+)"/g, `id="$1-c${i}"`)
    .replace(/url\(#([^)]+)\)/g, `url(#$1-c${i})`)
    .replace(/style="[^"]*"/, '')
    .replace('<svg ', `<svg x="${x + 10}" y="${y + 5}" width="${cell - 20}" height="${cell - 20}" `)
  body += svg + `<text x="${x + cell / 2}" y="${y + cell + 18}" text-anchor="middle" font-size="18" fill="#2d3272">${k}</text>`
})
const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#f6f3ec"/><text x="16" y="38" font-size="22" fill="#2d3272">Live DOM capture from the running demo (engine frames), rasterised with resvg — not a browser screenshot</text>${body}</svg>`
writeFileSync('out/qa/live-dom-grid.png', svgToPng(doc, W))
console.log(keys.length)
