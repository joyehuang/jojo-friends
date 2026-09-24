import { motionAmp, targetPose, type ResolvedConfig } from './config'
import { EMOTIONS } from './emotions'
import { FX_STATIC, framePose, type Frame, type Fx } from './frame'
import { track } from './motion'
import { addDelta, clamp, POSE_KEYS, type Pose } from './pose'
import { STATUSES } from './status'

/* ------------------------------------------------------------------ */
/* One shared rAF for every instance on the page.                       */
/* ------------------------------------------------------------------ */

type Sub = (now: number) => void
const subs = new Set<Sub>()
let raf = 0
let visBound = false
const stats = { frames: 0, busyMs: 0 }

const hidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden'

function loop(now: number) {
  raf = 0
  const t0 = performance.now()
  for (const s of Array.from(subs)) s(now)
  stats.frames++
  stats.busyMs += performance.now() - t0
  if (subs.size && !hidden()) raf = requestAnimationFrame(loop)
}

function onVisibility() {
  if (hidden()) {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  } else if (subs.size && !raf) raf = requestAnimationFrame(loop)
}

export const ticker = {
  add(fn: Sub) {
    subs.add(fn)
    if (!visBound && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility)
      visBound = true
    }
    if (!raf && !hidden()) raf = requestAnimationFrame(loop)
  },
  remove(fn: Sub) {
    subs.delete(fn)
    if (!subs.size) {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      if (visBound) {
        document.removeEventListener('visibilitychange', onVisibility)
        visBound = false
      }
    }
  },
  /** introspection for tests and the demo's perf readout */
  get subscribers() {
    return subs.size
  },
  get running() {
    return raf !== 0
  },
  stats: () => ({ ...stats, subscribers: subs.size }),
  resetStats() {
    stats.frames = 0
    stats.busyMs = 0
  },
}

/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const POKE = track([
  [0.06, { sy: -0.05, sx: 0.04, ty: 3, lOpen: -0.55, rOpen: -0.55 }],
  [0.2, { sy: 0.03, sx: -0.02, ty: -9, dotY: -16, dotS: 0.1 }],
  [0.42, {}],
])

const STIFFNESS = 210
const DAMPING = 22

/** Resolve the look direction for static renders (no pointer, no drift). */
export function staticLook(p: Pose, cfg: ResolvedConfig) {
  const follow = EMOTIONS[cfg.emotion].gazeFollow
  const g = cfg.gaze === 'center' ? { x: 0, y: 0 } : typeof cfg.gaze === 'object' ? cfg.gaze : null
  if (g) {
    p.lookX += (g.x - p.lookX) * follow
    p.lookY += (g.y - p.lookY) * follow
  }
  p.lookX = clamp(p.lookX, -1, 1)
  p.lookY = clamp(p.lookY, -1, 1)
  return p
}

export function staticFx(cfg: ResolvedConfig): Fx {
  return { ...FX_STATIC, ...STATUSES[cfg.status].still }
}

/** The exact frame a static render shows. Shared by SSR markup and the engine. */
export function staticFrame(cfg: ResolvedConfig): Frame {
  const p = staticLook(targetPose(cfg.emotion, cfg.intensity), cfg)
  return framePose(p, staticFx(cfg), cfg.frame)
}

/**
 * Drives one rendered avatar. Owns every animated attribute (tagged with
 * `data-part`) and writes them directly; React only renders the initial
 * markup. All timing derives from one clock inside `tick`, so rapid prop
 * changes restart accents instead of stacking timers.
 */
export class JojoEngine {
  private parts = new Map<string, Element>()
  private written = new Map<string, string>()
  private cfg: ResolvedConfig
  private target: Pose
  private cur: Pose
  private vel: Pose
  private time = 0
  private last: number | null = null
  private emotionAt = -99
  private statusAt = -99
  private pokeAt = -99
  private visible = true
  private subscribed = false
  private destroyed = false
  private rng: () => number
  private blinkAt = 1.5
  private blinkStart = -1
  private driftAt = 1
  private drift = { x: 0, y: 0, tx: 0, ty: 0 }
  private gazeW = 0
  private gazeP = { x: 0, y: 0 }
  private pointer: { x: number; y: number; at: number; dirty: boolean } | null = null
  private pointerBound = false
  private pointerDir = { x: 0, y: 0 }
  private rectAt = -1

