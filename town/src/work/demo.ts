// The demo work loop: every employee picks up tasks that fit their job, works
// on them for a few minutes, sometimes stops to ask you something or gets
// stuck, and puts what they finish on their shelf for you to harvest.
//
// Everything is driven by event times and seeded random numbers, so simulating
// three hours in one go (when you come back) gives exactly the same town as
// watching it second by second.
import { CHARACTER_LIST } from '../../../src/library'
import type { EmotionId, StatusId } from '../../../src/library'
import { ROLE_MAP } from './roles'
import { DEFAULT_ROSTER } from './roster'
import { between, pickWith, rngFor } from './rng'
import type { CharId, EmployeeState, EmployeeView, Output, Phase, Role, TownSnapshot, WorkRequest, WorkState } from './types'

export const MIN = 60_000
export const HOUR = 60 * MIN
/** finished outputs an employee can keep before they stop and wait for you */
export const SHELF_CAP = 3
const ASK_CHANCE = 0.12
const FAIL_CHANCE = 0.06
/** day-shift hours, local time */
export const DAY_START = 8
export const DAY_END = 23
/** a new town opens as if everyone started this long ago, so there is something to harvest */
export const HEAD_START = 20 * MIN

export function dayKey(t: number): string {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function onShift(role: Role, t: number): boolean {
  if (role.shift === 'always') return true
  const h = new Date(t).getHours()
  return h >= DAY_START && h < DAY_END
}

export function nextShiftStart(t: number): number {
  const d = new Date(t)
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), DAY_START, 0, 0, 0).getTime()
  return t < start ? start : start + 24 * HOUR
}

function fill(template: string, topic: string, n: number): string {
  return template.replace('{t}', topic).replace(/\{n\}/g, String(n))
}

export function createState(now: number, seed: number = Math.floor(Math.random() * 2 ** 31)): WorkState {
  const start = now - HEAD_START
  const employees: Record<CharId, EmployeeState> = {}
  for (const c of CHARACTER_LIST) {
    const role = DEFAULT_ROSTER[c.id] ?? null
    const stagger = rngFor(seed, c.id, 'stagger')() * 6 * MIN
    employees[c.id] = { id: c.id, role, phase: role ? 'break' : 'idle', until: start + stagger, ready: [], done: 0 }
  }
  const state: WorkState = {
    v: 1, seed, createdAt: now, simNow: start, lastSeen: start, employees,
    outputs: [], requests: [], harvested: 0, byDay: {},
  }
  advance(state, now)
  return state
}

/** Bring a stored state up to date with the cast (new characters, removed roles). */
export function migrate(state: WorkState): WorkState {
  for (const c of CHARACTER_LIST) {
    if (!state.employees[c.id]) {
      const role = DEFAULT_ROSTER[c.id] ?? null
      state.employees[c.id] = { id: c.id, role, phase: role ? 'break' : 'idle', until: state.simNow, ready: [], done: 0 }
    }
  }
  for (const e of Object.values(state.employees)) {
    if (e.role && !ROLE_MAP[e.role]) { e.role = null; e.phase = 'idle'; e.task = undefined }
  }
  return state
}

function startTask(state: WorkState, e: EmployeeState, t: number) {
  const role = ROLE_MAP[e.role!]
  const r = rngFor(state.seed, e.id, e.done, 'task')
  const tpl = pickWith(r, role.tasks)
  const topic = pickWith(r, role.topics)
  const title = fill(tpl.title, topic, 2 + Math.floor(r() * 9))
  const duration = between(r, tpl.minutes[0], tpl.minutes[1]) * MIN
  const summary = fill(pickWith(r, role.summaries), topic, 3 + Math.floor(r() * 12))
  const ask = r() < ASK_CHANCE
  const fail = !ask && r() < FAIL_CHANCE
  e.task = {
    id: `${e.id}.${state.seed.toString(36)}.${e.done}`,
    title, kind: tpl.kind, summary, duration, spent: 0, startedAt: t,
    askAt: ask ? duration * between(r, 0.3, 0.7) : undefined,
    fail,
  }
  e.done += 1
  e.phase = 'working'
}

function openRequest(state: WorkState, e: EmployeeState, kind: 'input' | 'error', t: number) {
  const role = ROLE_MAP[e.role!]
  const task = e.task!
  const r = rngFor(state.seed, e.id, e.done, kind)
  let req: WorkRequest
  if (kind === 'input') {
    const a = pickWith(r, role.asks)
    req = { id: `r.${task.id}.ask`, employee: e.id, kind, title: a.q, detail: `在做「${task.title}」，需要你拍个板。`, options: a.options, createdAt: t }
  } else {
    const msg = pickWith(r, role.errors)
    req = { id: `r.${task.id}.err`, employee: e.id, kind, title: msg, detail: `「${task.title}」没做完：${msg}。可以让 TA 再试一次。`, options: ['让 TA 重试'], createdAt: t }
  }
  state.requests.push(req)
  e.requestId = req.id
}

