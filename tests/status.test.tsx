import { act, cleanup, render } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Jojo, JojoStatic, ticker, EMOTION_IDS, STATUS_IDS, type JojoHandle, type StatusId } from '../src/library'

/* same environment stubs as component.test.tsx */
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
const seconds = (s: number) => frames(Math.round(s * 60))
const svgOf = (c: HTMLElement) => c.querySelector('svg[data-jojo]') as SVGSVGElement
const el = (svg: SVGSVGElement, part: string) => svg.querySelector(`[data-part="${part}"]`)
const attr = (svg: SVGSVGElement, part: string, a = 'transform') => el(svg, part)!.getAttribute(a)
const layers = (svg: SVGSVGElement) =>
  [...svg.querySelectorAll('[data-layer^="status-"]')].map((e) => e.getAttribute('data-layer') ?? '').sort()

const TASK: StatusId[] = ['working', 'needs-input', 'success']
const FACE_PARTS = [
  'body', 'shadow', 'face', 'features', 'eyeL', 'eyeLPath', 'lidL', 'eyeR', 'eyeRPath', 'lidR', 'shineL', 'shineR',
  'brows', 'browL', 'browR', 'mouth', 'mouthPath', 'mouthClip', 'tongue', 'blush', 'blushL', 'blushR',
  'tears', 'poolL', 'poolR', 'dropL', 'dropR', 'streamL', 'streamR',
]
const faceState = (svg: SVGSVGElement) =>
  FACE_PARTS.map((p) => {
    const e = el(svg, p)!
    return `${p}:${[...e.attributes].filter((a) => a.name !== 'data-part').map((a) => `${a.name}=${a.value}`).join(' ')}`
  }).join('\n')

describe('status shapes (static vectors)', () => {
  it('each task status mounts exactly its own shape, other statuses mount none', () => {
    const want: Record<StatusId, string[]> = {
      idle: [],
      working: ['status-working'],
      'needs-input': ['status-needs-input'],
      success: ['status-success', 'status-success-spark'],
      error: [],
      offline: [],
    }
    for (const s of STATUS_IDS) {
      for (const size of [240, 32, 24]) {
        const { container, unmount } = render(<JojoStatic status={s} size={size} />)
        expect(layers(svgOf(container)), `${s}@${size}`).toEqual(want[s])
        unmount()
      }
    }
  })

  it('static shapes are visibly on: gauge arc, bubble with "?", drawn check', () => {
    const r = (s: StatusId) => svgOf(render(<JojoStatic status={s} size={32} />).container)
    const w = r('working')
    expect(attr(w, 'gauge', 'opacity')).toBe('1')
    expect(attr(w, 'gaugeFill', 'opacity')).toBe('1')
    expect(attr(w, 'gaugeFill', 'd')).toMatch(/^M[\d.,-]+ A/)
    const n = r('needs-input')
    expect(attr(n, 'bubble', 'opacity')).toBe('1')
    expect(attr(n, 'bubbleShape', 'd')).toMatch(/Z$/)
    expect(el(n, 'askPath')).not.toBeNull()
    const s = r('success')
    expect(attr(s, 'check', 'opacity')).toBe('1')
    expect(attr(s, 'check', 'd')!.split('L').length).toBe(3) // both strokes of the tick
  })

  it('switching status never changes the face (all 16 emotions × 3 statuses)', () => {
    for (const e of EMOTION_IDS) {
      const base = faceState(svgOf(render(<JojoStatic emotion={e} size={96} />).container))
      for (const s of TASK) {
        const { container, unmount } = render(<JojoStatic emotion={e} status={s} size={96} />)
        expect(faceState(svgOf(container)), `${e}/${s}`).toBe(base)
        expect(svgOf(container).dataset.emotion).toBe(e)
        unmount()
      }
      cleanup()
    }
  })

  it('the animated component keeps the face too while status changes', () => {
    const { container, rerender } = render(<Jojo emotion='sob' motion='static' />)
    const base = faceState(svgOf(container))
    for (const s of TASK) {
      rerender(<Jojo emotion='sob' status={s} motion='static' />)
      expect(faceState(svgOf(container)), s).toBe(base)
    }
  })

  it('accessible name still spells the status out in text', () => {
    const { container } = render(
      <>
        {TASK.map((s) => (
          <Jojo key={s} emotion='calm' status={s} motion='static' />
        ))}
      </>,
    )
    expect([...container.querySelectorAll('svg')].map((s) => s.getAttribute('aria-label'))).toEqual([
      'Jojo：平静，状态：工作中',
      'Jojo：平静，状态：等你回复',
      'Jojo：平静，状态：已完成',
    ])
  })
})