  constructor(private svg: SVGSVGElement, cfg: ResolvedConfig, seed = 1) {
    this.scan()
    this.cfg = cfg
    this.rng = mulberry32(seed)
    this.target = targetPose(cfg.emotion, cfg.intensity)
    this.cur = { ...this.target }
    this.vel = Object.fromEntries(POSE_KEYS.map((k) => [k, 0])) as Pose
    this.blinkAt = 0.8 + this.rng() * 3
    this.bindPointer()
    this.refresh()
  }

  update(cfg: ResolvedConfig) {
    if (this.destroyed) return
    const prev = this.cfg
    this.cfg = cfg
    if (prev.emotion !== cfg.emotion || prev.intensity !== cfg.intensity) {
      this.target = targetPose(cfg.emotion, cfg.intensity)
    }
    if (prev.emotion !== cfg.emotion) {
      this.emotionAt = this.time
      // people blink as their expression changes
      if (EMOTIONS[cfg.emotion].blink && this.blinkStart < 0) this.blinkAt = this.time + 0.05
    }
    if (prev.status !== cfg.status) {
      this.statusAt = this.time
      // status shapes are mounted per status: pick up the new elements and
      // forget what was written to the old ones
      this.scan()
    }
    if (prev.character !== cfg.character) {
      // another family member: React has swapped the outlines and may have
      // remounted parts. Re-scan and paint the current pose on the new rig
      // right away (the spring state carries over, so the expression holds).
      this.scan()
      if (cfg.motion !== 'static' && this.visible) {
        const full = cfg.motion === 'full'
        this.write(framePose(this.compose(0, full), this.effects(full), cfg.frame))
      }
    }
    const a = prev.frame, b = cfg.frame
    if (a.small !== b.small || a.brows !== b.brows || a.shadow !== b.shadow || a.minStroke !== b.minStroke) {
      this.written.clear()
    }
    this.bindPointer()
    this.refresh()
  }

  private scan() {
    this.parts.clear()
    this.written.clear()
    this.svg.querySelectorAll('[data-part]').forEach((el) => this.parts.set(el.getAttribute('data-part')!, el))
  }

  /**
   * Plays the current status' entry once more (e.g. a second "done"). A plain
   * re-render with the same status never replays it. Ignored when static.
   */
  replayStatus() {
    if (this.destroyed || this.cfg.motion === 'static') return
    this.statusAt = this.time
    this.refresh()
  }

  /** A tap reaction. Restarts (never stacks) if called again mid-way. */
  poke() {
    if (this.destroyed || this.cfg.motion === 'static') return
    this.pokeAt = this.time
    this.refresh()
  }

  setVisible(v: boolean) {
    if (this.visible === v) return
    this.visible = v
    this.refresh()
  }

  destroy() {
    this.destroyed = true
    this.unsubscribe()
    this.unbindPointer()
    this.parts.clear()
    this.written.clear()
  }

  get isTicking() {
    return this.subscribed
  }

  /* ---------------- scheduling ---------------- */

  private refresh() {
    if (this.destroyed) return
    if (this.cfg.motion === 'static') {
      this.unsubscribe()
      this.cur = { ...this.target }
      for (const k of POSE_KEYS) this.vel[k] = 0
      this.write(staticFrame(this.cfg))
      return
    }
    if (!this.visible) {
      this.unsubscribe()
      return
    }
    if (this.cfg.motion === 'full' || !this.settled()) this.subscribe()
    else {
      this.unsubscribe()
      this.write(staticFrame(this.cfg))
    }
  }

  private subscribe() {
    if (this.subscribed) return
    this.subscribed = true
    this.last = null
    ticker.add(this.tick)
  }

  private unsubscribe() {
    if (!this.subscribed) return
    this.subscribed = false
    ticker.remove(this.tick)
  }

