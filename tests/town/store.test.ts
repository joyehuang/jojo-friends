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
