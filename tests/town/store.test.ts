import { beforeEach, describe, expect, it } from 'vitest'
import { TownStore } from '../../town/src/store'

describe('town store', () => {
  beforeEach(() => localStorage.clear())

  it('tells the scene about a harvest before the shelves refresh, so the tiles can fly', () => {
    const store = new TownStore()
    const ready = store.state.snap.ready
    expect(ready.length).toBeGreaterThan(0)
    const pick = ready[0]
    let stillOnShelf: boolean | null = null
    store.onHarvest((outs) => {
      stillOnShelf = store.state.snap.ready.some((o) => o.id === pick.id)
      expect(outs.map((o) => o.id)).toEqual([pick.id])
    })
    const got = store.harvest([pick.id])
    expect(got).toHaveLength(1)
    expect(stillOnShelf).toBe(true)
    expect(store.state.snap.ready.some((o) => o.id === pick.id)).toBe(false)
    expect(store.state.snap.stats.harvestedToday).toBe(1)
  })

  it('remembers the town across reloads', () => {
    const a = new TownStore()
    const first = a.state.snap.ready.map((o) => o.id)
    a.harvestAll()
    const b = new TownStore()
    expect(b.state.snap.stats.harvestedTotal).toBe(first.length)
    expect(b.state.homecoming).toBeNull()
  })
})

describe('town store with a feed', () => {
  beforeEach(() => localStorage.clear())

  it('reads the feed, and a late answer after switching back to the demo is dropped', async () => {
    let release: (v: Response) => void = () => {}
    const doc = { employees: [{ id: 'o13', role: 'geo', status: 'working', task: { title: 'GEO 文章', kind: 'article', progress: 0.5 } }], outputs: [{ id: 'x1', employee: 'o13', kind: 'article', title: '一篇' }] }
    const calls: string[] = []
    const realFetch = globalThis.fetch
    globalThis.fetch = ((url: string) => {
      calls.push(url)
      if (calls.length === 1) return Promise.resolve(new Response(JSON.stringify(doc), { headers: { 'content-type': 'application/json' } }))
      return new Promise<Response>((resolve) => { release = resolve })
    }) as typeof fetch
    try {
      const store = new TownStore()
      const stop = store.start()
      store.updateSettings({ feed: { url: 'https://feed.test/a.json' }, source: 'feed' })
      await new Promise((r) => setTimeout(r, 0))
      await new Promise((r) => setTimeout(r, 0))
      expect(store.state.snap.source).toBe('feed')
      expect(store.state.snap.pending).toBeFalsy()
      expect(store.state.snap.employees.o13.task?.title).toBe('GEO 文章')
      expect(store.state.snap.ready.map((o) => o.id)).toEqual(['x1'])
      // a new token re-reads at once; switch to the demo before that answer comes back
      store.updateSettings({ feed: { url: 'https://feed.test/a.json', token: 't' } })
      expect(calls).toHaveLength(2)
      store.updateSettings({ source: 'demo' })
      release(new Response(JSON.stringify(doc), { headers: { 'content-type': 'application/json' } }))
      await new Promise((r) => setTimeout(r, 0))
      await new Promise((r) => setTimeout(r, 0))
      expect(store.state.snap.source).toBe('demo')
      stop()
    } finally {
      globalThis.fetch = realFetch
    }
  })
})