function completeTask(state: WorkState, e: EmployeeState, t: number) {
  const task = e.task!
  const out: Output = { id: `o.${task.id}`, employee: e.id, role: e.role!, kind: task.kind, title: task.title, summary: task.summary, createdAt: t }
  state.outputs.push(out)
  e.ready.push(out.id)
  e.task = undefined
  const r = rngFor(state.seed, e.id, e.done, 'break')
  e.phase = 'break'
  e.until = t + between(r, 1.5, 4) * MIN
}

function advanceEmployee(state: WorkState, e: EmployeeState, to: number) {
  const role = e.role ? ROLE_MAP[e.role] : null
  if (!role) { e.phase = 'idle'; return }
  for (let guard = 0; guard < 500; guard += 1) {
    switch (e.phase) {
      case 'idle':
        e.phase = 'break'
        e.until = Math.min(e.until || to, to)
        continue
      case 'offline': {
        const start = nextShiftStart(e.until)
        if (start > to) return
        e.phase = 'break'
        e.until = start
        continue
      }
      case 'break': {
        if (e.until > to) return
        const t = e.until
        if (!onShift(role, t)) { e.phase = 'offline'; e.until = t; continue }
        if (e.ready.length >= SHELF_CAP) { e.phase = 'full'; return }
        startTask(state, e, t)
        continue
      }
      case 'working': {
        const task = e.task!
        if (task.askAt !== undefined && !task.asked) {
          const at = task.startedAt + (task.askAt - task.spent)
          if (at <= to) {
            task.spent = task.askAt
            task.asked = true
            task.startedAt = at
            e.phase = 'blocked'
            openRequest(state, e, 'input', at)
            return
          }
        }
        const end = task.startedAt + (task.duration - task.spent)
        if (end > to) return
        if (task.fail && !task.failed) {
          task.failed = true
          task.spent = task.duration
          task.startedAt = end
          e.phase = 'error'
          openRequest(state, e, 'error', end)
          return
        }
        completeTask(state, e, end)
        continue
      }
      default:
        return
    }
  }
}

/** Simulate everything up to `to`. */
export function advance(state: WorkState, to: number) {
  if (to <= state.simNow) return
  for (const c of CHARACTER_LIST) {
    const e = state.employees[c.id]
    if (e) advanceEmployee(state, e, to)
  }
  state.simNow = to
  // employees are simulated one at a time; keep the records in time order
  state.outputs.sort(byTime)
  state.requests.sort(byTime)
}