describe('status motion lifecycle', () => {
  it('success plays once, then holds the check; re-renders do not replay it; replayStatus does', () => {
    const ref = createRef<JojoHandle>()
    const { container, rerender } = render(<Jojo ref={ref} emotion='calm' motion='full' />)
    frames(10)
    rerender(<Jojo ref={ref} emotion='calm' status='success' motion='full' />)
    const svg = svgOf(container)
    frames(8) // ~0.13s: tick not drawn yet
    const early = attr(svg, 'check', 'd')!
    expect(early.split('L').length).toBeLessThan(3)
    frames(4)
    seconds(0.25)
    const pop = attr(svg, 'dot')
    seconds(1.2)
    const heldCheck = attr(svg, 'check', 'd')
    expect(attr(svg, 'check', 'opacity')).toBe('1')
    expect(attr(svg, 'check', 'd')!.split('L').length).toBe(3)
    expect(attr(svg, 'dot')).not.toBe(pop) // the pop settled
    expect(attr(svg, 'ring', 'opacity')).toBe('0')
    seconds(6)
    // breathing still runs, but the completion does not loop: the tick stays
    // fully drawn and the burst ring / sparkles stay off
    expect(attr(svg, 'check', 'd')).toBe(heldCheck)
    expect(attr(svg, 'ring', 'opacity')).toBe('0')
    for (let i = 0; i < 6; i++) expect(attr(svg, `spark${i}`, 'opacity')).toBe('0')

    // a normal re-render (other prop changed) must not replay the completion
    rerender(<Jojo ref={ref} emotion='happy' status='success' motion='full' />)
    frames(3)
    expect(attr(svg, 'check', 'd')!.split('L').length).toBe(3)
    expect(attr(svg, 'ring', 'opacity')).toBe('0')

    // explicit replay restarts it
    act(() => ref.current!.replayStatus())
    frames(3)
    expect(attr(svg, 'check', 'd')!.split('L').length).toBeLessThan(3)
    expect(Number(attr(svg, 'ring', 'opacity'))).toBeGreaterThan(0)
    seconds(1.5)
    expect(attr(svg, 'check', 'd')!.split('L').length).toBe(3)
  })

  it('success in transitions mode plays once and then unsubscribes with the check kept', () => {
    const { container, rerender } = render(<Jojo motion='transitions' />)
    frames(5)
    expect(ticker.subscribers).toBe(0)
    rerender(<Jojo status='success' motion='transitions' />)
    expect(ticker.subscribers).toBe(1)
    seconds(2.5)
    expect(ticker.subscribers).toBe(0)
    const svg = svgOf(container)
    expect(attr(svg, 'check', 'opacity')).toBe('1')
    expect(attr(svg, 'check', 'd')!.split('L').length).toBe(3)
  })

  it('needs-input: one pop on entry, then the bubble is completely still (even in full motion)', () => {
    const { container, rerender } = render(<Jojo emotion='calm' motion='full' />)
    frames(5)
    rerender(<Jojo emotion='calm' status='needs-input' motion='full' />)
    const svg = svgOf(container)
    frames(6)
    const popping = attr(svg, 'bubble')
    seconds(1.2)
    const settled = [attr(svg, 'bubble'), attr(svg, 'bubble', 'opacity'), attr(svg, 'ask')]
    expect(popping).not.toBe(settled[0])
    expect(settled[1]).toBe('1')
    const samples = new Set<string>()
    for (let i = 0; i < 40; i++) {
      frames(9)
      // bubble scale/opacity and the "?" never change again
      samples.add([attr(svg, 'bubble', 'opacity'), attr(svg, 'ask'), attr(svg, 'bubble')!.match(/scale\([^)]+\)/)![0]].join('|'))
    }
    expect(samples.size).toBe(1)
    expect([...samples][0]).toContain('scale(1)')
  })

  it('working: the gauge keeps moving in full motion, and only there', () => {
    const { container, rerender } = render(<Jojo status='working' motion='full' />)
    const svg = svgOf(container)
    seconds(0.8)
    const seen = new Set<string>()
    for (let i = 0; i < 30; i++) {
      frames(4)
      seen.add(attr(svg, 'gaugeFill', 'd')!)
    }
    expect(seen.size).toBeGreaterThan(20) // keeps travelling
    // transitions: fill once, then settle on the static reading and unsubscribe
    rerender(<Jojo status='working' motion='transitions' />)
    seconds(2)
    expect(ticker.subscribers).toBe(0)
    const still = svgOf(render(<JojoStatic status='working' size='100%' />).container)
    expect(attr(svg, 'gaugeFill', 'd')).toBe(attr(still, 'gaugeFill', 'd'))
    rerender(<Jojo status='working' motion='static' />)
    frames(30)
    expect(ticker.subscribers).toBe(0)
    expect(attr(svg, 'gaugeFill', 'd')).toBe(attr(still, 'gaugeFill', 'd'))
  })

  it('reduced motion: all three shapes render static, nothing subscribes, nothing changes', () => {
    reduced = true
    const { container } = render(
      <>
        {TASK.map((s) => (
          <Jojo key={s} status={s} motion='full' />
        ))}
      </>,
    )
    expect(ticker.subscribers).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    const svgs = [...container.querySelectorAll('svg[data-jojo]')] as SVGSVGElement[]
    const before = svgs.map((s) => s.innerHTML)
    frames(120)
    expect(svgs.map((s) => s.innerHTML)).toEqual(before)
    expect(attr(svgs[0], 'gauge', 'opacity')).toBe('1')
    expect(attr(svgs[1], 'bubble', 'opacity')).toBe('1')
    expect(attr(svgs[2], 'check', 'opacity')).toBe('1')
  })

  it('rapid status switching: one subscription, ≤1 pending rAF, only the current shape mounted and driven', () => {
    const ref = createRef<JojoHandle>()
    const { container, rerender } = render(<Jojo ref={ref} motion='full' />)
    for (let i = 0; i < 90; i++) {
      rerender(<Jojo ref={ref} status={STATUS_IDS[i % STATUS_IDS.length]} motion='full' />)
      if (i % 7 === 0) act(() => ref.current!.replayStatus())
      frames(1)
    }
    expect(ticker.subscribers).toBe(1)
    expect(vi.getTimerCount()).toBeLessThanOrEqual(1)
    for (const s of TASK) {
      rerender(<Jojo ref={ref} status={s} motion='full' />)
      frames(1)
      expect(layers(svgOf(container)).filter((l) => !l.endsWith('spark'))).toEqual([`status-${s}`])
    }
    // the freshly mounted check is driven by the engine (it animates in, then holds)
    frames(2)
    const a = attr(svgOf(container), 'check', 'd')
    seconds(1.2)
    expect(attr(svgOf(container), 'check', 'd')).not.toBe(a)
    expect(ticker.subscribers).toBe(1)
    expect(vi.getTimerCount()).toBeLessThanOrEqual(1)
  })

  it('off-screen, hidden tab and unmount still clean up with a looping status', () => {
    const { unmount } = render(<Jojo status='working' motion='full' />)
    expect(ticker.subscribers).toBe(1)
    const ioLen = ioInstances.length
    ioInstances.slice(0, ioLen).forEach((rec) =>
      act(() => rec.cb([{ isIntersecting: false, target: rec.el! } as IntersectionObserverEntry], {} as IntersectionObserver)),
    )
    expect(ticker.subscribers).toBe(0)
    ioInstances.forEach((rec) =>
      act(() => rec.cb([{ isIntersecting: true, target: rec.el! } as IntersectionObserverEntry], {} as IntersectionObserver)),
    )
    expect(ticker.subscribers).toBe(1)
    const vis = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(ticker.running).toBe(false)
    vis.mockReturnValue('visible')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(ticker.running).toBe(true)
    vis.mockRestore()
    unmount()
    expect(ticker.subscribers).toBe(0)
    expect(ticker.running).toBe(false)
    expect(ioInstances.every((i) => i.disconnected)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('replayStatus is a no-op when static', () => {
    const ref = createRef<JojoHandle>()
    const { container } = render(<Jojo ref={ref} status='success' motion='static' />)
    const before = svgOf(container).innerHTML
    act(() => ref.current!.replayStatus())
    frames(20)
    expect(ticker.subscribers).toBe(0)
    expect(svgOf(container).innerHTML).toBe(before)
  })
})
