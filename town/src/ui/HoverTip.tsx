import { useEffect, useState } from 'react'
import type { Pick } from '../scene/town3d'
import type { TownState } from '../store'
import { OUTPUT_KINDS, ROLE_MAP } from '../work/roles'
import { nameOf, phaseText } from './format'

/** A small label by the pointer saying what you are about to click. */
export function HoverTip({ hover, state }: { hover: Pick | null; state: TownState }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  useEffect(() => {
    let raf = 0
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setPos({ x: e.clientX, y: e.clientY }))
    }
    window.addEventListener('pointermove', move)
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(raf) }
  }, [])
  if (!hover || !pos) return null
  const snap = state.snap
  let title = ''
  let lines: string[] = []
  if (hover.kind === 'employee') {
    const v = snap.employees[hover.id]
    if (!v) return null
    title = `${nameOf(v.id)}${v.role ? ` · ${v.role.title}` : ''}`
    lines = [phaseText(v)]
    if (v.task && v.phase === 'working') lines.push(`正在做：${v.task.title}`)
    if (v.request) lines.push(`${v.request.kind === 'error' ? '卡住了' : '问你'}：${v.request.title}`)
    lines.push('点一下看详情 · 双击跟随')
  } else if (hover.kind === 'output') {
    const o = snap.ready.find((x) => x.id === hover.id)
    if (!o) return null
    title = `${OUTPUT_KINDS[o.kind].label}：${o.title}`
    lines = [`${nameOf(o.employee)}做的${o.summary ? ` · ${o.summary}` : ''}`, '点一下收下']
  } else {
    const role = ROLE_MAP[hover.role]
    title = `${role?.title ?? hover.role}的工位`
    lines = [hover.holder ? `${nameOf(hover.holder)}在这里上班` : '空缺：点一下去名册派人']
  }
  const left = Math.min(pos.x + 16, window.innerWidth - 300)
  return (
    <div className='hover-tip' style={{ left, top: pos.y + 18 }} role='tooltip'>
      <b>{title}</b>
      {lines.map((l) => <span key={l}>{l}</span>)}
    </div>
  )
}
