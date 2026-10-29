import { describe, expect, it } from 'vitest'
import { HOMES, LEISURE, STATIONS, buildNav } from '../../town/src/scene/layout'
import { ROLES } from '../../town/src/work/roles'

describe('town layout', () => {
  const nav = buildNav()
  const plaza = nav.nearest(14, 0)

  it('gives every job a desk, each on its own spot', () => {
    for (const r of ROLES) expect(STATIONS[r.id], r.id).toBeTruthy()
    const spots = new Set(Object.values(STATIONS).map((s) => `${s.spot[0]},${s.spot[1]}`))
    expect(spots.size).toBe(Object.keys(STATIONS).length)
  })

  it('has a home for each of the 26 characters', () => {
    expect(HOMES).toHaveLength(26)
    expect(new Set(HOMES.map((h) => h.addr)).size).toBe(26)
  })

  it('joins every desk, home and leisure spot to the walking graph, all reachable from the plaza', () => {
    const places: Array<[string, [number, number]]> = [
      ...Object.values(STATIONS).map((s) => [`station ${s.role}`, s.node] as [string, [number, number]]),
      ...HOMES.map((h) => [`home ${h.addr}`, h.node] as [string, [number, number]]),
      ...LEISURE.map((l) => [`leisure ${l.id}`, l.node] as [string, [number, number]]),
    ]
    for (const [label, node] of places) {
      expect(nav.has(node[0], node[1]), `${label} node ${node}`).toBe(true)
      const i = nav.node(node[0], node[1])
      expect(nav.path(plaza, i), `${label} reachable`).not.toBeNull()
    }
  })

  it('marks road crossings on the walking graph', () => {
    let crossings = 0
    for (const c of nav.edges.values()) if (c) crossings += 1
    expect(crossings).toBeGreaterThan(40)
  })
})