function byTime(a: { createdAt: number; id: string }, b: { createdAt: number; id: string }) {
  return a.createdAt - b.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

function resume(state: WorkState, e: EmployeeState, now: number) {
  if (!e.role) { e.phase = 'idle'; return }
  e.phase = 'break'
  e.until = now
  advanceEmployee(state, e, now)
}

function prune(state: WorkState) {
  const harvested = state.outputs.filter((o) => o.harvestedAt)
  if (harvested.length > 300) {
    const drop = new Set(harvested.sort((a, b) => a.harvestedAt! - b.harvestedAt!).slice(0, harvested.length - 300).map((o) => o.id))
    state.outputs = state.outputs.filter((o) => !drop.has(o.id))
  }
  const closed = state.requests.filter((r) => r.resolvedAt)
  if (closed.length > 120) {
    const drop = new Set(closed.slice(0, closed.length - 120).map((r) => r.id))
    state.requests = state.requests.filter((r) => !drop.has(r.id))
  }
}

/** Collect finished outputs. Returns what was actually collected. */
export function harvest(state: WorkState, ids: readonly string[], now: number): Output[] {
  advance(state, now)
  const want = new Set(ids)
  const got: Output[] = []
  for (const o of state.outputs) {
    if (!want.has(o.id) || o.harvestedAt) continue
    o.harvestedAt = now
    got.push(o)
    state.harvested += 1
    const k = dayKey(now)
    state.byDay[k] = (state.byDay[k] ?? 0) + 1
    const e = state.employees[o.employee]
    if (e) e.ready = e.ready.filter((x) => x !== o.id)
  }
  for (const id of new Set(got.map((o) => o.employee))) {
    const e = state.employees[id]
    if (e && e.phase === 'full') resume(state, e, now)
  }
  prune(state)
  return got
}

/** Answer a question (or tell a stuck employee to retry). */
export function answer(state: WorkState, requestId: string, option: string, now: number): boolean {
  advance(state, now)
  const req = state.requests.find((r) => r.id === requestId && !r.resolvedAt)
  if (!req) return false
  req.resolvedAt = now
  req.answer = option
  const e = state.employees[req.employee]
  if (e && e.requestId === req.id) {
    e.requestId = undefined
    if (e.task && req.kind === 'input' && e.phase === 'blocked') {
      e.phase = 'working'
      e.task.startedAt = now
    } else if (e.task && req.kind === 'error' && e.phase === 'error') {
      e.phase = 'working'
      e.task.duration = Math.max(2 * MIN, e.task.duration * 0.6)
      e.task.spent = 0
      e.task.fail = false
      e.task.startedAt = now
    }
    advanceEmployee(state, e, now)
  }
  return true
}

function dropWork(state: WorkState, e: EmployeeState, now: number) {
  e.task = undefined
  if (e.requestId) {
    const r = state.requests.find((x) => x.id === e.requestId)
    if (r && !r.resolvedAt) { r.resolvedAt = now; r.answer = '已取消' }
    e.requestId = undefined
  }
}

/** Give an employee a job (or make them a reserve with `null`). A job has one holder. */
export function assign(state: WorkState, id: CharId, roleId: string | null, now: number) {
  advance(state, now)
  const e = state.employees[id]
  if (!e || e.role === roleId) return
  if (roleId) {
    for (const o of Object.values(state.employees)) {
      if (o.id !== id && o.role === roleId) { dropWork(state, o, now); o.role = null; o.phase = 'idle' }
    }
  }
  dropWork(state, e, now)
  e.role = roleId
  if (roleId) resume(state, e, now)
  else e.phase = 'idle'
}

const LOOK: Record<Phase, { status: StatusId; emotion: EmotionId }> = {
  working: { status: 'working', emotion: 'focus' },
  blocked: { status: 'needs-input', emotion: 'puzzled' },
  error: { status: 'error', emotion: 'aggrieved' },
  full: { status: 'success', emotion: 'smug' },
  break: { status: 'idle', emotion: 'happy' },
  offline: { status: 'offline', emotion: 'sleepy' },
  idle: { status: 'idle', emotion: 'calm' },
}

export function lookFor(phase: Phase, role: Role | null, hasReady: boolean): { status: StatusId; emotion: EmotionId } {
  if (phase === 'working' && role) return { status: 'working', emotion: role.working }
  if (phase === 'break' && hasReady) return { status: 'success', emotion: 'happy' }
  return LOOK[phase]
}

/** The town as everyone else sees it. */
export function snapshotOf(state: WorkState, now: number): TownSnapshot {
  const today = dayKey(now)
  const byId = new Map(state.outputs.map((o) => [o.id, o]))
  const employees: Record<CharId, EmployeeView> = {}
  const order: CharId[] = []
  let working = 0
  for (const c of CHARACTER_LIST) {
    const e = state.employees[c.id]
    if (!e) continue
    order.push(c.id)
    const role = e.role ? ROLE_MAP[e.role] ?? null : null
    const ready = e.ready.map((id) => byId.get(id)).filter((o): o is Output => !!o)
    const look = lookFor(e.phase, role, ready.length > 0)
    let task
    if (e.task) {
      const spent = e.task.spent + (e.phase === 'working' ? Math.max(0, now - e.task.startedAt) : 0)
      const progress = Math.max(0, Math.min(1, spent / e.task.duration))
      task = { title: e.task.title, kind: e.task.kind, progress, remainingMs: Math.max(0, e.task.duration - spent) }
    }
    if (e.phase === 'working') working += 1
    const request = e.requestId ? state.requests.find((r) => r.id === e.requestId && !r.resolvedAt) : undefined
    const harvestedToday = state.outputs.filter((o) => o.employee === e.id && o.harvestedAt && dayKey(o.harvestedAt) === today).length
    employees[c.id] = { id: c.id, role, phase: e.phase, status: look.status, emotion: look.emotion, task, ready, request, harvestedToday }
  }
  const ready = state.outputs.filter((o) => !o.harvestedAt).sort((a, b) => a.createdAt - b.createdAt)
  const requests = state.requests.filter((r) => !r.resolvedAt).sort((a, b) => a.createdAt - b.createdAt)
  const log = state.outputs.filter((o) => o.harvestedAt).sort((a, b) => b.harvestedAt! - a.harvestedAt!).slice(0, 80)
  return {
    source: 'demo',
    now,
    employees,
    order,
    ready,
    requests,
    log,
    stats: {
      ready: ready.length,
      harvestedToday: state.byDay[today] ?? 0,
      harvestedTotal: state.harvested,
      openInputs: requests.filter((r) => r.kind === 'input').length,
      openErrors: requests.filter((r) => r.kind === 'error').length,
      working,
    },
  }
}

export interface Homecoming {
  awayMs: number
  fresh: Output[]
  asks: WorkRequest[]
  firstVisit: boolean
}

/** What happened while the town was closed. Call once on open, after advancing. */
export function homecoming(state: WorkState, previousSeen: number, now: number, firstVisit: boolean): Homecoming | null {
  const fresh = state.outputs.filter((o) => !o.harvestedAt && o.createdAt > previousSeen)
  const asks = state.requests.filter((r) => !r.resolvedAt && r.createdAt > previousSeen)
  if (!firstVisit && (now - previousSeen < 5 * MIN || (!fresh.length && !asks.length))) return null
  return { awayMs: now - previousSeen, fresh, asks, firstVisit }
}
