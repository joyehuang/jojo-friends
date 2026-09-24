// @vitest-environment node
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Jojo, JojoStatic, EMOTION_IDS } from '../src/library'

describe('SSR', () => {
  it('renders without window/document and matches the static pose', () => {
    expect(typeof window).toBe('undefined')
    const html = renderToString(
      <div>
        <Jojo emotion='think' status='working' size={64} />
        <JojoStatic emotion='think' status='working' size={64} />
      </div>,
    )
    expect(html).toContain('aria-label="Jojo：思考，状态：工作中"')
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])
    expect(new Set(ids).size).toBe(ids.length)
    // the animated component's first paint equals the static render
    const parts = (s: string) => [...s.matchAll(/data-part="eyeLPath" d="([^"]+)"/g)].map((m) => m[1])
    const [a, b] = parts(html)
    expect(a).toBe(b)
  })

  it('every emotion renders to valid-looking SVG with no NaN', () => {
    for (const id of EMOTION_IDS) {
      const html = renderToString(<JojoStatic emotion={id} />)
      expect(html.startsWith('<svg')).toBe(true)
      expect(html).not.toMatch(/NaN|undefined|Infinity/)
    }
  })
})
