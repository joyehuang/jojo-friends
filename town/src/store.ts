// One store for the whole town: the work (demo or your feed), what is
// selected, which panel is open, toasts, settings. React reads it with
// useTown(); the 3D scene reads `store.state` every frame and listens for
// harvest events to play the fly-up animation.
import { useSyncExternalStore } from 'react'
import { HOUR, advance, answer as answerDemo, assign as assignDemo, createState, harvest as harvestDemo, homecoming, migrate, snapshotOf, type Homecoming } from './work/demo'
import { fetchFeed, snapshotFromFeed, type FeedDocument } from './work/feed'
import { DEFAULT_SETTINGS, clearState, loadFeedHarvest, loadSettings, loadState, saveFeedHarvest, saveSettings, saveState, type Settings } from './work/persist'
import type { CharId, Output, TownSnapshot, WorkState } from './work/types'

export type Panel = null | 'roster' | 'inbox' | 'log' | 'settings' | 'about'

export interface Toast {
  id: number
  kind: 'harvest' | 'info' | 'warn'
  text: string
  outputs?: Output[]
  at: number
}

export interface TownState {
  snap: TownSnapshot
  selected: CharId | null
  panel: Panel
  toasts: Toast[]
  homecoming: Homecoming | null
  settings: Settings
  /** the camera is following the selected employee */
  following: boolean
  feedLoading: boolean
}

type Listener = () => void
type HarvestListener = (outputs: Output[]) => void

const FEED_INTERVAL = 30_000

export class TownStore {
  state: TownState
  private work: WorkState | null = null
  private feedDoc: FeedDocument | null = null
  private feedHarvest = loadFeedHarvest()
  private listeners = new Set<Listener>()
  private harvestListeners = new Set<HarvestListener>()
  private answerListeners = new Set<() => void>()
  private timers: number[] = []
  private toastId = 0
  private feedAbort: AbortController | null = null
  private feedTimer = 0

  constructor(now = Date.now()) {
    const settings = loadSettings()
    let home: Homecoming | null = null
    if (settings.source === 'demo' || !settings.feed.url) {
      const stored = loadState()
      if (stored) {
        this.work = migrate(stored)
        const seen = this.work.lastSeen
        advance(this.work, now)
        home = homecoming(this.work, seen, now, false)
      } else {
        this.work = createState(now)
        home = homecoming(this.work, this.work.lastSeen, now, true)
      }
      this.work.lastSeen = now
      saveState(this.work)
    }
    this.state = {
      snap: this.work ? snapshotOf(this.work, now) : { ...snapshotFromFeed({}, this.feedHarvest, now), pending: true },
      selected: null,
      panel: null,
      toasts: [],
      homecoming: home,
      settings: settings.source === 'feed' && !settings.feed.url ? { ...settings, source: 'demo' } : settings,
      following: false,
      feedLoading: false,
    }
  }

