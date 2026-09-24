// Measures a source image so a character can be redrawn as parametric vectors.
//   pnpm exec tsx scripts/ref/measure.ts reference/options-20/07.png [--json]
//
// Clusters the flat palette, labels pixels by nearest colour, finds connected
// components and reports, per component: colour, area, bbox, centroid, a
// capsule fit from second moments (long axis, thickness, tilt), fill ratio,
// corner-radius estimates and edge profiles (where notches, bites and
// chamfers show up as dips). Numbers are in source pixels.
import sharp from 'sharp'

export interface Comp {
  id: number
  label: number
  color: string
  area: number
  bbox: { x0: number; y0: number; x1: number; y1: number }
  cx: number
  cy: number
  /** capsule fit: full length along the long axis, thickness, tilt of the long axis from vertical (deg, + = top leans right) */
  len: number
  thick: number
  tilt: number
  fill: number
  corners?: { tl: number; tr: number; br: number; bl: number }
  profile?: { top: number[]; bottom: number[]; left: number[]; right: number[] }
}

export interface Measurement {
  file: string
  size: { w: number; h: number }
  bg: string
  palette: Array<{ label: number; color: string; count: number }>
  comps: Comp[]
}

const hex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

export async function loadRgb(file: string | Buffer) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, w: info.width, h: info.height }
}