  private settled() {
    const def = EMOTIONS[this.cfg.emotion]
    const tE = this.time - this.emotionAt
    if (def.enter && tE < def.enter.duration) return false
    if (def.fx?.confettiPeriod && tE < 0.22 + 1.6 * FX_STATIC.burst) return false
    if (this.time - this.statusAt < 1) return false
    if (this.time - this.pokeAt < POKE.duration) return false
    for (const k of POSE_KEYS) {
      if (Math.abs(this.cur[k] - this.target[k]) > 0.02 || Math.abs(this.vel[k]) > 0.05) return false
    }
    return true
  }

  /* ---------------- pointer gaze ---------------- */

  private onPointer = (e: PointerEvent) => {
    this.pointer = { x: e.clientX, y: e.clientY, at: this.time, dirty: true }
  }

  private bindPointer() {
    const want = this.cfg.gaze === 'pointer' && this.cfg.motion === 'full' && typeof window !== 'undefined'
    if (want && !this.pointerBound) {
      window.addEventListener('pointermove', this.onPointer, { passive: true })
      window.addEventListener('pointerdown', this.onPointer, { passive: true })
      this.pointerBound = true
    } else if (!want) this.unbindPointer()
  }

  private unbindPointer() {
    if (!this.pointerBound) return
    window.removeEventListener('pointermove', this.onPointer)
    window.removeEventListener('pointerdown', this.onPointer)
    this.pointerBound = false
    this.pointer = null
  }

  /* ---------------- frame ---------------- */

  private tick = (now: number) => {
    if (this.destroyed) return
    const dt = this.last === null ? 1 / 60 : clamp((now - this.last) / 1000, 0, 0.05)
    this.last = now
    this.time += dt
    this.step(dt)
    const full = this.cfg.motion === 'full'
    this.write(framePose(this.compose(dt, full), this.effects(full), this.cfg.frame))
    if (!full && this.settled()) {
      this.unsubscribe()
      this.write(staticFrame(this.cfg))
    }
  }

  private step(dt: number) {
    const n = Math.max(1, Math.ceil(dt / (1 / 120)))
    const h = dt / n
    for (let i = 0; i < n; i++) {
      for (const k of POSE_KEYS) {
        const v = this.vel[k] + ((this.target[k] - this.cur[k]) * STIFFNESS - this.vel[k] * DAMPING) * h
        this.vel[k] = v
        this.cur[k] += v * h
      }
    }
  }

  private compose(dt: number, full: boolean): Pose {
    const cfg = this.cfg
    const def = EMOTIONS[cfg.emotion]
    const amp = motionAmp(cfg.intensity)
    const tE = this.time - this.emotionAt
    const p: Pose = { ...this.cur }

    addDelta(p, def.enter?.sample(tE), amp)
    addDelta(p, POKE.sample(this.time - this.pokeAt))

    if (full) {
      if (def.loop) addDelta(p, def.loop(Math.max(0, tE)), amp)
      const b = Math.sin((this.time * Math.PI * 2) / def.breath.period)
      const bd = Math.sin((this.time * Math.PI * 2) / def.breath.period - 0.7)
      p.ty += -1.5 * def.breath.amp * b
      p.sy += 0.005 * def.breath.amp * b
      p.dotY += -1.4 * def.breath.amp * bd
      this.blink(p, def.blink)
    } else {
      this.blinkStart = -1
    }

    this.gaze(p, dt, full, def.gazeFollow, def.drift)
    return p
  }

  private blink(p: Pose, cfg: (typeof EMOTIONS)[keyof typeof EMOTIONS]['blink']) {
    if (!cfg) {
      this.blinkStart = -1
      if (this.blinkAt < this.time + 0.5) this.blinkAt = this.time + 0.5
      return
    }
    const dur = cfg.slow ? 0.44 : 0.2
    if (this.blinkStart < 0 && this.time >= this.blinkAt) this.blinkStart = this.time
    if (this.blinkStart < 0) return
    const u = (this.time - this.blinkStart) / dur
    if (u >= 1) {
      this.blinkStart = -1
      // natural rhythm: irregular gaps, sometimes a quick double blink
      this.blinkAt = this.rng() < 0.18 ? this.time + 0.1 : this.time + cfg.min + this.rng() * (cfg.max - cfg.min)
      return
    }
    const c = u < 0.35 ? u / 0.35 : u < 0.47 ? 1 : 1 - (u - 0.47) / 0.53
    const s = c * c * (3 - 2 * c)
    p.lOpen *= 1 - 0.93 * s
    p.rOpen *= 1 - 0.93 * s
  }

