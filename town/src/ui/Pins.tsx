// HTML pins that ride over the 3D scene. Over every desk with something for
// you: a "?" (they need you to decide), a "!" (they are stuck) and a coral
// harvest badge with what is on the shelf. Over people: a name tag up close.
// Town3D moves them every frame; React only decides what they say. They are
// pointer shortcuts (hidden from assistive tech, out of the tab order): the
// same actions live in the harvest button, the inbox and the roster.
import { STATIONS } from '../scene/layout'
import type { Pick, Town3D } from '../scene/town3d'
import { kindIconURL } from '../scene/icons'
import type { TownState, TownStore } from '../store'
import type { EmployeeView } from '../work/types'
import { nameOf } from './format'

interface Props { town: Town3D; store: TownStore; state: TownState; hover: Pick | null }

export function Pins({ town, store, state, hover }: Props) {
  const snap = state.snap
  const pin = (key: string) => (el: HTMLDivElement | null) => {
    town.setPin(key, el)
    return () => town.setPin(key, null)
  }
  const ask = (v: EmployeeView) => {
    store.select(v.id)
    town.focusEmployee(v.id)
  }
  return (
    <div className='pins' aria-hidden='true'>
      {snap.order.map((id) => {
        const v = snap.employees[id]
        const sel = state.selected === id
        const hov = hover?.kind === 'employee' && hover.id === id
        const hasDesk = !!(v.role && STATIONS[v.role.id])
        return (
          <div key={id} ref={pin(id)} className={`pin${sel ? ' pin-sel' : ''}${hov ? ' pin-hover' : ''}`}>
            <div className='pin-body'>
              {!hasDesk && (v.request || v.ready.length > 0) && (
                <div className='pin-row'>
                  {v.request && <RequestBadge v={v} onClick={() => ask(v)} />}
                  {v.ready.length > 0 && <ReadyBadge v={v} onClick={() => store.harvest(v.ready.map((o) => o.id))} />}
                </div>
              )}
              <div className='pin-name'>
                <b>{nameOf(id)}</b>
                {v.role && <span>{v.role.title}</span>}
              </div>
            </div>
          </div>
        )
      })}
      {snap.order.map((id) => {
        const v = snap.employees[id]
        if (!v.role || !STATIONS[v.role.id] || (!v.ready.length && !v.request)) return null
        return (
          <div key={`shelf:${v.role.id}`} ref={pin(`shelf:${v.role.id}`)} className='pin pin-shelf'>
            <div className='pin-body pin-row'>
              {v.request && <RequestBadge v={v} onClick={() => ask(v)} />}
              {v.ready.length > 0 && <ReadyBadge v={v} onClick={() => store.harvest(v.ready.map((o) => o.id))} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RequestBadge({ v, onClick }: { v: EmployeeView; onClick: () => void }) {
  const r = v.request!
  return (
    <button className={`pin-req pin-${r.kind}`} onClick={onClick} title={`${nameOf(v.id)}：${r.title}`} tabIndex={-1}>
      {r.kind === 'error' ? '!' : '?'}
    </button>
  )
}

function ReadyBadge({ v, onClick }: { v: EmployeeView; onClick: () => void }) {
  const latest = v.ready[v.ready.length - 1]
  return (
    <button className={`pin-ready${v.phase === 'full' ? ' full' : ''}`} onClick={onClick} title={`收下${nameOf(v.id)}的 ${v.ready.length} 件产出`} tabIndex={-1}>
      <img src={kindIconURL(latest.kind)} alt='' />
      {v.ready.length > 1 && <span>×{v.ready.length}</span>}
    </button>
  )
}