export async function measure(file: string, opts: { minArea?: number } = {}): Promise<Measurement> {
  const { data, w, h } = await loadRgb(file)
  const px = (i: number) => [data[i * 3], data[i * 3 + 1], data[i * 3 + 2]] as const
  // background: median of the border
  const border: number[][] = []
  for (let x = 0; x < w; x += 4) border.push([...px(x)], [...px((h - 1) * w + x)])
  for (let y = 0; y < h; y += 4) border.push([...px(y * w)], [...px(y * w + w - 1)])
  const med = (k: number) => border.map((c) => c[k]).sort((a, b) => a - b)[border.length >> 1]
  const bg = [med(0), med(1), med(2)]
  const d2 = (a: readonly number[], b: readonly number[]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2

  // histogram of quantised colours away from the background family
  const hist = new Map<number, { n: number; r: number; g: number; b: number }>()
  for (let i = 0; i < w * h; i++) {
    const c = px(i)
    if (d2(c, bg) < 10 ** 2) continue
    const key = ((c[0] >> 3) << 10) | ((c[1] >> 3) << 5) | (c[2] >> 3)
    const e = hist.get(key) ?? { n: 0, r: 0, g: 0, b: 0 }
    e.n++; e.r += c[0]; e.g += c[1]; e.b += c[2]
    hist.set(key, e)
  }
  const bins = [...hist.values()].sort((a, b) => b.n - a.n)
  const centres: Array<{ c: number[]; n: number }> = []
  for (const b of bins) {
    const c = [b.r / b.n, b.g / b.n, b.b / b.n]
    if (b.n < w * h * 0.0004) break
    const near = centres.find((q) => d2(q.c, c) < 22 ** 2)
    if (near) near.n += b.n
    else centres.push({ c, n: b.n })
  }
  // drop the shadow family: the background darkened evenly in every channel
  const isShadow = (c: number[]) => {
    const dd = [c[0] - bg[0], c[1] - bg[1], c[2] - bg[2]]
    const mean = (dd[0] + dd[1] + dd[2]) / 3
    return mean < 0 && mean > -45 && Math.max(...dd.map((v) => Math.abs(v - mean))) < 6
  }
  const pal = centres.filter((q) => !isShadow(q.c) && d2(q.c, bg) > 12 ** 2)
  const labels = new Int16Array(w * h).fill(-1)
  for (let i = 0; i < w * h; i++) {
    const c = px(i)
    if (d2(c, bg) < 9 ** 2) continue
    let best = -1, bd = Math.min(36 ** 2, d2(c, bg))
    for (let k = 0; k < pal.length; k++) {
      const dd = d2(c, pal[k].c)
      if (dd < bd) { bd = dd; best = k }
    }
    labels[i] = best
  }

  // connected components (4-neighbour)
  const comp = new Int32Array(w * h).fill(-1)
  const comps: Comp[] = []
  const minArea = opts.minArea ?? 25
  const stack: number[] = []
  for (let i = 0; i < w * h; i++) {
    if (labels[i] < 0 || comp[i] >= 0) continue
    const lab = labels[i]
    const id = comps.length
    let area = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0
    let x0 = w, y0 = h, x1 = 0, y1 = 0
    const members: number[] = []
    stack.push(i)
    comp[i] = id
    while (stack.length) {
      const j = stack.pop()!
      const x = j % w, y = (j / w) | 0
      members.push(j)
      area++; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
      for (const n of [j - 1, j + 1, j - w, j + w]) {
        if (n < 0 || n >= w * h) continue
        if ((n === j - 1 && x === 0) || (n === j + 1 && x === w - 1)) continue
        if (labels[n] === lab && comp[n] < 0) { comp[n] = id; stack.push(n) }
      }
    }
    if (area < minArea) { comps.push(null as unknown as Comp); continue }
    const mx = sx / area, my = sy / area
    const vxx = sxx / area - mx * mx, vyy = syy / area - my * my, vxy = sxy / area - mx * my
    const tr = vxx + vyy, det = vxx * vyy - vxy * vxy
    const l1 = tr / 2 + Math.sqrt(Math.max(0, tr * tr / 4 - det))
    const l2 = tr / 2 - Math.sqrt(Math.max(0, tr * tr / 4 - det))
    // long-axis angle from vertical (screen): + = top leans right
    const ang = 0.5 * Math.atan2(2 * vxy, vxx - vyy) // from x-axis
    let tilt = 90 - (ang * 180) / Math.PI
    if (tilt > 90) tilt -= 180
    tilt = -tilt
    // capsule of thickness t and length L: minor variance t²/16 (disc-ish) .. t²/12 (rect)
    const thick = Math.sqrt(12 * l2) * 0.97
    const len = Math.sqrt(12 * l1) * 0.97
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1
    const c = pal[lab].c
    const cc: Comp = {
      id, label: lab, color: hex(c[0], c[1], c[2]), area,
      bbox: { x0, y0, x1, y1 }, cx: +mx.toFixed(1), cy: +my.toFixed(1),
      len: +len.toFixed(1), thick: +thick.toFixed(1), tilt: +(Math.abs(tilt) > 89 ? 90 : tilt).toFixed(1),
      fill: +(area / (bw * bh)).toFixed(3),
    }
    if (area > w * h * 0.01) {
      const inC = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && comp[y * w + x] === id
      const diag = (sx0: number, sy0: number, dx: number, dy: number) => {
        for (let t = 0; t < Math.min(bw, bh); t++) if (inC(sx0 + dx * t, sy0 + dy * t)) return +((t * Math.SQRT2) / (Math.SQRT2 - 1)).toFixed(0)
        return -1
      }
      cc.corners = { tl: diag(x0, y0, 1, 1), tr: diag(x1, y0, -1, 1), br: diag(x1, y1, -1, -1), bl: diag(x0, y1, 1, -1) }
      const N = 24
      const prof = (fn: (t: number) => number) => Array.from({ length: N + 1 }, (_, k) => fn(k / N))
      cc.profile = {
        top: prof((t) => { const x = Math.round(x0 + t * (bw - 1)); for (let y = y0; y <= y1; y++) if (inC(x, y)) return y - y0; return -1 }),
        bottom: prof((t) => { const x = Math.round(x0 + t * (bw - 1)); for (let y = y1; y >= y0; y--) if (inC(x, y)) return y1 - y; return -1 }),
        left: prof((t) => { const y = Math.round(y0 + t * (bh - 1)); for (let x = x0; x <= x1; x++) if (inC(x, y)) return x - x0; return -1 }),
        right: prof((t) => { const y = Math.round(y0 + t * (bh - 1)); for (let x = x1; x >= x0; x--) if (inC(x, y)) return x1 - x; return -1 }),
      }
    }
    comps.push(cc)
  }
  return {
    file,
    size: { w, h },
    bg: hex(bg[0], bg[1], bg[2]),
    palette: pal.map((q, i) => ({ label: i, color: hex(q.c[0], q.c[1], q.c[2]), count: q.n })),
    comps: comps.filter(Boolean).sort((a, b) => b.area - a.area),
  }
}

function report(m: Measurement) {
  const lines = [`${m.file}  ${m.size.w}x${m.size.h}  bg ${m.bg}`, 'palette: ' + m.palette.map((p) => `${p.label}:${p.color}(${p.count})`).join(' ')]
  for (const c of m.comps) {
    const b = c.bbox
    lines.push(
      `#${c.id} L${c.label} ${c.color} area ${c.area} bbox ${b.x0},${b.y0}..${b.x1},${b.y1} (${b.x1 - b.x0 + 1}x${b.y1 - b.y0 + 1}) ` +
        `c ${c.cx},${c.cy} capsule len ${c.len} thick ${c.thick} tilt ${c.tilt} fill ${c.fill}` +
        (c.corners ? ` corners r≈ tl${c.corners.tl} tr${c.corners.tr} br${c.corners.br} bl${c.corners.bl}` : ''),
    )
    if (c.profile) for (const [k, v] of Object.entries(c.profile)) lines.push(`    ${k.padEnd(6)} ${v.join(' ')}`)
  }
  return lines.join('\n')
}

if (process.argv[1]?.endsWith('measure.ts')) {
  const file = process.argv[2]
  measure(file).then((m) => console.log(process.argv.includes('--json') ? JSON.stringify(m, null, 1) : report(m)))
}
