import { describe, expect, it } from 'vitest'
import { CHARACTER_LIST } from '../src/library'
import { STORIES } from '../src/site/content/stories'
import { matchRoute, prerenderPaths, routeMeta } from '../src/site/routes'

describe('routes', () => {
  it('matches every page and nothing else', () => {
    expect(matchRoute('/').kind).toBe('home')
    expect(matchRoute('/stories').kind).toBe('stories')
    expect(matchRoute('/stories/').kind).toBe('stories')
    expect(matchRoute('/stories/door-404')).toMatchObject({ kind: 'story', story: { id: 'door-404' } })
    expect(matchRoute('/friends').kind).toBe('friends')
    expect(matchRoute('/play').kind).toBe('play')
    expect(matchRoute('/c/o18')).toMatchObject({ kind: 'character', character: { id: 'o18' } })
    expect(matchRoute('/about').kind).toBe('about')
    for (const p of ['/stories/nope', '/c/nope', '/downloads', '/kit', '/reference/hero-h.png', '/c/o18/extra', '/STORIES']) {
      expect(matchRoute(p).kind, p).toBe('notfound')
    }
  })

  it('prerenders every page once: 5 sections + each story + each character', () => {
    const paths = prerenderPaths()
    expect(paths.length).toBe(5 + STORIES.length + CHARACTER_LIST.length)
    expect(new Set(paths).size).toBe(paths.length)
    for (const p of paths) expect(matchRoute(p).kind, p).not.toBe('notfound')
  })

  it('titles are distinct and never claim a domain', () => {
    const metas = prerenderPaths().map((p) => routeMeta(matchRoute(p)))
    expect(new Set(metas.map((m) => m.title)).size).toBe(metas.length)
    for (const m of metas) {
      expect(m.title).toMatch(/Jojo 的小家/)
      expect(`${m.title} ${m.description}`).not.toMatch(/jojo\.house|\.com|\.app/i)
    }
  })
})
