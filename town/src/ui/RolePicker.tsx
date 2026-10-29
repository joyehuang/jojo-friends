import { DISTRICTS, DISTRICT_ORDER, ROLES } from '../work/roles'
import type { TownState, TownStore } from '../store'
import { Glyph } from './Glyph'
import { nameOf } from './format'

/** A select that moves an employee to another job (the job's current holder becomes a reserve). */
export function RolePicker({ id, store, state, compact = false }: { id: string; store: TownStore; state: TownState; compact?: boolean }) {
  const snap = state.snap
  const current = snap.employees[id]?.role?.id ?? ''
  const holderOf = new Map<string, string>()
  for (const cid of snap.order) {
    const r = snap.employees[cid].role
    if (r) holderOf.set(r.id, cid)
  }
  return (
    <label className={`role-picker${compact ? ' compact' : ''}`}>
      {!compact && <Glyph name='swap' size={18} />}
      <span className='sr'>给{nameOf(id)}换岗位</span>
      <select
        value={current}
        onChange={(e) => {
          const next = e.target.value || null
          const taken = next ? holderOf.get(next) : undefined
          if (taken && taken !== id && !window.confirm(`「${ROLES.find((r) => r.id === next)?.title}」现在是${nameOf(taken)}在做。换成${nameOf(id)}之后，${nameOf(taken)}会变成候补，手上的活也会放下。确定吗？`)) return
          store.assign(id, next)
        }}
      >
        <option value=''>候补（不派活）</option>
        {DISTRICT_ORDER.map((d) => (
          <optgroup key={d} label={DISTRICTS[d].name}>
            {ROLES.filter((r) => r.district === d).map((r) => {
              const h = holderOf.get(r.id)
              return <option key={r.id} value={r.id}>{r.title}{h === id ? '' : h ? ` · ${nameOf(h)}` : ' · 空缺'}</option>
            })}
          </optgroup>
        ))}
      </select>
    </label>
  )
}
