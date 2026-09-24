import { act, cleanup, render } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Jojo, JojoStatic, ticker, EMOTION_IDS, type JojoHandle } from '../src/library'

/* ---------------- environment stubs ---------------- */

let reduced = false
const mqListeners = new Set<() => void>()
const ioInstances: Array<{ cb: IntersectionObserverCallback; el?: Element; disconnected: boolean }> = []

beforeEach(() => {
  reduced = false
  mqListeners.clear()
  ioInstances.length = 0
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout', 'setInterval'] })
  vi.stubGlobal('matchMedia', (q: string) => ({
    get matches() {
      return q.includes('reduce') ? reduced : false
    },
    media: q,
    addEventListener: (_: string, cb: () => void) => mqListeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => mqListeners.delete(cb),
  }))
  class IO {
    rec: { cb: IntersectionObserverCallback; el?: Element; disconnected: boolean }
    constructor(cb: IntersectionObserverCallback) {
      this.rec = { cb, disconnected: false }
      ioInstances.push(this.rec)
    }
    observe(el: Element) {
      this.rec.el = el
    }
    disconnect() {
      this.rec.disconnected = true
    }
    unobserve() {}
    takeRecords() {
      return []
    }
  }
  vi.stubGlobal('IntersectionObserver', IO)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const frames = (n: number) => act(() => vi.advanceTimersByTime(n * 16.7))
const svgOf = (c: HTMLElement) => c.querySelector('svg[data-jojo]') as SVGSVGElement
const attr = (svg: SVGSVGElement, part: string, a = 'transform') =>
  svg.querySelector(`[data-part="${part}"]`)!.getAttribute(a)

function setIntersecting(i: number, v: boolean) {
  const rec = ioInstances[i]
  act(() => rec.cb([{ isIntersecting: v, target: rec.el! } as IntersectionObserverEntry], {} as IntersectionObserver))
}

/* ---------------- tests ---------------- */

describe('instance-safe SVG ids', () => {
  it('every instance gets unique ids and every url(#…) resolves inside its own svg', () => {
    const { container } = render(
      <div>
        <Jojo emotion='happy' />
        <Jojo emotion='sob' />
        <JojoStatic emotion='angry' />
        <JojoStatic emotion='angry' />
      </div>,
    )
    const ids = [...container.querySelectorAll('[id]')].map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const svg of container.querySelectorAll('svg[data-jojo]')) {
      const own = new Set([...svg.querySelectorAll('[id]')].map((e) => e.id))
      const refs = svg.outerHTML.match(/url\(#([^)]+)\)/g)!.map((m) => m.slice(5, -1))
      expect(refs.length).toBeGreaterThan(4)
      for (const r of refs) expect(own.has(r), r).toBe(true)
    }
  })
})

describe('engine lifecycle', () => {
  it('full motion animates through one shared rAF subscription', () => {
    const { container } = render(<Jojo emotion='calm' motion='full' />)
    expect(ticker.subscribers).toBe(1)
    const svg = svgOf(container)
    const a = attr(svg, 'body')
    frames(40)
    expect(attr(svg, 'body')).not.toBe(a) // breathing
  })

  it('rapid switching never stacks subscriptions or timers', () => {
    const { container, rerender } = render(<Jojo emotion='calm' motion='full' />)
    for (let i = 0; i < 60; i++) {
      rerender(<Jojo emotion={EMOTION_IDS[i % EMOTION_IDS.length]} status={i % 2 ? 'working' : 'error'} motion='full' />)
      frames(1)
    }
    expect(ticker.subscribers).toBe(1)
    expect(vi.getTimerCount()).toBeLessThanOrEqual(1) // at most the single pending rAF
    frames(120)
    expect(svgOf(container).dataset.emotion).toBe(EMOTION_IDS[59 % EMOTION_IDS.length])
  })

  it('static motion: no subscription, no timers, attributes frozen, but prop changes still apply', () => {
    const { container, rerender } = render(<Jojo emotion='calm' motion='static' />)
    expect(ticker.subscribers).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    const svg = svgOf(container)
    const eye = attr(svg, 'eyeLPath', 'd')
    frames(60)
    expect(attr(svg, 'eyeLPath', 'd')).toBe(eye)
    rerender(<Jojo emotion='happy' motion='static' />)
    expect(attr(svg, 'eyeLPath', 'd')).not.toBe(eye) // jumped straight to the new pose
    expect(ticker.subscribers).toBe(0)
  })

  it('prefers-reduced-motion really stops loops (auto and even explicit full)', () => {
    reduced = true
    const { container } = render(
      <>
        <Jojo emotion='sob' />
        <Jojo emotion='laugh' motion='full' />
      </>,
    )
    expect(ticker.subscribers).toBe(0)
    const svgs = container.querySelectorAll('svg[data-jojo]')
    expect([...svgs].map((s) => (s as SVGSVGElement).dataset.motion)).toEqual(['static', 'static'])
    const before = [...svgs].map((s) => s.innerHTML)
    frames(90)
    expect([...svgs].map((s) => s.innerHTML)).toEqual(before)
  })

  it('reacts live when the OS setting flips', () => {
    const { container } = render(<Jojo emotion='think' />)
    expect(ticker.subscribers).toBe(1)
    reduced = true
    act(() => mqListeners.forEach((l) => l()))
    expect(svgOf(container).dataset.motion).toBe('static')
    expect(ticker.subscribers).toBe(0)
  })

  it('transitions mode animates a change, then settles and unsubscribes', () => {
    const { rerender } = render(<Jojo emotion='calm' motion='transitions' />)
    frames(5)
    expect(ticker.subscribers).toBe(0)
    rerender(<Jojo emotion='surprised' motion='transitions' />)
    expect(ticker.subscribers).toBe(1)
    frames(150)
    expect(ticker.subscribers).toBe(0)
  })

  it('pauses off-screen (IntersectionObserver) and resumes on return', () => {
    render(<Jojo emotion='happy' motion='full' />)
    expect(ticker.subscribers).toBe(1)
    setIntersecting(0, false)
    expect(ticker.subscribers).toBe(0)
    setIntersecting(0, true)
    expect(ticker.subscribers).toBe(1)
  })

  it('stops the shared rAF while the tab is hidden', () => {
    render(<Jojo emotion='happy' motion='full' />)
    expect(ticker.running).toBe(true)
    const vis = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(ticker.running).toBe(false)
    vis.mockReturnValue('visible')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(ticker.running).toBe(true)
    vis.mockRestore()
  })

  it('unmount cleans up: ticker, observer and pointer listeners', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<Jojo emotion='curious' gaze='pointer' motion='full' />)
    const added = add.mock.calls.filter(([t]) => t === 'pointermove').length
    expect(added).toBe(1)
    unmount()
    expect(ticker.subscribers).toBe(0)
    expect(ticker.running).toBe(false)
    expect(ioInstances.every((i) => i.disconnected)).toBe(true)
    expect(remove.mock.calls.filter(([t]) => t === 'pointermove').length).toBe(added)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('poke restarts instead of stacking, and is a no-op when static', () => {
    const ref = createRef<JojoHandle>()
    const { rerender } = render(<Jojo ref={ref} motion='transitions' />)
    frames(5)
    for (let i = 0; i < 20; i++) act(() => ref.current!.poke())
    expect(ticker.subscribers).toBe(1)
    frames(60)
    expect(ticker.subscribers).toBe(0)
    rerender(<Jojo ref={ref} motion='static' />)
    act(() => ref.current!.poke())
    expect(ticker.subscribers).toBe(0)
  })
})

describe('accessibility', () => {
  it('names the image with emotion and status text; decorative hides it', () => {
    const { container } = render(
      <>
        <Jojo emotion='think' status='working' motion='static' />
        <Jojo decorative motion='static' />
      </>,
    )
    const [a, b] = container.querySelectorAll('svg[data-jojo]')
    expect(a.getAttribute('role')).toBe('img')
    expect(a.getAttribute('aria-label')).toBe('Jojo：思考，状态：工作中')
    expect(b.getAttribute('aria-hidden')).toBe('true')
    expect(b.getAttribute('role')).toBeNull()
  })

  it('error status does not make Jojo cry', () => {
    const { container } = render(<Jojo status='error' motion='static' />)
    const svg = svgOf(container)
    expect(svg.dataset.emotion).toBe('calm')
    expect(attr(svg, 'dropL', 'opacity')).toBe('0')
    expect(attr(svg, 'streamL', 'opacity')).toBe('0')
    expect(attr(svg, 'mark', 'opacity')).toBe('1')
  })
})
