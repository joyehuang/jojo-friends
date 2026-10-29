import type { FeedConfig } from './feed'
import type { WorkState } from './types'

const STATE_KEY = 'signal-town:work:v1'
const SETTINGS_KEY = 'signal-town:settings:v1'
const FEED_HARVEST_KEY = 'signal-town:feed-harvest:v1'

export type Quality = 'auto' | 'high' | 'medium' | 'low'

export interface Settings {
  source: 'demo' | 'feed'
  feed: FeedConfig
  quality: Quality
  /** light follows your local clock; otherwise it is always a golden afternoon */
  realTimeSky: boolean
  sound: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  source: 'demo',
  feed: { url: '' },
  quality: 'auto',
  realTimeSky: true,
  sound: false,
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode or full storage: the town still runs, it just forgets */
  }
}

export function loadState(): WorkState | null {
  const s = read<WorkState>(STATE_KEY)
  return s && s.v === 1 && s.employees ? s : null
}

export function saveState(s: WorkState) {
  write(STATE_KEY, s)
}

export function clearState() {
  try {
    localStorage.removeItem(STATE_KEY)
  } catch {
    /* ignore */
  }
}

export function loadSettings(): Settings {
  const s = read<Partial<Settings>>(SETTINGS_KEY)
  return { ...DEFAULT_SETTINGS, ...(s ?? {}), feed: { ...DEFAULT_SETTINGS.feed, ...(s?.feed ?? {}) } }
}

export function saveSettings(s: Settings) {
  write(SETTINGS_KEY, s)
}

export function loadFeedHarvest(): Map<string, number> {
  const list = read<Array<[string, number]>>(FEED_HARVEST_KEY)
  return new Map(Array.isArray(list) ? list : [])
}

export function saveFeedHarvest(m: Map<string, number>) {
  write(FEED_HARVEST_KEY, [...m.entries()].slice(-2000))
}
