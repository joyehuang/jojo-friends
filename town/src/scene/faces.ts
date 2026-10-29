// Live face textures. The front of every 3D employee is the real character art:
// the library's own <AvatarStatic> drawn for their current emotion and
// rasterised onto a canvas. Rendering the markup is synchronous (flushSync);
// decoding the SVG image is not, so a new texture reports `ready` a moment
// later and the old face stays on until then.
import * as THREE from 'three'
import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { AvatarStatic, CHARACTERS, geometry, type EmotionId } from '../../../src/library'

/** the canvas window the textures cover, in the library's shared canvas units */
export const FACE_VIEWBOX = geometry.VIEWBOX.full
const SIZE = 512
/** unused textures kept around for quick emotion flips */
const SPARE = 24

interface Entry {
  tex: THREE.CanvasTexture
  ready: Promise<void>
  refs: number
  used: number
}

export class FaceAtlas {
  private entries = new Map<string, Entry>()
  private root: Root | null = null
  private host: HTMLDivElement | null = null
  private clock = 0
  private serializer = new XMLSerializer()

  /** Take a reference to the face of `char` pulling `emotion`. Give it back with release(). */
  acquire(char: string, emotion: EmotionId): Entry {
    const key = `${char}:${emotion}`
    let e = this.entries.get(key)
    if (!e) {
      e = this.make(char, emotion)
      this.entries.set(key, e)
      this.evict()
    }
    e.refs += 1
    e.used = ++this.clock
    return e
  }

  release(tex: THREE.Texture) {
    for (const e of this.entries.values()) {
      if (e.tex === tex) {
        e.refs = Math.max(0, e.refs - 1)
        e.used = ++this.clock
        return
      }
    }
  }

  private make(char: string, emotion: EmotionId): Entry {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = SIZE
    const g = canvas.getContext('2d')!
    // until the art decodes, the front is plain shell colour (never black)
    g.fillStyle = CHARACTERS[char]?.palette.shell ?? '#2d3272'
    g.fillRect(0, 0, SIZE, SIZE)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    const markup = this.markup(char, emotion)
    const ready = new Promise<void>((resolve) => {
      const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }))
      const img = new Image()
      img.decoding = 'async'
      img.onload = () => {
        g.clearRect(0, 0, SIZE, SIZE)
        g.fillStyle = CHARACTERS[char]?.palette.shell ?? '#2d3272'
        g.fillRect(0, 0, SIZE, SIZE)
        g.drawImage(img, 0, 0, SIZE, SIZE)
        tex.needsUpdate = true
        URL.revokeObjectURL(url)
        resolve()
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve()
      }
      img.src = url
    })
    return { tex, ready, refs: 0, used: ++this.clock }
  }

  private markup(char: string, emotion: EmotionId): string {
    if (!this.root) {
      this.host = document.createElement('div')
      this.root = createRoot(this.host)
    }
    flushSync(() => {
      this.root!.render(createElement(AvatarStatic, { character: char, emotion, status: 'idle', size: SIZE, shadow: false, framing: 'full', decorative: true }))
    })
    const svg = this.host!.querySelector('svg')
    if (!svg) return '<svg xmlns="http://www.w3.org/2000/svg"/>'
    const out = this.serializer.serializeToString(svg)
    return out.includes('xmlns=') ? out : out.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  }

  private evict() {
    const idle = [...this.entries.entries()].filter(([, e]) => e.refs === 0).sort((a, b) => a[1].used - b[1].used)
    for (let i = 0; i < idle.length - SPARE; i += 1) {
      idle[i][1].tex.dispose()
      this.entries.delete(idle[i][0])
    }
  }

  dispose() {
    for (const e of this.entries.values()) e.tex.dispose()
    this.entries.clear()
    const root = this.root
    this.root = null
    // unmounting synchronously inside a React commit warns; defer it
    if (root) queueMicrotask(() => root.unmount())
  }
}
