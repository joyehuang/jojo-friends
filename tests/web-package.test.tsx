// @vitest-environment node
/**
 * The private web package (dist-web/, built by `pnpm build:web`) must draw the
 * approved Jojo exactly: its runtime uses a serialised Jojo and a Jojo-only
 * registry, so compare the *built artifacts* against the library, byte for
 * byte after normalising instance ids.
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EMOTION_IDS, JojoStatic, STATUS_IDS } from '../src/library'

const DIST = resolve(__dirname, '../dist-web')
const built = existsSync(resolve(DIST, 'runtime.js'))
const d = built ? describe : describe.skip

const idsOf = (svg: string) => [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])
/** replace every instance id (and its url(#…) references) with a stable token */
function normalise(svg: string) {
  let out = svg
  for (const [i, id] of idsOf(svg).entries()) out = out.split(id).join(`ID${i}`)
  return out
}
const lib = (props: Record<string, unknown>) => renderToStaticMarkup(createElement(JojoStatic, props))

d('web package: built artifacts', async () => {
  const stat = await import(resolve(DIST, 'static.js'))
  const rt = await import(resolve(DIST, 'runtime.js'))

  it('renderJojoSvg equals the approved JojoStatic for every emotion x status x size', () => {
    let n = 0
    for (const emotion of EMOTION_IDS)
      for (const status of STATUS_IDS)
        for (const size of [24, 44, 96]) {
          const a = normalise(stat.renderJojoSvg({ idPrefix: 'p1', emotion, status, size, decorative: true }))
          const b = normalise(lib({ emotion, status, size, decorative: true }))
          expect(a).toBe(b)
          n++
        }
    expect(n).toBe(16 * 6 * 3)
  })

  it('runtime Jojo SSR (static motion) equals the approved JojoStatic', () => {
    for (const emotion of EMOTION_IDS)
      for (const status of STATUS_IDS) {
        const a = normalise(renderToStaticMarkup(createElement(rt.Jojo, { emotion, status, size: 48, motion: 'static', idPrefix: 'x' })))
        const b = normalise(lib({ emotion, status, size: 48 }))
        expect(a).toBe(b)
      }
  })

  it('idPrefix keeps two static renders of the same pose from sharing ids', () => {
    const a = idsOf(stat.renderJojoSvg({ idPrefix: 'calm-a', emotion: 'calm' }))
    const b = idsOf(stat.renderJojoSvg({ idPrefix: 'happy-b', emotion: 'happy' }))
    expect(a.length).toBe(9)
    expect(a.filter((id) => b.includes(id))).toEqual([])
    expect(() => stat.renderJojoSvg({ idPrefix: '::' })).toThrow()
  })

  it('runtime islands with different prefixes never collide, even with equal useId', () => {
    const one = renderToStaticMarkup(createElement(rt.Jojo, { idPrefix: 'hero-', motion: 'static' }))
    const two = renderToStaticMarkup(createElement(rt.Jojo, { idPrefix: 'dock-', motion: 'static' }))
    expect(idsOf(one).filter((id) => idsOf(two).includes(id))).toEqual([])
  })

  it('friend SVGs are prefixed, labelled on request, and carry no placeholder', () => {
    for (const f of stat.FRIENDS) {
      const svg = stat.renderFriendSvg(f.id, { idPrefix: `about-${f.id}`, title: f.name.zh })
      expect(svg).not.toContain('JIDPX')
      expect(svg).toContain(`aria-label="${f.name.zh}"`)
      expect(new Set(idsOf(svg)).size).toBe(idsOf(svg).length)
      const deco = stat.renderFriendSvg(f.id, { idPrefix: 'd', decorative: true })
      expect(deco).toContain('aria-hidden="true"')
    }
  })

  it('exposes geometry for choreography and a quiet ticker', () => {
    expect(rt.JOJO_GEOMETRY.dot).toEqual({ cx: 501, cy: 297, r: 53 })
    expect(rt.ticker.running).toBe(false)
    expect(rt.EMOTION_IDS).toHaveLength(16)
  })
})
