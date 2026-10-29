import { useEffect, useRef, useState } from 'react'
import type { Pick, Town3D } from '../scene/town3d'
import { kindIconURL } from '../scene/icons'
import type { TownState, TownStore } from '../store'
import { EmployeeCard } from './Card'
import { HoverTip } from './HoverTip'
import { Glyph } from './Glyph'
import { Minimap } from './Minimap'
import { Panel } from './Panels'
import { Pins } from './Pins'
import { Welcome } from './Welcome'
import { clock, nameOf } from './format'
import { play } from './sound'

interface Props { store: TownStore; state: TownState; town: Town3D | null; hover: Pick | null }

export function Hud({ store, state, town, hover }: Props) {
  const snap = state.snap
  const basketRef = useRef<HTMLDivElement>(null)
  const [landed, setLanded] = useState(0)

  useEffect(() => {
    if (!town) return
    town.basket = () => {
      const r = basketRef.current?.getBoundingClientRect()
      return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null
    }
    town.onLanded = () => {
      setLanded((n) => n + 1)
      if (store.state.settings.sound) play('harvest')
    }
  }, [town, store])

  const hour = new Date(snap.now).getHours()
  const night = hour < 6 || hour >= 19
  const openRequests = snap.requests.length
  const selected = state.selected ? snap.employees[state.selected] : null

  return (
    <div className='hud'>
      {town && <Pins town={town} store={store} state={state} hover={hover} />}

      <header className='topbar'>
        <div className='brand'>
          <span className='brand-dot' />
          <span className='brand-name'>信号镇</span>
          <span className='brand-clock'>
            <Glyph name={night ? 'moon' : 'sun'} size={16} />
            {clock(snap.now)}
          </span>
          <span className={`source source-${snap.source}`} title={snap.source === 'demo' ? '现在显示的是演示数据，可以在设置里接入你自己的 agent' : '正在显示你的 agent 回传的数据'}>
            {snap.source === 'demo' ? '演示数据' : snap.feedError ? '连接出错' : '实时数据'}
          </span>
        </div>
        <div className='stats'>
          <div className='stat' title='正在干活的伙伴'>
            <span className='stat-num'>{snap.stats.working}</span>
            <span className='stat-label'>人在忙</span>
          </div>
          <div className='stat stat-ready' title='货架上等你收的产出'>
            <span className='stat-num'>{snap.stats.ready}</span>
            <span className='stat-label'>件待收</span>
          </div>
          <div ref={basketRef} key={landed} className={`stat stat-basket${landed ? ' bump' : ''}`} title={`一共收了 ${snap.stats.harvestedTotal} 件`}>
            <Glyph name='basket' size={18} />
            <span className='stat-num'>{snap.stats.harvestedToday}</span>
            <span className='stat-label'>今日已收</span>
          </div>
        </div>
        <nav className='menu'>
          <button className={`menu-btn${state.panel === 'roster' ? ' on' : ''}`} onClick={() => store.setPanel('roster')}>
            <Glyph name='roster' />
            <span>名册</span>
          </button>
          <button className={`menu-btn${state.panel === 'inbox' ? ' on' : ''}`} onClick={() => store.setPanel('inbox')}>
            <Glyph name='inbox' />
            <span>收件箱</span>
            {openRequests > 0 && <em className='badge'>{openRequests}</em>}
          </button>
          <button className={`menu-btn${state.panel === 'log' ? ' on' : ''}`} onClick={() => store.setPanel('log')}>
            <Glyph name='log' />
            <span>收获记录</span>
          </button>
          <button className={`menu-btn icon-only${state.panel === 'settings' ? ' on' : ''}`} onClick={() => store.setPanel('settings')} aria-label='设置'>
            <Glyph name='settings' />
          </button>
          <button className={`menu-btn icon-only${state.panel === 'about' ? ' on' : ''}`} onClick={() => store.setPanel('about')} aria-label='关于信号镇'>
            <Glyph name='info' />
          </button>
        </nav>
      </header>

      {selected && <EmployeeCard key={selected.id} v={selected} store={store} state={state} town={town} />}
      {state.panel && <Panel store={store} state={state} town={town} />}

      <HarvestBar store={store} state={state} />

      <div className='corner-left'>{town && <Minimap town={town} state={state} store={store} />}</div>
      <div className='view-controls'>
        <button onClick={() => town?.zoom(0.7)} aria-label='放大'><Glyph name='plus' /></button>
        <button onClick={() => town?.zoom(1.4)} aria-label='缩小'><Glyph name='minus' /></button>
        <button onClick={() => town?.resetView()} aria-label='回到全景'><Glyph name='home' /></button>
      </div>

      <div className='toasts' aria-live='polite'>
        {state.toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.outputs && (
              <span className='toast-icons'>
                {t.outputs.slice(0, 4).map((o) => <img key={o.id} src={kindIconURL(o.kind)} alt='' />)}
              </span>
            )}
            <span>{t.text}</span>
          </div>
        ))}
      </div>

      <HoverTip hover={hover} state={state} />
      {state.homecoming && <Welcome store={store} state={state} />}
    </div>
  )
}

function HarvestBar({ store, state }: { store: TownStore; state: TownState }) {
  const snap = state.snap
  const ready = snap.ready
  const n = ready.length
  const who = new Set(ready.map((o) => o.employee)).size
  return (
    <div className='harvest-bar'>
      <button className={`harvest${n ? ' ripe' : ''}`} disabled={!n} onClick={() => store.harvestAll()}>
        <span className='harvest-icons' aria-hidden='true'>
          {ready.slice(-4).map((o) => <img key={o.id} src={kindIconURL(o.kind)} alt='' />)}
          {!n && <Glyph name='basket' size={26} />}
        </span>
        <span className='harvest-text'>
          <strong>{n ? `一键收菜 · ${n} 件` : '货架都空了'}</strong>
          <small>{n ? `来自 ${who} 位伙伴${ready.length ? `，最新：${nameOf(ready[ready.length - 1].employee)}「${ready[ready.length - 1].title}」` : ''}` : `${snap.stats.working} 位伙伴正在干活，等会儿再来收`}</small>
        </span>
      </button>
    </div>
  )
}
