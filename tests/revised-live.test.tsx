// The revised characters on the live component: keyframes over time, gaze
// extremes, poke / replayStatus, reduced motion and off-screen pausing.
import { act, cleanup, render } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Avatar, AvatarStatic, EMOTION_IDS, STATUS_IDS, ticker, type JojoHandle } from '../src/library'

let reduced = false
const io: Array<{ cb: IntersectionObserverCallback; el?: Element }> = []
beforeEach(() => {
  reduced = false
  io.length = 0
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout', 'setInterval'] })
  vi.stubGlobal('matchMedia', (q: string) => ({ get matches() { return q.includes('reduce') ? reduced : false }, media: q, addEventListener() {}, removeEventListener() {} }))
  vi.stubGlobal('IntersectionObserver', class {
    rec: { cb: IntersectionObserverCallback; el?: Element }
    constructor(cb: IntersectionObserverCallback) { this.rec = { cb }; io.push(this.rec) }
    observe(el: Element) { this.rec.el = el }
    disconnect() {}
    unobserve() {}
    takeRecords() { return [] }
  })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const frames = (n: number) => act(() => vi.advanceTimersByTime(n * 16.7))
const svgOf = (c: HTMLElement) => c.querySelector('svg[data-jojo]') as SVGSVGElement
const FEATURES = ['eyeLPath', 'eyeRPath', 'mouthPath']
const snapshot = (svg: SVGSVGElement) => FEATURES.map((p) => svg.querySelector(`[data-part="${p}"]`)!.getAttribute('d')).join('|') +
  ['eyeL', 'eyeR', 'mouth', 'dot'].map((p) => svg.querySelector(`[data-part="${p}"]`)!.getAttribute('transform')).join('|')

for (const id of ['o05', 'o16', 'o07']) {
  describe(`${id} live`, () => {
    it('every emotion animates in full motion with finite geometry, and every status keeps the face', () => {
      for (const e of EMOTION_IDS) {
        const { container, unmount } = render(<Avatar character={id} emotion={e} status='working' motion='full' size={96} />)
        const seen = new Set<string>()
        for (let k = 0; k < 6; k++) {
          frames(37)
          const html = svgOf(container).outerHTML
          expect(html, `${e} frame ${k}`).not.toMatch(/NaN|Infinity|undefined/)
          seen.add(snapshot(svgOf(container)))
        }
        expect(seen.size, `${e} should move`).toBeGreaterThan(1)
        unmount()
      }
      for (const s of STATUS_IDS) {
        const { container } = render(<Avatar character={id} status={s} motion='static' size={96} />)
        expect(svgOf(container).dataset.status).toBe(s)
        cleanup()
      }
    })

    it('gaze extremes move the features and stay finite', () => {
      const looks = [{ x: -1, y: -1 }, { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }].map((g) => {
        const { container } = render(<AvatarStatic character={id} emotion='curious' gaze={g} intensity={1} size={240} />)
        const s = snapshot(svgOf(container))
        expect(s).not.toMatch(/NaN|Infinity/)
        cleanup()
        return s
      })
      expect(new Set(looks).size).toBe(4)
    })

    it('poke and replayStatus play once and settle; static and reduced motion ignore them; off-screen pauses', () => {
      const ref = createRef<JojoHandle>()
      const { container, rerender } = render(<Avatar ref={ref} character={id} status='success' motion='transitions' size={96} />)
      frames(200)
      expect(ticker.subscribers).toBe(0)
      const rest = snapshot(svgOf(container))
      act(() => ref.current!.poke())
      expect(ticker.subscribers).toBe(1)
      frames(4)
      expect(snapshot(svgOf(container))).not.toBe(rest)
      frames(200)
      expect(ticker.subscribers).toBe(0)
      act(() => ref.current!.replayStatus())
      expect(ticker.subscribers).toBe(1)
      frames(200)
      expect(ticker.subscribers).toBe(0)
      rerender(<Avatar ref={ref} character={id} status='success' motion='static' size={96} />)
      act(() => { ref.current!.poke(); ref.current!.replayStatus() })
      expect(ticker.subscribers).toBe(0)
      cleanup()

      render(<Avatar character={id} emotion='laugh' motion='full' />)
      expect(ticker.subscribers).toBe(1)
      act(() => io[io.length - 1].cb([{ isIntersecting: false, target: io[io.length - 1].el! } as IntersectionObserverEntry], {} as IntersectionObserver))
      expect(ticker.subscribers).toBe(0)
      cleanup()

      reduced = true
      const r = render(<Avatar character={id} emotion='sob' motion='full' />)
      expect(ticker.subscribers).toBe(0)
      expect(svgOf(r.container).dataset.motion).toBe('static')
    })
  })
}
