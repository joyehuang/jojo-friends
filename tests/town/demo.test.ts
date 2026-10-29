// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { CHARACTER_IDS } from '../../src/library'
import { HOUR, MIN, SHELF_CAP, advance, answer, assign, createState, harvest, homecoming, snapshotOf } from '../../town/src/work/demo'
import { snapshotFromFeed } from '../../town/src/work/feed'
import { ROLES, ROLE_MAP } from '../../town/src/work/roles'
import { DEFAULT_ROSTER } from '../../town/src/work/roster'

const T0 = new Date(2026, 9, 29, 10, 0, 0).getTime() // 10:00 local, inside the day shift
const SEED = 20261029

describe('roles and roster', () => {
  it('every role is valid and has work to do', () => {
    const ids = new Set<string>()
    for (const r of ROLES) {
      expect(ids.has(r.id), r.id).toBe(false)
      ids.add(r.id)
      expect(r.tasks.length, r.id).toBeGreaterThan(0)
      expect(r.topics.length, r.id).toBeGreaterThan(0)
      expect(r.summaries.length, r.id).toBeGreaterThan(0)
      expect(r.asks.length, r.id).toBeGreaterThan(0)
      expect(r.errors.length, r.id).toBeGreaterThan(0)
      for (const a of r.asks) expect(a.options.length, r.id).toBeGreaterThanOrEqual(2)
    }
  })

  it('the default roster covers the whole cast and gives each job one holder', () => {
    expect(Object.keys(DEFAULT_ROSTER).sort()).toEqual([...CHARACTER_IDS].sort())
    const held = Object.values(DEFAULT_ROSTER).filter((r): r is string => !!r)
    expect(new Set(held).size).toBe(held.length)
    for (const r of held) expect(ROLE_MAP[r], r).toBeDefined()
  })
})

describe('demo work loop', () => {
  it('opens with work already done, and never overfills a shelf', () => {
    const s = createState(T0, SEED)
    expect(Object.keys(s.employees)).toHaveLength(CHARACTER_IDS.length)
    const snap = snapshotOf(s, T0)
    expect(snap.stats.ready).toBeGreaterThan(5)
    // a fresh town is busy, not stalled: most of the day shift is at work
    expect(snap.stats.working).toBeGreaterThanOrEqual(8)
    for (const e of Object.values(s.employees)) expect(e.ready.length).toBeLessThanOrEqual(SHELF_CAP)
    for (const id of CHARACTER_IDS) {
      const v = snap.employees[id]
      expect(v.role?.id ?? null).toBe(DEFAULT_ROSTER[id])
      if (!v.role) expect(v.phase).toBe('idle')
    }
  })

  it('is deterministic: one big jump equals many small steps', () => {
    const a = createState(T0, SEED)
    const b = createState(T0, SEED)
    advance(a, T0 + 3 * HOUR)
    for (let t = T0; t <= T0 + 3 * HOUR; t += 7_000) advance(b, t)
    advance(b, T0 + 3 * HOUR)
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b))
  })

  it('a full shelf stops work until you harvest, then work resumes', () => {
    const s = createState(T0, SEED)
    advance(s, T0 + 6 * HOUR)
    const full = Object.values(s.employees).find((e) => e.phase === 'full')
    expect(full, 'someone should be waiting with a full shelf').toBeDefined()
    expect(full!.ready).toHaveLength(SHELF_CAP)
    const now = T0 + 6 * HOUR + MIN
    const got = harvest(s, full!.ready, now)
    expect(got).toHaveLength(SHELF_CAP)
    expect(full!.ready).toHaveLength(0)
    expect(['working', 'offline', 'break']).toContain(full!.phase)
    const snap = snapshotOf(s, now)
    expect(snap.stats.harvestedToday).toBe(SHELF_CAP)
    expect(snap.log[0].harvestedAt).toBe(now)
    // harvesting twice does nothing
    expect(harvest(s, got.map((o) => o.id), now + 1)).toHaveLength(0)
  })

  it('questions block work until answered; errors until retried', () => {
    const s = createState(T0, SEED)
    advance(s, T0 + 8 * HOUR)
    const asks = s.requests.filter((r) => !r.resolvedAt && r.kind === 'input')
    const errs = s.requests.filter((r) => !r.resolvedAt && r.kind === 'error')
    expect(asks.length + errs.length).toBeGreaterThan(0)
    const now = T0 + 8 * HOUR + MIN
    for (const r of asks) {
      const e = s.employees[r.employee]
      expect(e.phase).toBe('blocked')
      expect(answer(s, r.id, r.options[0], now)).toBe(true)
      expect(e.phase).toBe('working')
      expect(e.requestId).toBeUndefined()
    }
    for (const r of errs) {
      const e = s.employees[r.employee]
      expect(e.phase).toBe('error')
      expect(answer(s, r.id, r.options[0], now)).toBe(true)
      expect(e.phase).toBe('working')
    }
    expect(snapshotOf(s, now).requests).toHaveLength(0)
  })

  it('reassigning a job moves it to the new holder', () => {
    const s = createState(T0, SEED)
    const now = T0 + MIN
    assign(s, 'h03', 'ops', now)
    expect(s.employees.h03.role).toBe('ops')
    expect(s.employees.o18.role).toBeNull()
    expect(s.employees.o18.phase).toBe('idle')
    expect(s.employees.h03.phase).toBe('working')
    assign(s, 'h03', null, now + MIN)
    expect(s.employees.h03.phase).toBe('idle')
  })

  it('reports what happened while you were away', () => {
    const s = createState(T0, SEED)
    harvest(s, s.outputs.map((o) => o.id), T0)
    const before = s.simNow
    advance(s, T0 + 2 * HOUR)
    const h = homecoming(s, before, T0 + 2 * HOUR, false)
    expect(h).not.toBeNull()
    expect(h!.fresh.length).toBeGreaterThan(0)
    expect(homecoming(s, T0 + 2 * HOUR - MIN, T0 + 2 * HOUR, false)).toBeNull()
  })
})

describe('feed snapshots', () => {
  it('maps a feed document onto the same view as the demo', () => {
    const snap = snapshotFromFeed(
      {
        updatedAt: T0,
        employees: [
          { id: 'o18', role: 'ops', status: 'working', task: { title: '巡检', kind: 'ops', progress: 0.4 } },
          { id: 'o13', role: 'geo', status: 'needs-input', request: { id: 'q1', title: '用哪个标题？', url: 'https://example.com/q1' } },
          { id: 'jojo', role: '我自己的岗位', status: 'success' },
        ],
        outputs: [
          { id: 'a', employee: 'o13', kind: 'article', title: '一篇文章', createdAt: T0 - MIN },
          { id: 'b', employee: 'o18', kind: 'nope', title: '值班日志', createdAt: '2026-10-29T01:00:00Z' },
        ],
      },
      new Map([['b', T0]]),
      T0,
    )
    expect(snap.source).toBe('feed')
    expect(snap.employees.o18.phase).toBe('working')
    expect(snap.employees.o18.task?.progress).toBeCloseTo(0.4)
    expect(snap.employees.o13.status).toBe('needs-input')
    expect(snap.requests).toHaveLength(1)
    expect(snap.employees.jojo.role?.title).toBe('我自己的岗位')
    expect(snap.ready.map((o) => o.id)).toEqual(['a'])
    expect(snap.log.map((o) => o.id)).toEqual(['b'])
    expect(snap.log[0].kind).toBe('doc')
    expect(snap.employees.h03.phase).toBe('idle')
  })
})
