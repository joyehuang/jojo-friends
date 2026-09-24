import type { Fx } from './frame'
import { bump, TAU } from './motion'
import { clamp } from './pose'
import { GAUGE } from './signals'

const smooth = (x: number) => x * x * (3 - 2 * x)
const backOut = (x: number) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2)
const GAUGE_STILL = GAUGE.still
/** seconds per lap of the working gauge */
export const WORK_PERIOD = 1.7
/** needs-input and success play once for this long, then hold */
export const ASK_DURATION = 0.9
export const DONE_DURATION = 1

/**
 * Business status is a *signal* channel: it drives the coral signal dot and
 * the small status shapes around it (gauge / question bubble / check, see
 * signals.ts), and dims the whole avatar when offline. It never changes the
 * face — the face is the emotion channel, chosen explicitly by the caller.
 */
export const STATUS_IDS = ['idle', 'working', 'needs-input', 'success', 'error', 'offline'] as const
export type StatusId = (typeof STATUS_IDS)[number]

export interface StatusDef {
  id: StatusId
  label: string
  en: string
  /** what the signal dot does, for docs/demo */
  signal: string
  /** fx while static (reduced motion / motion="static") */
  still: Partial<Fx>
  /**
   * fx while animating. `t` is seconds since the status changed; one-shot
   * accents run only for the first second, loops repeat.
   */
  live?: (t: number, looping: boolean) => Partial<Fx>
}

export const STATUSES: Record<StatusId, StatusDef> = {
  idle: {
    id: 'idle', label: '空闲', en: 'Idle',
    signal: '信号点安静待在缺口里。',
    still: {},
  },
  working: {
    id: 'working', label: '工作中', en: 'Working',
    signal: '缺口里亮起一段进度弧，从左经下方向右持续推进（只在完整动效下循环）；静止时显示一段固定的进度弧。',
    still: { gauge: 1, gaugeTail: 0, gaugeHead: GAUGE_STILL },
    live: (t, looping) => {
      // first fill up to the static reading, so every mode starts the same way
      const fill = GAUGE_STILL * smooth(clamp(t / 0.6, 0, 1))
      if (!looping || t < 0.6) return { gauge: 1, gaugeTail: 0, gaugeHead: fill }
      // then the lit segment (length = the static reading) keeps travelling
      // left → under → right at a steady speed and re-enters on the left.
      // Window [s, s + L] runs s: -L → 1; it starts at s = 0 so it continues
      // seamlessly from the fill above.
      const L = GAUGE_STILL
      const s = ((t - 0.6) / WORK_PERIOD) * (1 + L) % (1 + L)
      const s0 = s > 1 ? s - (1 + L) : s
      return { gauge: 1, gaugeTail: clamp(s0, 0, 1), gaugeHead: clamp(s0 + L, 0, 1) }
    },
  },
  'needs-input': {
    id: 'needs-input', label: '等你回复', en: 'Needs input',
    signal: '信号点旁冒出带“?”的询问气泡：出现时轻轻一弹一次，之后安静停住等你，不循环、不闪烁。',
    still: { bubble: 1, bubbleS: 1, ask: 0 },
    live: (t) => {
      if (t >= ASK_DURATION) return { bubble: 1, bubbleS: 1, ask: 0 }
      // pop out of the dot with a small overshoot, then the "?" nods once
      const pop = t < 0.42 ? backOut(t / 0.42) : 1
      const nod = t > 0.42 ? -9 * Math.sin(((t - 0.42) / 0.48) * TAU) * (1 - (t - 0.42) / 0.48) : 0
      return {
        bubble: Math.min(1, t / 0.12),
        bubbleS: 0.35 + 0.65 * pop,
        ask: nod,
        sigY: -9 * bump(t, 0, 0.36),
      }
    },
  },
  success: {
    id: 'success', label: '已完成', en: 'Done',
    signal: '信号点变成带勾的完成徽章：切换时弹一下、画出勾并放一圈光一次，然后勾号一直保留。',
    still: { check: 1, checkDraw: 1 },
    live: (t) => {
      if (t >= DONE_DURATION) return { check: 1, checkDraw: 1 }
      const p = Math.min(1, t / 0.9)
      return {
        check: 1,
        checkDraw: smooth(clamp((t - 0.14) / 0.36, 0, 1)),
        sigS: 1 + 0.3 * bump(t, 0, 0.42),
        sigGlow: 0.4 * bump(t, 0.05, 0.7),
        ring: t < 0.9 ? 0.7 * (1 - p) : 0,
        ringGrow: 52 * Math.sqrt(p),
        spark: clamp((t - 0.1) / 0.75, 0, 1),
      }
    },
  },
  error: {
    id: 'error', label: '出错了', en: 'Error',
    signal: '信号点左右晃两下后显示“!”标记；脸不会因此自动变哭。',
    still: { mark: 1 },
    live: (t) => {
      const shake = t < 0.5 ? Math.sin(t * TAU * 4) * (1 - t / 0.5) : 0
      return { mark: Math.min(1, t / 0.2), sigX: 7 * shake }
    },
  },
  offline: {
    id: 'offline', label: '离线', en: 'Offline',
    signal: '信号点变灰、整体降低饱和度，所有信号动作停止。',
    still: {},
    live: () => ({}),
  },
}

export const STATUS_LIST = STATUS_IDS.map((id) => STATUSES[id])

export function isStatusId(v: unknown): v is StatusId {
  return typeof v === 'string' && (STATUS_IDS as readonly string[]).includes(v)
}
