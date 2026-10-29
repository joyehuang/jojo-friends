import { CHARACTERS, EMOTIONS, STATUSES, type EmotionId, type StatusId } from '../../../src/library'
import { DISTRICTS } from '../work/roles'
import type { CharId, EmployeeView, Phase } from '../work/types'

export const nameOf = (id: CharId) => CHARACTERS[id]?.name.zh ?? id
export const personaOf = (id: CharId) => CHARACTERS[id]?.persona.zh ?? ''
export const emotionLabel = (e: EmotionId) => EMOTIONS[e]?.label ?? e
export const statusLabel = (s: StatusId) => STATUSES[s]?.label ?? s

export function duration(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60_000))
  if (m < 1) return '不到 1 分钟'
  if (m < 60) return `${m} 分钟`
  const h = Math.floor(m / 60), r = m % 60
  if (h < 24) return r ? `${h} 小时 ${r} 分钟` : `${h} 小时`
  const d = Math.floor(h / 24), hr = h % 24
  return hr ? `${d} 天 ${hr} 小时` : `${d} 天`
}

export function ago(t: number, now: number): string {
  const ms = now - t
  if (ms < 60_000) return '刚刚'
  return `${duration(ms)}前`
}

export function clock(t: number): string {
  const d = new Date(t)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function dayLabel(t: number, now: number): string {
  const a = new Date(t), b = new Date(now)
  const same = (x: Date, y: Date) => x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate()
  if (same(a, b)) return '今天'
  const y = new Date(b)
  y.setDate(b.getDate() - 1)
  if (same(a, y)) return '昨天'
  return `${a.getMonth() + 1} 月 ${a.getDate()} 日`
}

const PHASE_TEXT: Record<Phase, string> = {
  working: '工作中',
  blocked: '等你拍板',
  error: '卡住了',
  full: '货架满了，等你来收',
  break: '休息一下',
  offline: '下班回家了',
  idle: '候补，自由活动',
}

export function phaseText(v: EmployeeView): string {
  if (v.phase === 'break' && v.ready.length) return '做完一件，歇口气'
  return PHASE_TEXT[v.phase]
}

export function tone(v: EmployeeView): 'work' | 'ask' | 'error' | 'ready' | 'rest' | 'off' {
  if (v.phase === 'blocked') return 'ask'
  if (v.phase === 'error') return 'error'
  if (v.phase === 'full' || v.ready.length) return 'ready'
  if (v.phase === 'working') return 'work'
  if (v.phase === 'offline') return 'off'
  return 'rest'
}

export const districtName = (v: EmployeeView) => (v.role ? DISTRICTS[v.role.district]?.name ?? '' : '')
