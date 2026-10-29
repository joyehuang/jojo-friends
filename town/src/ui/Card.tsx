import { Avatar } from '../../../src/library'
import { kindIconURL } from '../scene/icons'
import type { Town3D } from '../scene/town3d'
import type { TownState, TownStore } from '../store'
import { OUTPUT_KINDS } from '../work/roles'
import type { EmployeeView } from '../work/types'
import { Glyph } from './Glyph'
import { RolePicker } from './RolePicker'
import { ago, districtName, duration, emotionLabel, nameOf, personaOf, phaseText, tone } from './format'

interface Props { v: EmployeeView; store: TownStore; state: TownState; town: Town3D | null }

export function EmployeeCard({ v, store, state, town }: Props) {
  const now = state.snap.now
  const demo = state.snap.source === 'demo'
  const where = town?.where(v.id) ?? ''
  const t = tone(v)
  return (
    <aside className={`card tone-${t}`} aria-label={`${nameOf(v.id)}的工作卡片`}>
      <button className='card-close' onClick={() => store.select(null)} aria-label='关闭'><Glyph name='close' size={18} /></button>
      <div className='card-head'>
        <div className='card-avatar'>
          <Avatar character={v.id} emotion={v.emotion} status={v.status} size={84} gaze='center' decorative />
        </div>
        <div className='card-who'>
          <h2>{nameOf(v.id)}</h2>
          <p className='card-role'>{v.role ? `${v.role.title}${districtName(v) ? ` · ${districtName(v)}` : ''}` : '候补伙伴'}</p>
          <p className='card-state'>
            <span className={`chip chip-${t}`}>{phaseText(v)}</span>
            <span className='card-mood'>表情：{emotionLabel(v.emotion)}</span>
          </p>
          {where && <p className='card-where'>{where}</p>}
        </div>
      </div>

      <div className='card-actions'>
        <button className={state.following ? 'on' : ''} onClick={() => { const f = !state.following; store.setFollowing(f); if (f) town?.focusEmployee(v.id) }}>
          <Glyph name='follow' size={18} />{state.following ? '取消跟随' : '跟随镜头'}
        </button>
        <button onClick={() => town?.focusEmployee(v.id)}><Glyph name='desk' size={18} />看看 TA</button>
        {demo && <RolePicker id={v.id} store={store} state={state} />}
      </div>

      {v.role?.desc && <p className='card-desc'>{v.role.desc}</p>}

      {v.task && (
        <section className='card-task'>
          <div className='card-task-title'>
            <img src={kindIconURL(v.task.kind)} alt='' />
            <span>{v.phase === 'working' ? '正在做' : v.phase === 'blocked' ? '做到一半' : '卡在'}：{v.task.title}</span>
          </div>
          <div className='bar' role='progressbar' aria-valuenow={Math.round(v.task.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <i style={{ width: `${Math.round(v.task.progress * 100)}%` }} />
          </div>
          <div className='card-task-meta'>
            <span>{Math.round(v.task.progress * 100)}%</span>
            {v.task.remainingMs > 0 && v.phase === 'working' && <span>大约还要 {duration(v.task.remainingMs)}</span>}
            <span>产出：{OUTPUT_KINDS[v.task.kind].label}</span>
          </div>
        </section>
      )}

      {v.request && (
        <section className={`card-ask ask-${v.request.kind}`}>
          <h3>{v.request.kind === 'error' ? '卡住了' : '需要你拍板'}</h3>
          <p className='ask-q'>{v.request.title}</p>
          {v.request.detail && <p className='ask-d'>{v.request.detail}</p>}
          <div className='ask-options'>
            {demo
              ? v.request.options.map((opt) => <button key={opt} onClick={() => store.answer(v.request!.id, opt)}>{opt}</button>)
              : v.request.url && <a href={v.request.url} target='_blank' rel='noreferrer'><Glyph name='link' size={16} />去处理</a>}
          </div>
        </section>
      )}

      <section className='card-shelf'>
        <div className='card-shelf-head'>
          <h3>货架上 {v.ready.length ? `· ${v.ready.length} 件` : ''}</h3>
          {v.ready.length > 0 && <button className='btn-coral' onClick={() => store.harvest(v.ready.map((o) => o.id))}>全部收下</button>}
        </div>
        {v.ready.length === 0 && <p className='muted'>{v.phase === 'working' ? '还没做完，等会儿就有了。' : '空空的。'}{v.harvestedToday ? ` 今天已经收了 TA ${v.harvestedToday} 件。` : ''}</p>}
        <ul className='outs'>
          {v.ready.map((o) => (
            <li key={o.id}>
              <img src={kindIconURL(o.kind)} alt='' />
              <div>
                <b>{o.title}</b>
                {o.summary && <span>{o.summary}</span>}
                <small>{OUTPUT_KINDS[o.kind].label} · {ago(o.createdAt, now)}</small>
              </div>
              <button onClick={() => store.harvest([o.id])}>收</button>
            </li>
          ))}
        </ul>
      </section>

      <p className='card-persona'>{personaOf(v.id)}</p>

    </aside>
  )
}
