// Rasterises SVG outerHTML captured from the running demo in Ego Browser
// (engine-driven frames after real clicks) into a labelled grid.
// This is a live DOM capture rasterised with resvg — NOT a webpage screenshot.
import { readFileSync, writeFileSync } from 'node:fs'
import { svgToPng } from '../sheet'

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8')) as Record<string, { html: string }>
const m375 = read('out/status/qa/ego375-hero-dom.json')
const m1280 = read('out/status/qa/ego1280-hero-dom.json')
const cards = read('out/status/qa/ego1280-cards-dom.json')
const pick375 = ['working-0', 'working-3', 'working-5', 'needs-input-0', 'needs-input-2', 'needs-input-7', 'success-0', 'success-3', 'success-7']
const items: Array<[string, string]> = [
  ...pick375.map((k) => [`375 · ${k}`, m375[k].html] as [string, string]),
  ...Object.keys(m1280).map((k) => [`1280 · ${k}`, m1280[k].html] as [string, string]),
  ...Object.keys(cards).map((k) => [`1280 对比卡 · ${k}`, cards[k].html] as [string, string]),
]
const cell = 210, cols = 7, lab = 30
const rows = Math.ceil(items.length / cols)
const W = cols * cell, H = rows * (cell + lab) + 70
let body = ''
items.forEach(([k, html], i) => {
  const x = (i % cols) * cell, y = 70 + Math.floor(i / cols) * (cell + lab)
  const svg = html
    .replace(/id="([^"]+)"/g, `id="$1-c${i}"`)
    .replace(/url\(#([^)]+)\)/g, `url(#$1-c${i})`)
    .replace(/style="[^"]*"/, '')
    .replace('<svg ', `<svg x="${x + 10}" y="${y + 5}" width="${cell - 20}" height="${cell - 20}" `)
  body += svg + `<text x="${x + cell / 2}" y="${y + cell + 14}" text-anchor="middle" font-size="14" fill="#2d3272">${k}</text>`
})
const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#f6f3ec"/><text x="16" y="30" font-size="20" font-weight="700" fill="#2d3272">Ego Browser 实测：真实点击后从运行页面抓取的 SVG DOM，用 resvg 栅格化 —— 不是网页截图</text><text x="16" y="54" font-size="14" fill="#6b6d8f">375px（触控模拟）与 1280px 桌面；时间为墙钟，该浏览器环境把 rAF 节流到约 1.5 次/秒，所以动画在墙钟上被拉长</text>${body}</svg>`
writeFileSync('out/status/qa/ego-live-dom-grid.png', svgToPng(doc, W))
console.log(items.length)
