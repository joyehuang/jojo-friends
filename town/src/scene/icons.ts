// Little canvas-drawn pictures: the speech bubbles over heads, and one icon per
// kind of output (used on the progress rings, the shelves and in the HUD, so a
// deck always looks like a deck wherever it shows up).
import * as THREE from 'three'
import { OUTPUT_KINDS } from '../work/roles'
import type { OutputKind } from '../work/types'
import type { Icon } from './layout'

const INDIGO = '#2d3272'
const CORAL = '#fe6a4a'
const PAPER = '#fffaf0'

export type BubbleKind = Icon | 'ask' | 'error' | 'done' | 'hi' | 'gift'

function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
}

/** Draw the icon for an output kind, centred at (cx, cy), about `s` px across. */
export function drawKindIcon(g: CanvasRenderingContext2D, kind: OutputKind, cx: number, cy: number, s: number) {
  const k = s / 100
  const { color, accent } = OUTPUT_KINDS[kind]
  g.save()
  g.translate(cx, cy)
  g.scale(k, k)
  g.lineJoin = 'round'
  g.lineCap = 'round'
  const page = (w: number, h: number, fill = color) => {
    rr(g, -w / 2, -h / 2, w, h, 9)
    g.fillStyle = fill
    g.fill()
    g.lineWidth = 6
    g.strokeStyle = INDIGO
    g.stroke()
  }
  const lines = (x0: number, y0: number, n: number, w: number, gap = 12) => {
    g.lineWidth = 6
    g.strokeStyle = INDIGO
    for (let i = 0; i < n; i += 1) {
      g.beginPath()
      g.moveTo(x0, y0 + i * gap)
      g.lineTo(x0 + (i === n - 1 ? w * 0.6 : w), y0 + i * gap)
      g.stroke()
    }
  }
  switch (kind) {
    case 'article': {
      page(64, 82)
      g.fillStyle = accent
      rr(g, -22, -30, 44, 12, 4)
      g.fill()
      lines(-22, -6, 3, 44)
      break
    }
    case 'post': {
      g.fillStyle = color
      g.beginPath()
      g.roundRect(-40, -34, 80, 56, 16)
      g.moveTo(-14, 22)
      g.lineTo(-24, 40)
      g.lineTo(2, 22)
      g.fill()
      g.lineWidth = 6
      g.strokeStyle = INDIGO
      g.beginPath()
      g.roundRect(-40, -34, 80, 56, 16)
      g.stroke()
      g.fillStyle = CORAL
      g.beginPath()
      g.moveTo(0, 8)
      g.bezierCurveTo(-26, -8, -12, -30, 0, -16)
      g.bezierCurveTo(12, -30, 26, -8, 0, 8)
      g.fill()
      break
    }
    case 'deck': {
      g.strokeStyle = INDIGO
      g.lineWidth = 6
      g.beginPath()
      g.moveTo(0, 22); g.lineTo(-18, 46); g.moveTo(0, 22); g.lineTo(18, 46)
      g.stroke()
      page(84, 58)
      g.fillStyle = accent
      for (const [x, h] of [[-24, 14], [-6, 24], [12, 32]] as const) g.fillRect(x, 16 - h, 12, h)
      g.fillStyle = CORAL
      g.fillRect(-30, -20, 22, 6)
      break
    }
    case 'report': {
      page(66, 84)
      g.fillStyle = INDIGO
      rr(g, -14, -48, 28, 12, 4)
      g.fill()
      g.fillStyle = CORAL
      g.beginPath()
      g.moveTo(0, -6); g.arc(0, -6, 20, -Math.PI / 2, Math.PI * 0.7); g.closePath()
      g.fill()
      g.fillStyle = '#6f9fd8'
      g.beginPath()
      g.moveTo(0, -6); g.arc(0, -6, 20, Math.PI * 0.7, Math.PI * 1.5); g.closePath()
      g.fill()
      lines(-20, 26, 1, 40)
      break
    }
    case 'code': {
      rr(g, -44, -34, 88, 68, 14)
      g.fillStyle = INDIGO
      g.fill()
      g.strokeStyle = color
      g.lineWidth = 8
      g.beginPath()
      g.moveTo(-16, -14); g.lineTo(-30, 0); g.lineTo(-16, 14)
      g.moveTo(16, -14); g.lineTo(30, 0); g.lineTo(16, 14)
      g.stroke()
      g.strokeStyle = CORAL
      g.beginPath()
      g.moveTo(6, -18); g.lineTo(-6, 18)
      g.stroke()
      break
    }
    case 'review': {
      page(66, 84)
      lines(-20, -26, 2, 40)
      g.strokeStyle = accent
      g.lineWidth = 11
      g.beginPath()
      g.moveTo(-16, 10); g.lineTo(-3, 23); g.lineTo(22, -4)
      g.stroke()
      break
    }
    case 'mail': {
      rr(g, -44, -30, 88, 60, 10)
      g.fillStyle = color
      g.fill()
      g.lineWidth = 6
      g.strokeStyle = INDIGO
      g.stroke()
      g.beginPath()
      g.moveTo(-42, -26); g.lineTo(0, 6); g.lineTo(42, -26)
      g.stroke()
      g.fillStyle = CORAL
      g.beginPath()
      g.arc(28, 18, 9, 0, Math.PI * 2)
      g.fill()
      break
    }
    case 'design': {
      g.fillStyle = color
      g.beginPath()
      g.ellipse(0, 4, 46, 38, 0, 0, Math.PI * 2)
      g.fill()
      g.lineWidth = 6
      g.strokeStyle = INDIGO
      g.stroke()
      g.fillStyle = PAPER
      g.beginPath(); g.arc(18, 20, 9, 0, Math.PI * 2); g.fill(); g.stroke()
      for (const [x, y, c] of [[-22, -8, INDIGO], [-4, -20, '#ffd27a'], [16, -12, '#5fc4a6'], [-20, 16, '#6f9fd8']] as const) {
        g.fillStyle = c
        g.beginPath(); g.arc(x, y, 8, 0, Math.PI * 2); g.fill()
      }
      break
    }
    case 'data': {
      g.fillStyle = color
      rr(g, -44, -40, 88, 80, 14)
      g.fill()
      g.lineWidth = 6
      g.strokeStyle = INDIGO
      g.stroke()
      g.fillStyle = INDIGO
      for (const [x, h] of [[-28, 22], [-8, 38], [12, 30]] as const) g.fillRect(x, 28 - h, 14, h)
      g.strokeStyle = accent
      g.lineWidth = 6
      g.beginPath()
      g.moveTo(-30, -6); g.lineTo(-10, -22); g.lineTo(8, -12); g.lineTo(30, -30)
      g.stroke()
      break
    }
    case 'brief': {
      g.fillStyle = '#ffd27a'
      g.beginPath(); g.arc(0, -18, 18, 0, Math.PI * 2); g.fill()
      g.strokeStyle = '#f0a43a'
      g.lineWidth = 6
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2
        g.beginPath()
        g.moveTo(Math.cos(a) * 25, -18 + Math.sin(a) * 25)
        g.lineTo(Math.cos(a) * 33, -18 + Math.sin(a) * 33)
        g.stroke()
      }
      rr(g, -40, 4, 80, 40, 8)
      g.fillStyle = PAPER
      g.fill()
      g.strokeStyle = INDIGO
      g.stroke()
      lines(-28, 18, 2, 56, 12)
      break
    }
    case 'ops': {
      g.fillStyle = color
      g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); g.fill()
      g.lineWidth = 6
      g.strokeStyle = INDIGO
      g.stroke()
      g.strokeStyle = INDIGO
      g.lineWidth = 12
      g.beginPath(); g.moveTo(-16, 16); g.lineTo(10, -10); g.stroke()
      g.lineWidth = 6
      g.beginPath(); g.arc(14, -14, 12, Math.PI * 0.75, Math.PI * 2.25); g.stroke()
      g.fillStyle = CORAL
      g.beginPath(); g.arc(-18, 18, 7, 0, Math.PI * 2); g.fill()
      break
    }
    case 'doc': {
      page(60, 74, '#fffaf0')
      g.save()
      g.translate(8, -8)
      page(60, 74)
      lines(-18, -16, 3, 36)
      g.restore()
      break
    }
  }
  g.restore()
}

