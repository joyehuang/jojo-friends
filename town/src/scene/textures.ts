// Procedural textures, drawn once on canvases. They are near-white on purpose:
// the actual colour comes from vertex colours, so one textured material can
// serve every house, roof or plank in town.
import * as THREE from 'three'
import { makeRng } from '../work/rng'

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return [c, c.getContext('2d')!]
}

function finish(c: HTMLCanvasElement, repeat = 1, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  t.anisotropy = 8
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  t.needsUpdate = true
  return t
}

function speckle(g: CanvasRenderingContext2D, size: number, n: number, rand: () => number, light: number, dark: number, maxR: number) {
  for (let i = 0; i < n; i += 1) {
    const v = rand() < 0.5 ? light : dark
    g.fillStyle = `rgba(${v},${v},${v},${0.05 + rand() * 0.08})`
    const r = 0.5 + rand() * maxR
    g.beginPath()
    g.arc(rand() * size, rand() * size, r, 0, Math.PI * 2)
    g.fill()
  }
}

/** Soft mottled grass with a few darker tufts. Tinted by vertex colour. */
export function grassTexture(): THREE.CanvasTexture {
  const S = 256
  const [c, g] = canvas(S)
  const rand = makeRng(11)
  g.fillStyle = '#f2f2f2'
  g.fillRect(0, 0, S, S)
  for (let i = 0; i < 90; i += 1) {
    const v = 225 + Math.floor(rand() * 30)
    const r = 8 + rand() * 26
    const x = rand() * S, y = rand() * S
    const grd = g.createRadialGradient(x, y, 0, x, y, r)
    grd.addColorStop(0, `rgba(${v},${v},${v},0.55)`)
    grd.addColorStop(1, `rgba(${v},${v},${v},0)`)
    g.fillStyle = grd
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) {
      g.beginPath()
      g.arc(x + ox, y + oy, r, 0, Math.PI * 2)
      g.fill()
    }
  }
  for (let i = 0; i < 520; i += 1) {
    const x = rand() * S, y = rand() * S
    g.strokeStyle = `rgba(150,150,150,${0.06 + rand() * 0.08})`
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + (rand() - 0.5) * 2, y - 2 - rand() * 3)
    g.stroke()
  }
  return finish(c)
}

/** Very light plaster grain for walls. */
export function plasterTexture(): THREE.CanvasTexture {
  const S = 256
  const [c, g] = canvas(S)
  const rand = makeRng(21)
  g.fillStyle = '#f7f7f7'
  g.fillRect(0, 0, S, S)
  speckle(g, S, 1600, rand, 255, 200, 1.6)
  return finish(c)
}

/** Rounded roof tiles in rows; rows run along u, stack along v. */
export function shingleTexture(): THREE.CanvasTexture {
  const S = 256
  const [c, g] = canvas(S)
  const rand = makeRng(31)
  g.fillStyle = '#ffffff'
  g.fillRect(0, 0, S, S)
  const rows = 8
  const h = S / rows
  for (let r = 0; r < rows; r += 1) {
    const y = r * h
    const off = (r % 2) * (S / 16)
    for (let x = -S / 8; x < S + S / 8; x += S / 8) {
      const v = 228 + Math.floor(rand() * 26)
      g.fillStyle = `rgb(${v},${v},${v})`
      g.beginPath()
      g.moveTo(x + off, y)
      g.lineTo(x + off + S / 8, y)
      g.lineTo(x + off + S / 8, y + h * 0.7)
      g.quadraticCurveTo(x + off + S / 16, y + h * 1.05, x + off, y + h * 0.7)
      g.closePath()
      g.fill()
    }
    g.fillStyle = 'rgba(0,0,0,0.13)'
    g.fillRect(0, y + h - 2, S, 2)
  }
  return finish(c)
}

/** Wooden boards with fine grain. Boards run along u. */
export function plankTexture(): THREE.CanvasTexture {
  const S = 256
  const [c, g] = canvas(S)
  const rand = makeRng(41)
  const boards = 6
  const h = S / boards
  for (let b = 0; b < boards; b += 1) {
    const v = 232 + Math.floor(rand() * 20)
    g.fillStyle = `rgb(${v},${v},${v})`
    g.fillRect(0, b * h, S, h)
    for (let i = 0; i < 14; i += 1) {
      g.strokeStyle = `rgba(120,110,100,${0.05 + rand() * 0.06})`
      g.lineWidth = 1
      g.beginPath()
      const y = b * h + rand() * h
      g.moveTo(0, y)
      g.bezierCurveTo(S * 0.3, y + (rand() - 0.5) * 4, S * 0.6, y + (rand() - 0.5) * 4, S, y)
      g.stroke()
    }
    g.fillStyle = 'rgba(60,50,40,0.22)'
    g.fillRect(0, b * h, S, 1.5)
    const joint = rand() * S
    g.fillRect(joint, b * h, 1.5, h)
  }
  return finish(c)
}

