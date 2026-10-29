// Real work, from your own agents: the town polls one JSON document and shows
// it exactly like the demo. The format is documented in docs/TOWN.md.
import { CHARACTER_LIST, isEmotionId, isStatusId } from '../../../src/library'
import type { EmotionId, StatusId } from '../../../src/library'
import { lookFor, dayKey } from './demo'
import { OUTPUT_KINDS, ROLE_MAP } from './roles'
import type { CharId, EmployeeView, Output, OutputKind, Phase, Role, TownSnapshot, WorkRequest } from './types'

export interface FeedConfig {
  url: string
  /** sent as `Authorization: Bearer <token>`; stored only in this browser */
  token?: string
}

export interface FeedEmployee {
  id: CharId
  /** a role id from roles.ts, or your own job title */
  role?: string
  status?: string
  emotion?: string
  task?: { title: string; kind?: string; progress?: number }
  request?: { id: string; kind?: 'input' | 'error'; title: string; detail?: string; url?: string; createdAt?: string | number }
}

export interface FeedOutput {
  id: string
  employee: CharId
  kind?: string
  title: string
  summary?: string
  url?: string
  createdAt?: string | number
}

export interface FeedDocument {
  updatedAt?: string | number
  employees?: FeedEmployee[]
  outputs?: FeedOutput[]
}

const isKind = (k: unknown): k is OutputKind => typeof k === 'string' && k in OUTPUT_KINDS
const time = (v: unknown, fallback: number) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') { const t = Date.parse(v); if (Number.isFinite(t)) return t }
  return fallback
}

export async function fetchFeed(cfg: FeedConfig, signal?: AbortSignal): Promise<FeedDocument> {
  const res = await fetch(cfg.url, {
    headers: cfg.token ? { Authorization: `Bearer ${cfg.token}` } : undefined,
    cache: 'no-store',
    signal,
  })
  if (!res.ok) throw new Error(`读取失败：HTTP ${res.status}`)
  const doc = (await res.json()) as unknown
  if (!doc || typeof doc !== 'object') throw new Error('返回的不是 JSON 对象')
  return doc as FeedDocument
}

const STATUS_PHASE: Record<StatusId, Phase> = {
  idle: 'break',
  working: 'working',
  'needs-input': 'blocked',
  success: 'full',
  error: 'error',
  offline: 'offline',
}

/**
 * Turn a feed document into a snapshot. `harvested` maps output ids you have
 * already collected (in this browser) to when you collected them.
 */
export function snapshotFromFeed(doc: FeedDocument, harvested: ReadonlyMap<string, number>, now: number): TownSnapshot {
  const today = dayKey(now)
  const outputs: Output[] = (doc.outputs ?? [])
    .filter((o) => o && typeof o.id === 'string' && typeof o.title === 'string' && typeof o.employee === 'string')
    .map((o) => ({
      id: o.id,
      employee: o.employee,
      role: '',
      kind: isKind(o.kind) ? o.kind : 'doc',
      title: o.title,
      summary: o.summary ?? '',
      url: typeof o.url === 'string' ? o.url : undefined,
      createdAt: time(o.createdAt, now),
      harvestedAt: harvested.get(o.id),
    }))
  const fromFeed = new Map((doc.employees ?? []).filter((e) => e && typeof e.id === 'string').map((e) => [e.id, e]))
  const employees: Record<CharId, EmployeeView> = {}
  const order: CharId[] = []
  const requests: WorkRequest[] = []
  let working = 0
  for (const c of CHARACTER_LIST) {
    order.push(c.id)
    const fe = fromFeed.get(c.id)
    const ready = outputs.filter((o) => o.employee === c.id && !o.harvestedAt)
    let role: Role | null = null
    if (fe?.role) {
      role = ROLE_MAP[fe.role] ?? { ...ROLE_MAP.dispatch, id: fe.role, title: fe.role, district: 'center', desc: '' }
    }
    const status: StatusId = fe && isStatusId(fe.status) ? fe.status : fe ? 'idle' : 'offline'
    const phase: Phase = fe ? STATUS_PHASE[status] : role ? 'offline' : 'idle'
    const look = lookFor(phase, role, ready.length > 0)
    const emotion: EmotionId = fe && isEmotionId(fe.emotion) ? fe.emotion : look.emotion
    let request: WorkRequest | undefined
    if (fe?.request && typeof fe.request.id === 'string') {
      request = {
        id: fe.request.id,
        employee: c.id,
        kind: fe.request.kind === 'error' ? 'error' : 'input',
        title: fe.request.title ?? '需要你看一下',
        detail: fe.request.detail ?? '',
        options: [],
        createdAt: time(fe.request.createdAt, now),
        url: fe.request.url,
      }
      requests.push(request)
    }
    const task = fe?.task && typeof fe.task.title === 'string'
      ? { title: fe.task.title, kind: isKind(fe.task.kind) ? fe.task.kind : ('doc' as OutputKind), progress: Math.max(0, Math.min(1, Number(fe.task.progress) || 0)), remainingMs: 0 }
      : undefined
    if (phase === 'working') working += 1
    for (const o of outputs) if (o.employee === c.id && role) o.role = role.id
    employees[c.id] = {
      id: c.id, role, phase, status, emotion, task, ready, request,
      harvestedToday: outputs.filter((o) => o.employee === c.id && o.harvestedAt && dayKey(o.harvestedAt) === today).length,
    }
  }
  const ready = outputs.filter((o) => !o.harvestedAt).sort((a, b) => a.createdAt - b.createdAt)
  const log = outputs.filter((o) => o.harvestedAt).sort((a, b) => b.harvestedAt! - a.harvestedAt!).slice(0, 80)
  return {
    source: 'feed',
    now,
    employees,
    order,
    ready,
    requests,
    log,
    stats: {
      ready: ready.length,
      harvestedToday: [...harvested.values()].filter((t) => dayKey(t) === today).length,
      harvestedTotal: harvested.size,
      openInputs: requests.filter((r) => r.kind === 'input').length,
      openErrors: requests.filter((r) => r.kind === 'error').length,
      working,
    },
    feedUpdatedAt: time(doc.updatedAt, now),
  }
}