  /** Start the clocks. Returns a stop function. */
  start(): () => void {
    this.timers.push(window.setInterval(() => this.tick(), 1000))
    this.timers.push(window.setInterval(() => this.persist(), 15_000))
    if (this.state.settings.source === 'feed') this.pollFeed()
    const onHide = () => this.persist()
    // back to a tab that sat in the background for a while: say what happened meanwhile
    let hiddenAt = 0
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now()
        this.persist()
        return
      }
      const now = Date.now()
      if (hiddenAt && now - hiddenAt > 10 * 60_000 && this.work && this.state.settings.source === 'demo') {
        advance(this.work, now)
        const h = homecoming(this.work, hiddenAt, now, false)
        if (h) this.set({ homecoming: h })
      }
      hiddenAt = 0
      this.refresh(now)
    }
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      this.timers.forEach((t) => window.clearInterval(t))
      this.timers = []
      window.clearTimeout(this.feedTimer)
      this.feedAbort?.abort()
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onVisibility)
      this.persist()
    }
  }

  subscribe = (fn: Listener) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  onHarvest(fn: HarvestListener): () => void {
    this.harvestListeners.add(fn)
    return () => { this.harvestListeners.delete(fn) }
  }

  onAnswer(fn: () => void): () => void {
    this.answerListeners.add(fn)
    return () => { this.answerListeners.delete(fn) }
  }

  getState = () => this.state

  private set(patch: Partial<TownState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((l) => l())
  }

  private refresh(now = Date.now()) {
    if (this.state.settings.source === 'demo' && this.work) {
      advance(this.work, now)
      this.set({ snap: snapshotOf(this.work, now) })
    } else {
      this.set({ snap: { ...snapshotFromFeed(this.feedDoc ?? {}, this.feedHarvest, now), feedError: this.state.snap.feedError, pending: !this.feedDoc } })
    }
  }

  private tick() {
    this.refresh()
    const now = Date.now()
    const toasts = this.state.toasts.filter((t) => now - t.at < 6000)
    if (toasts.length !== this.state.toasts.length) this.set({ toasts })
  }

  private persist() {
    if (this.work) {
      this.work.lastSeen = Date.now()
      saveState(this.work)
    }
    saveFeedHarvest(this.feedHarvest)
  }

  private async pollFeed() {
    const cfg = this.state.settings.feed
    window.clearTimeout(this.feedTimer)
    if (!cfg.url || this.state.settings.source !== 'feed') return
    this.feedAbort?.abort()
    const ctl = new AbortController()
    this.feedAbort = ctl
    this.set({ feedLoading: true })
    try {
      const doc = await fetchFeed(cfg, ctl.signal)
      // switched away (or to another feed) while this one was loading
      if (ctl.signal.aborted || this.state.settings.source !== 'feed') return
      this.feedDoc = doc
      const now = Date.now()
      this.set({ snap: snapshotFromFeed(this.feedDoc, this.feedHarvest, now), feedLoading: false })
    } catch (err) {
      if (ctl.signal.aborted) return
      const msg = err instanceof Error ? err.message : String(err)
      this.set({ snap: { ...this.state.snap, feedError: msg }, feedLoading: false })
    }
    if (!ctl.signal.aborted && this.state.settings.source === 'feed') {
      this.feedTimer = window.setTimeout(() => this.pollFeed(), FEED_INTERVAL)
    }
  }

  toast(kind: Toast['kind'], text: string, outputs?: Output[]) {
    this.toastId += 1
    const t: Toast = { id: this.toastId, kind, text, outputs, at: Date.now() }
    this.set({ toasts: [...this.state.toasts.slice(-3), t] })
  }

  /* ---------------- actions ---------------- */

  harvest(ids: readonly string[]): Output[] {
    const now = Date.now()
    let got: Output[] = []
    if (this.state.settings.source === 'demo' && this.work) {
      got = harvestDemo(this.work, ids, now)
      saveState(this.work)
    } else {
      const want = new Set(ids)
      got = this.state.snap.ready.filter((o) => want.has(o.id))
      for (const o of got) this.feedHarvest.set(o.id, now)
      saveFeedHarvest(this.feedHarvest)
    }
    if (!got.length) return got
    // the scene takes the tiles off the shelves first, then the new snapshot lands
    this.harvestListeners.forEach((l) => l(got))
    this.refresh(now)
    this.toast('harvest', got.length === 1 ? `收获：${got[0].title}` : `一口气收获了 ${got.length} 件产出`, got)
    return got
  }

  harvestAll(): Output[] {
    return this.harvest(this.state.snap.ready.map((o) => o.id))
  }

  answer(requestId: string, option: string) {
    if (this.state.settings.source !== 'demo' || !this.work) return
    const req = this.state.snap.requests.find((r) => r.id === requestId)
    if (answerDemo(this.work, requestId, option, Date.now())) {
      saveState(this.work)
      this.answerListeners.forEach((l) => l())
      this.refresh()
      if (req) this.toast('info', req.kind === 'error' ? '好的，TA 重新开工了' : `已回复：${option}`)
    }
  }

  assign(id: CharId, roleId: string | null) {
    if (this.state.settings.source !== 'demo' || !this.work) return
    assignDemo(this.work, id, roleId, Date.now())
    saveState(this.work)
    this.refresh()
  }

  select(id: CharId | null, opts: { follow?: boolean } = {}) {
    this.set({ selected: id, following: id ? opts.follow ?? this.state.following : false })
  }

  setFollowing(following: boolean) {
    this.set({ following })
  }

  setPanel(panel: Panel) {
    this.set({ panel: this.state.panel === panel ? null : panel })
  }

  closePanel() {
    this.set({ panel: null })
  }

  dismissHomecoming() {
    this.set({ homecoming: null })
  }

  updateSettings(patch: Partial<Settings>) {
    const prev = this.state.settings
    const settings = { ...prev, ...patch, feed: { ...prev.feed, ...(patch.feed ?? {}) } }
    const feedChanged = settings.feed.url !== prev.feed.url || settings.feed.token !== prev.feed.token
    const sourceChanged = settings.source !== prev.source || (settings.source === 'feed' && feedChanged)
    saveSettings(settings)
    this.set({ settings })
    if (sourceChanged) {
      if (settings.source === 'demo' && !this.work) {
        const now = Date.now()
        this.work = loadState() ? migrate(loadState()!) : createState(now)
        advance(this.work, now)
      }
      if (settings.source === 'feed') {
        this.feedDoc = null
        this.pollFeed()
      } else {
        window.clearTimeout(this.feedTimer)
        this.feedAbort?.abort()
      }
      this.refresh()
    }
  }

  resetDemo() {
    clearState()
    const now = Date.now()
    this.work = createState(now)
    saveState(this.work)
    this.set({ settings: { ...this.state.settings, source: 'demo' }, homecoming: homecoming(this.work, this.work.lastSeen, now, true) })
    saveSettings({ ...this.state.settings, source: 'demo' })
    this.refresh(now)
  }

  /** for the about panel: how long the town has existed */
  get age(): number {
    return this.work ? Date.now() - this.work.createdAt : 0
  }

  static readonly DEFAULTS = DEFAULT_SETTINGS
  static readonly HOUR = HOUR
}

export function useTown(store: TownStore): TownState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState)
}