const kindUrls = new Map<OutputKind, string>()

/** A data: URL of a kind's icon, for <img> in the HUD. */
export function kindIconURL(kind: OutputKind): string {
  let url = kindUrls.get(kind)
  if (!url) {
    const c = document.createElement('canvas')
    c.width = c.height = 96
    drawKindIcon(c.getContext('2d')!, kind, 48, 48, 88)
    url = c.toDataURL('image/png')
    kindUrls.set(kind, url)
  }
  return url
}

const kindTex = new Map<OutputKind, THREE.CanvasTexture>()

/** The kind icon on a transparent square, as a texture. */
export function kindTexture(kind: OutputKind): THREE.CanvasTexture {
  let t = kindTex.get(kind)
  if (!t) {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    drawKindIcon(c.getContext('2d')!, kind, 64, 64, 112)
    t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    kindTex.set(kind, t)
  }
  return t
}

/* ------------------------------------------------------------------ */
/* speech bubbles                                                       */
/* ------------------------------------------------------------------ */

const bubbles = new Map<BubbleKind, THREE.CanvasTexture>()

function glyph(g: CanvasRenderingContext2D, kind: BubbleKind) {
  const text = (t: string, size: number, col: string) => {
    g.fillStyle = col
    g.font = `900 ${size}px "PingFang SC","Hiragino Sans GB","Noto Sans SC","Microsoft YaHei",sans-serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(t, 80, 74)
  }
  const heart = (cx: number, cy: number, s: number, col: string) => {
    g.fillStyle = col
    g.beginPath()
    g.moveTo(cx, cy + 18 * s)
    g.bezierCurveTo(cx - 34 * s, cy - 6 * s, cx - 18 * s, cy - 34 * s, cx, cy - 16 * s)
    g.bezierCurveTo(cx + 18 * s, cy - 34 * s, cx + 34 * s, cy - 6 * s, cx, cy + 18 * s)
    g.fill()
  }
  g.lineCap = 'round'
  g.lineJoin = 'round'
  switch (kind) {
    case 'ask': text('?', 84, '#e8902e'); break
    case 'error': text('!', 84, '#e0473a'); break
    case 'hi': text('嗨!', 54, INDIGO); break
    case 'done': {
      g.strokeStyle = '#3ea383'
      g.lineWidth = 15
      g.beginPath(); g.moveTo(48, 76); g.lineTo(70, 98); g.lineTo(112, 52); g.stroke()
      break
    }
    case 'gift': {
      g.fillStyle = CORAL
      g.fillRect(46, 64, 68, 48)
      g.fillStyle = '#ffd27a'
      g.fillRect(74, 64, 12, 48)
      g.fillRect(40, 54, 80, 14)
      g.strokeStyle = '#ffd27a'
      g.lineWidth = 8
      g.beginPath(); g.ellipse(68, 46, 12, 8, 0.4, 0, Math.PI * 2); g.stroke()
      g.beginPath(); g.ellipse(92, 46, 12, 8, -0.4, 0, Math.PI * 2); g.stroke()
      break
    }
    case 'heart': heart(80, 76, 1.5, CORAL); break
    case 'chat': {
      g.fillStyle = INDIGO
      for (const cx of [50, 80, 110]) { g.beginPath(); g.arc(cx, 76, 10, 0, Math.PI * 2); g.fill() }
      break
    }
    case 'note': {
      g.fillStyle = CORAL
      g.strokeStyle = CORAL
      g.lineWidth = 8
      g.beginPath(); g.arc(60, 102, 14, 0, Math.PI * 2); g.fill()
      g.beginPath(); g.arc(104, 92, 14, 0, Math.PI * 2); g.fill()
      g.beginPath(); g.moveTo(72, 102); g.lineTo(72, 44); g.lineTo(116, 36); g.lineTo(116, 92); g.stroke()
      break
    }
    case 'coffee': {
      g.fillStyle = INDIGO
      g.fillRect(46, 62, 54, 44)
      g.beginPath(); g.arc(73, 106, 27, 0, Math.PI); g.fill()
      g.strokeStyle = INDIGO
      g.lineWidth = 8
      g.beginPath(); g.arc(106, 82, 12, -Math.PI / 2, Math.PI / 2); g.stroke()
      g.strokeStyle = CORAL
      g.beginPath(); g.moveTo(62, 50); g.quadraticCurveTo(54, 38, 62, 28); g.moveTo(84, 50); g.quadraticCurveTo(76, 38, 84, 28); g.stroke()
      break
    }
    case 'zzz': text('Zz', 58, INDIGO); break
    case 'fish': {
      g.fillStyle = '#6f9fd8'
      g.beginPath(); g.ellipse(74, 78, 34, 20, 0, 0, Math.PI * 2); g.fill()
      g.beginPath(); g.moveTo(104, 78); g.lineTo(128, 60); g.lineTo(128, 96); g.closePath(); g.fill()
      g.fillStyle = PAPER
      g.beginPath(); g.arc(60, 72, 5, 0, Math.PI * 2); g.fill()
      break
    }
    case 'home': {
      g.fillStyle = CORAL
      g.beginPath(); g.moveTo(40, 78); g.lineTo(80, 40); g.lineTo(120, 78); g.closePath(); g.fill()
      g.fillStyle = INDIGO
      g.fillRect(52, 78, 56, 38)
      g.fillStyle = PAPER
      g.fillRect(72, 92, 16, 24)
      break
    }
    case 'book': {
      g.fillStyle = '#6f9fd8'; g.fillRect(40, 48, 38, 62)
      g.fillStyle = '#9a94cc'; g.fillRect(82, 48, 38, 62)
      g.fillStyle = INDIGO; g.fillRect(77, 44, 6, 70)
      break
    }
    case 'flower': {
      g.fillStyle = '#ffb3a1'
      for (let i = 0; i < 5; i += 1) { const a = (i / 5) * Math.PI * 2; g.beginPath(); g.arc(80 + Math.cos(a) * 22, 76 + Math.sin(a) * 22, 16, 0, Math.PI * 2); g.fill() }
      g.fillStyle = '#ffd27a'
      g.beginPath(); g.arc(80, 76, 14, 0, Math.PI * 2); g.fill()
      break
    }
    case 'work': {
      g.strokeStyle = INDIGO
      g.lineWidth = 12
      g.beginPath(); g.moveTo(52, 110); g.lineTo(98, 64); g.stroke()
      g.fillStyle = CORAL
      g.fillRect(84, 36, 46, 26)
      break
    }
    case 'icecream': {
      g.fillStyle = '#e2b98a'
      g.beginPath(); g.moveTo(58, 74); g.lineTo(102, 74); g.lineTo(80, 126); g.closePath(); g.fill()
      g.fillStyle = '#ffb3a1'
      g.beginPath(); g.arc(80, 64, 24, 0, Math.PI * 2); g.fill()
      g.fillStyle = '#b5e4d4'
      g.beginPath(); g.arc(80, 42, 17, 0, Math.PI * 2); g.fill()
      break
    }
    case 'drop': {
      g.fillStyle = '#6f9fd8'
      g.beginPath(); g.moveTo(80, 32); g.bezierCurveTo(104, 64, 112, 82, 112, 96); g.arc(80, 96, 32, 0, Math.PI, false); g.bezierCurveTo(48, 82, 56, 64, 80, 32); g.fill()
      break
    }
    case 'star': {
      g.fillStyle = '#ffd27a'
      g.beginPath()
      for (let i = 0; i < 10; i += 1) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? 18 : 40; g.lineTo(80 + Math.cos(a) * r, 78 + Math.sin(a) * r) }
      g.closePath(); g.fill()
      break
    }
  }
}

/** A speech bubble with a picture in it, as a sprite texture (160 × 160). */
export function bubbleTexture(kind: BubbleKind): THREE.CanvasTexture {
  let t = bubbles.get(kind)
  if (t) return t
  const c = document.createElement('canvas')
  c.width = c.height = 160
  const g = c.getContext('2d')!
  const edge = kind === 'ask' ? '#e8902e' : kind === 'error' ? '#e0473a' : kind === 'done' ? '#3ea383' : INDIGO
  g.fillStyle = kind === 'ask' ? '#fff3dc' : kind === 'error' ? '#ffe6e1' : PAPER
  g.strokeStyle = edge
  g.lineWidth = 7
  g.beginPath()
  g.roundRect(12, 10, 136, 124, 40)
  g.moveTo(66, 132)
  g.lineTo(80, 152)
  g.lineTo(94, 132)
  g.fill()
  g.beginPath()
  g.roundRect(12, 10, 136, 124, 40)
  g.stroke()
  g.fillStyle = g.strokeStyle
  g.beginPath()
  g.moveTo(64, 134); g.lineTo(80, 154); g.lineTo(96, 134)
  g.lineWidth = 7
  g.stroke()
  g.fillStyle = kind === 'ask' ? '#fff3dc' : kind === 'error' ? '#ffe6e1' : PAPER
  g.fillRect(66, 126, 28, 9)
  glyph(g, kind)
  t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  bubbles.set(kind, t)
  return t
}
