import type { EmotionId, StatusId } from '../../../src/library'

/** A character's stable machine id (`jojo`, `o18`, …). */
export type CharId = string

/** What a piece of finished work is. Drives its 3D model, colour and icon. */
export type OutputKind =
  | 'article'
  | 'post'
  | 'deck'
  | 'report'
  | 'code'
  | 'review'
  | 'mail'
  | 'design'
  | 'data'
  | 'brief'
  | 'ops'
  | 'doc'

/** The four work districts round the plaza, and the plaza itself. */
export type DistrictId = 'center' | 'north' | 'east' | 'south' | 'west'

/** The prop that sits on an employee's desk, so you can tell the job at a glance. */
export type StationKind =
  | 'tower'
  | 'laptop'
  | 'binoculars'
  | 'megaphone'
  | 'stage'
  | 'easel'
  | 'antenna'
  | 'telescope'
  | 'books'
  | 'magnifier'
  | 'rocket'
  | 'workbench'
  | 'monitor'
  | 'checklist'
  | 'shield'
  | 'bug'
  | 'gears'
  | 'radar'
  | 'mailbag'
  | 'cabinet'
  | 'chart'
  | 'sun'

export interface TaskTemplate {
  /** may contain {t} (a topic) and {n} (a number) */
  title: string
  kind: OutputKind
  /** how long the task takes in the demo, in minutes */
  minutes: readonly [number, number]
}

export interface AskTemplate {
  q: string
  options: readonly string[]
}

export interface Role {
  id: string
  title: string
  district: DistrictId
  station: StationKind
  /** one line: what this job is for */
  desc: string
  /** `day` roles go home at night; `always` roles keep working */
  shift: 'always' | 'day'
  /** the face they pull while working */
  working: EmotionId
  tasks: readonly TaskTemplate[]
  topics: readonly string[]
  /** finished-work blurbs; may contain {n} */
  summaries: readonly string[]
  asks: readonly AskTemplate[]
  errors: readonly string[]
}

/** What an employee is doing, in the simulation's own words. */
export type Phase = 'working' | 'blocked' | 'error' | 'break' | 'full' | 'offline' | 'idle'

export interface Output {
  id: string
  employee: CharId
  role: string
  kind: OutputKind
  title: string
  summary: string
  createdAt: number
  harvestedAt?: number
  /** where the real thing lives (feed mode) */
  url?: string
}

export interface WorkRequest {
  id: string
  employee: CharId
  /** `input`: they need you to decide something; `error`: they got stuck */
  kind: 'input' | 'error'
  title: string
  detail: string
  options: readonly string[]
  createdAt: number
  resolvedAt?: number
  answer?: string
  url?: string
}

export interface ActiveTask {
  id: string
  title: string
  kind: OutputKind
  summary: string
  /** total work needed, ms */
  duration: number
  /** work already done before the current run, ms */
  spent: number
  /** when the current run started */
  startedAt: number
  /** will stop half way to ask you something (ms of work at which it asks) */
  askAt?: number
  asked?: boolean
  /** will fail at the end once */
  fail?: boolean
  failed?: boolean
}

export interface EmployeeState {
  id: CharId
  role: string | null
  phase: Phase
  task?: ActiveTask
  /** end of the current break / start of the next shift */
  until: number
  /** finished outputs waiting on this employee's shelf (ids), oldest first */
  ready: string[]
  /** tasks started so far; feeds the deterministic random numbers */
  done: number
  requestId?: string
}

export interface WorkState {
  v: 1
  seed: number
  createdAt: number
  /** everything up to this instant has been simulated */
  simNow: number
  /** when the town was last open in a browser */
  lastSeen: number
  employees: Record<CharId, EmployeeState>
  outputs: Output[]
  requests: WorkRequest[]
  harvested: number
  /** harvested outputs per local day, `YYYY-MM-DD` */
  byDay: Record<string, number>
}

export interface TaskView {
  title: string
  kind: OutputKind
  /** 0..1 */
  progress: number
  remainingMs: number
}

/** One employee as the scene and the HUD see them, whatever the data source. */
export interface EmployeeView {
  id: CharId
  role: Role | null
  phase: Phase
  status: StatusId
  emotion: EmotionId
  task?: TaskView
  ready: Output[]
  request?: WorkRequest
  harvestedToday: number
}

export interface TownStats {
  ready: number
  harvestedToday: number
  harvestedTotal: number
  openInputs: number
  openErrors: number
  working: number
}

export interface TownSnapshot {
  source: 'demo' | 'feed'
  now: number
  employees: Record<CharId, EmployeeView>
  /** catalogue order */
  order: CharId[]
  ready: Output[]
  requests: WorkRequest[]
  /** recently harvested, newest first */
  log: Output[]
  stats: TownStats
  feedError?: string
  feedUpdatedAt?: number
}
