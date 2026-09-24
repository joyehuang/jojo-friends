import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Avatar, AvatarStatic, CHARACTER_LIST, Jojo, ticker } from '../src/library'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout', 'setInterval'] })
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const frames = (n: number) => act(() => vi.advanceTimersByTime(n * 16.7))
const svgOf = (c: HTMLElement) => c.querySelector('svg[data-jojo]') as SVGSVGElement
const attr = (svg: Element, part: string, a: string) => svg.querySelector(`[data-part="${part}"]`)!.getAttribute(a)
const PARTS: Array<[string, string]> = [['eyeLPath', 'd'], ['eyeRPath', 'd'], ['mouthPath', 'd'], ['eyeL', 'transform'], ['dot', 'transform'], ['check', 'd']]

describe('switching characters on a live avatar', () => {
  it('keeps emotion and status, repaints on the new rig, and settles to the static frame', () => {
    const { container, rerender } = render(<Avatar character='jojo' emotion='happy' status='success' motion='transitions' size={120} />)
    frames(120)
    for (const c of CHARACTER_LIST.slice(1, 8)) {
      rerender(<Avatar character={c.id} emotion='happy' status='success' motion='transitions' size={120} />)
      const svg = svgOf(container)
      expect(svg.dataset.character).toBe(c.id)
      expect(svg.dataset.emotion).toBe('happy')
      expect(svg.dataset.status).toBe('success')
      frames(180)
      expect(ticker.subscribers).toBe(0)
      const want = svgOf(render(<AvatarStatic character={c.id} emotion='happy' status='success' size={120} />).container)
      for (const [p, a] of PARTS) expect(attr(svg, p, a), `${c.id} ${p}`).toBe(attr(want, p, a))
      expect(svg.querySelector('[data-layer="shell"]')!.getAttribute('d')).toBe(want.querySelector('[data-layer="shell"]')!.getAttribute('d'))
    }
  })

  it('static motion switches instantly with no subscription or timers', () => {
    const { container, rerender } = render(<Avatar character='o07' emotion='sob' motion='static' />)
    rerender(<Avatar character='o11' emotion='sob' motion='static' />)
    expect(ticker.subscribers).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    const want = svgOf(render(<AvatarStatic character='o11' emotion='sob' />).container)
    for (const [p, a] of PARTS.slice(0, 5)) expect(attr(svgOf(container), p, a)).toBe(attr(want, p, a))
  })

  it('many different characters on one page never share SVG ids', () => {
    const { container } = render(
      <>
        {CHARACTER_LIST.map((c) => <Avatar key={c.id} character={c.id} motion='static' />)}
        {CHARACTER_LIST.map((c) => <AvatarStatic key={c.id} character={c.id} />)}
      </>,
    )
    const ids = [...container.querySelectorAll('[id]')].map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const svg of container.querySelectorAll('svg[data-jojo]')) {
      const own = new Set([...svg.querySelectorAll('[id]')].map((e) => e.id))
      for (const r of svg.outerHTML.match(/url\(#([^)]+)\)/g)!.map((m) => m.slice(5, -1))) expect(own.has(r)).toBe(true)
    }
  })

  it('accessible names use each character\'s own name; the legacy Jojo keeps its approved markup', () => {
    const { container } = render(
      <>
        <Avatar character='o02' emotion='think' status='working' motion='static' />
        <Jojo emotion='think' status='working' motion='static' />
      </>,
    )
    const [a, b] = container.querySelectorAll('svg[data-jojo]')
    expect(a.getAttribute('aria-label')).toBe(`${CHARACTER_LIST[7].name.en}：思考，状态：工作中`)
    expect(b.getAttribute('aria-label')).toBe('Jojo：思考，状态：工作中')
    expect(b.hasAttribute('data-character')).toBe(false)
  })
})
