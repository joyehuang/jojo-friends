// Key moments of each status motion, rendered from the real frame function
// (framePose + the status' live fx at time t) through JojoSvg and resvg.
// Idle breathing/blinks are left out so only the status motion changes.
// Not a browser screenshot.
import sharp, { type OverlayOptions } from 'sharp'
import { renderToStaticMarkup } from 'react-dom/server'
import { resolveConfig, targetPose } from '../../src/library/config'
import type { EmotionId } from '../../src/library/emotions'
import { FX_STATIC, framePose } from '../../src/library/frame'
import { JojoSvg, makeIds } from '../../src/library/JojoSvg'
import { STATUSES, type StatusId } from '../../src/library/status'
import { svgToPng } from '../sheet'

const PLAN: Array<[StatusId, number[], string]> = [
  ['working', [0.15, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 6.0], '持续推进（完整动效下循环）'],
  ['needs-input', [0.05, 0.15, 0.3, 0.5, 0.7, 0.9, 2.0, 6.0], '一次轻弹后静止'],
  ['success', [0.05, 0.15, 0.25, 0.4, 0.6, 0.9, 2.0, 6.0], '一次完成动效后常驻勾号'],
]

function frameSvg(emotion: EmotionId, status: StatusId, t: number, size: number) {
  const cfg = resolveConfig({ emotion, status, size, intensity: 0.8, motion: 'full' }, false)
  const st = STATUSES[status]
  const fx = { ...FX_STATIC, ...st.still, ...st.live!(t, true) }
  const frame = framePose(targetPose(emotion, 0.8), fx, cfg.frame)
  return renderToStaticMarkup(<JojoSvg frame={frame} cfg={cfg} ids={makeIds(`k${status}${t}${size}`)} decorative />)
}

export async function keyframes(emotion: EmotionId, out: string) {
  const big = 150, cell = 170, labH = 26, rowH = big + 32 + labH + 44
  const W = 190 + PLAN[0][1].length * cell
  const H = 50 + PLAN.length * rowH
  const layers: OverlayOptions[] = []
  let text = `<text x="16" y="32" font-size="20" font-weight="700" fill="#2d3272">状态动作关键帧 · 表情 ${emotion} · 帧函数实际输出（framePose → JojoSvg → resvg），不是浏览器截图；省略呼吸/眨眼</text>`
  PLAN.forEach(([s, times, note], r) => {
    const y = 50 + r * rowH
    text += `<text x="16" y="${y + 70}" font-size="20" font-weight="700" fill="#2d3272">${STATUSES[s].label}</text><text x="16" y="${y + 96}" font-size="13" fill="#6b6d8f">${note}</text>`
    times.forEach((t, i) => {
      const x = 190 + i * cell
      layers.push({ input: svgToPng(frameSvg(emotion, s, t, big), big), left: x, top: y })
      layers.push({ input: { create: { width: 60, height: 36, channels: 4, background: '#17182f' } }, left: x + 45, top: y + big + 4 })
      layers.push({ input: svgToPng(frameSvg(emotion, s, t, 32), 32), left: x + 59, top: y + big + 6 })
      text += `<text x="${x + big / 2}" y="${y + big + 62}" text-anchor="middle" font-size="14" fill="#2d3272">t = ${t}s</text>`
    })
  })
  const labels = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${text}</svg>`)
  await sharp({ create: { width: W, height: H, channels: 4, background: '#f6f3ec' } })
    .composite([...layers, { input: labels, left: 0, top: 0 }])
    .png()
    .toFile(out)
}

if (process.argv[1]?.endsWith('status-keyframes.tsx')) {
  const [emotion = 'calm', out = 'out/status/status-keyframes-calm.png'] = process.argv.slice(2)
  keyframes(emotion as EmotionId, out).then(() => console.log(out))
}