/** Fine asphalt grain. */
export function asphaltTexture(): THREE.CanvasTexture {
  const S = 256
  const [c, g] = canvas(S)
  const rand = makeRng(51)
  g.fillStyle = '#efefef'
  g.fillRect(0, 0, S, S)
  speckle(g, S, 2600, rand, 255, 170, 1.2)
  return finish(c)
}

/** Square paving slabs with soft grout lines. */
export function tileTexture(): THREE.CanvasTexture {
  const S = 256
  const [c, g] = canvas(S)
  const rand = makeRng(61)
  const n = 4
  const s = S / n
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      const v = 236 + Math.floor(rand() * 18)
      g.fillStyle = `rgb(${v},${v},${v})`
      g.fillRect(i * s, j * s, s, s)
    }
  }
  g.strokeStyle = 'rgba(0,0,0,0.12)'
  g.lineWidth = 2
  for (let i = 0; i <= n; i += 1) {
    g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, S); g.stroke()
    g.beginPath(); g.moveTo(0, i * s); g.lineTo(S, i * s); g.stroke()
  }
  speckle(g, S, 500, rand, 255, 200, 1)
  return finish(c)
}

/** Sand: warm grain with ripples. */
export function sandTexture(): THREE.CanvasTexture {
  const S = 256
  const [c, g] = canvas(S)
  const rand = makeRng(71)
  g.fillStyle = '#f6f6f6'
  g.fillRect(0, 0, S, S)
  for (let i = 0; i < 18; i += 1) {
    g.strokeStyle = `rgba(160,150,140,${0.05 + rand() * 0.05})`
    g.lineWidth = 2
    g.beginPath()
    const y = rand() * S
    g.moveTo(0, y)
    g.bezierCurveTo(S * 0.33, y + 6, S * 0.66, y - 6, S, y)
    g.stroke()
  }
  speckle(g, S, 1800, rand, 255, 180, 1.3)
  return finish(c)
}

/**
 * Shore mask for the water shader: islands drawn white and blurred, so the
 * shader can find shallow water and the foam line.
 */
export function shoreMask(islands: Array<{ x: number; z: number; half: number; corner: number }>, span: number): THREE.CanvasTexture {
  const S = 1024
  const [c, g] = canvas(S)
  g.fillStyle = '#000'
  g.fillRect(0, 0, S, S)
  const k = S / span
  const X = (x: number) => S / 2 + x * k
  g.filter = 'blur(14px)'
  g.fillStyle = '#fff'
  for (const isl of islands) {
    const x0 = X(isl.x - isl.half), y0 = X(isl.z - isl.half), w = isl.half * 2 * k, r = isl.corner * k
    g.beginPath()
    g.roundRect(x0, y0, w, w, r)
    g.fill()
  }
  g.filter = 'none'
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.NoColorSpace
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
  t.needsUpdate = true
  return t
}

/** A canvas texture with text: name plates, signs. */
export function labelTexture(lines: Array<{ text: string; size: number; color: string; weight?: number }>, opts: { w: number; h: number; bg?: string; radius?: number; border?: string; dot?: string }): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = opts.w
  c.height = opts.h
  const g = c.getContext('2d')!
  if (opts.bg) {
    g.fillStyle = opts.bg
    g.beginPath()
    g.roundRect(3, 3, opts.w - 6, opts.h - 6, opts.radius ?? 18)
    g.fill()
    if (opts.border) {
      g.strokeStyle = opts.border
      g.lineWidth = 6
      g.stroke()
    }
  }
  let x = opts.w / 2
  if (opts.dot) {
    g.fillStyle = opts.dot
    g.beginPath()
    g.arc(opts.h * 0.42, opts.h / 2, opts.h * 0.16, 0, Math.PI * 2)
    g.fill()
    x = opts.w / 2 + opts.h * 0.2
  }
  const total = lines.reduce((s, l) => s + l.size * 1.18, 0)
  let y = opts.h / 2 - total / 2
  for (const l of lines) {
    g.fillStyle = l.color
    g.font = `${l.weight ?? 800} ${l.size}px "PingFang SC","Hiragino Sans GB","Noto Sans SC","Microsoft YaHei",sans-serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    y += (l.size * 1.18) / 2
    g.fillText(l.text, x, y)
    y += (l.size * 1.18) / 2
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  t.needsUpdate = true
  return t
}