  private gaze(p: Pose, dt: number, full: boolean, follow: number, driftAmt: number) {
    const cfg = this.cfg
    let g: { x: number; y: number } | null = null
    if (cfg.gaze === 'center') g = { x: 0, y: 0 }
    else if (typeof cfg.gaze === 'object') g = cfg.gaze
    else if (cfg.gaze === 'pointer' && full && this.pointer && this.time - this.pointer.at < 4) {
      if (this.pointer.dirty || this.time - this.rectAt > 0.25) {
        const r = this.svg.getBoundingClientRect()
        const span = Math.max(r.width, 120) * 1.6
        this.pointerDir.x = clamp((this.pointer.x - (r.left + r.width / 2)) / span, -1, 1)
        this.pointerDir.y = clamp((this.pointer.y - (r.top + r.height * 0.55)) / span, -1, 1)
        this.pointer.dirty = false
        this.rectAt = this.time
      }
      g = this.pointerDir
    }
    // smooth engage/disengage and limit how fast the eyes can chase
    const kW = 1 - Math.exp(-dt * 8)
    const kP = 1 - Math.exp(-dt * 12)
    this.gazeW += ((g ? 1 : 0) - this.gazeW) * kW
    if (g) {
      this.gazeP.x += (g.x - this.gazeP.x) * kP
      this.gazeP.y += (g.y - this.gazeP.y) * kP
    }
    const w = this.gazeW * follow
    p.lookX += (this.gazeP.x - p.lookX) * w
    p.lookY += (this.gazeP.y - p.lookY) * w

    if (full && cfg.gaze === 'auto' && driftAmt > 0) {
      if (this.time >= this.driftAt) {
        const home = this.rng() < 0.35
        this.drift.tx = home ? 0 : (this.rng() * 2 - 1) * 0.3 * driftAmt
        this.drift.ty = home ? 0 : (this.rng() * 2 - 1) * 0.16 * driftAmt
        this.driftAt = this.time + 1.2 + this.rng() * 2.8
      }
    } else {
      this.drift.tx = 0
      this.drift.ty = 0
    }
    const kD = 1 - Math.exp(-dt * 16)
    this.drift.x += (this.drift.tx - this.drift.x) * kD
    this.drift.y += (this.drift.ty - this.drift.y) * kD
    p.lookX = clamp(p.lookX + this.drift.x, -1, 1)
    p.lookY = clamp(p.lookY + this.drift.y, -1, 1)
  }

  private effects(full: boolean): Fx {
    const cfg = this.cfg
    const def = EMOTIONS[cfg.emotion]
    const fx: Fx = { ...FX_STATIC }
    const tE = this.time - this.emotionAt
    if (full) {
      const dp = def.fx?.dropPeriod ?? 2.3
      fx.dropL = (this.time / dp) % 1
      fx.dropR = (this.time / dp + 0.5) % 1
      fx.flow = this.time * (def.fx?.flow ?? 60)
      fx.z = (this.time / (def.fx?.zPeriod ?? 3.4)) % 1
      const cp = def.fx?.confettiPeriod ?? 3.4
      fx.burst = tE < 0.22 ? 0 : clamp((((tE - 0.22) % cp) / 1.6), 0, 1)
    } else if (def.fx?.confettiPeriod) {
      // transitions mode: one burst on entry, then the static frozen spray
      // and stop at the frozen spray the static frame shows
      fx.burst = clamp((tE - 0.22) / 1.6, 0, FX_STATIC.burst)
    }
    const st = STATUSES[cfg.status]
    Object.assign(fx, st.still, st.live?.(this.time - this.statusAt, full))
    return fx
  }

  private write(frame: Frame) {
    for (const part in frame) {
      const el = this.parts.get(part)
      if (!el) continue
      const attrs = frame[part]
      for (const a in attrs) {
        const v = attrs[a]
        const key = part + '|' + a
        if (this.written.get(key) !== v) {
          el.setAttribute(a, v)
          this.written.set(key, v)
        }
      }
    }
  }
}
