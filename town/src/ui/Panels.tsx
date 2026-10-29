import { useState } from 'react'
import { Avatar } from '../../../src/library'
import { kindIconURL } from '../scene/icons'
import type { Town3D } from '../scene/town3d'
import type { TownState, TownStore } from '../store'
import type { Quality } from '../work/persist'
import { DISTRICTS, DISTRICT_ORDER, OUTPUT_KINDS } from '../work/roles'
import type { EmployeeView, Output } from '../work/types'
import { Glyph } from './Glyph'
import { RolePicker } from './RolePicker'
import { ago, clock, dayLabel, duration, nameOf, phaseText, tone } from './format'

interface Props { store: TownStore; state: TownState; town: Town3D | null }

const TITLES = { roster: '名册', inbox: '收件箱', log: '收获记录', settings: '设置', about: '关于信号镇' } as const

export function Panel({ store, state, town }: Props) {
  const panel = state.panel!
  return (
    <aside className='panel' aria-label={TITLES[panel]}>
      <header className='panel-head'>
        <h2>{TITLES[panel]}</h2>
        <button className='panel-close' onClick={() => store.closePanel()} aria-label='关闭'><Glyph name='close' size={18} /></button>
      </header>
      <div className='panel-body'>
        {panel === 'roster' && <Roster store={store} state={state} town={town} />}
        {panel === 'inbox' && <Inbox store={store} state={state} town={town} />}
        {panel === 'log' && <Log state={state} />}
        {panel === 'settings' && <SettingsPanel store={store} state={state} />}
        {panel === 'about' && <About />}
      </div>
    </aside>
  )
}

/* ---------------- roster ---------------- */

function Roster({ store, state, town }: Props) {
  const snap = state.snap
  const demo = snap.source === 'demo'
  const views = snap.order.map((id) => snap.employees[id])
  const groups = DISTRICT_ORDER.map((d) => ({ key: d as string, title: DISTRICTS[d].name, list: views.filter((v) => v.role?.district === d) }))
  groups.push({ key: 'reserve', title: '候补', list: views.filter((v) => !v.role) })
  const pick = (v: EmployeeView) => {
    store.select(v.id)
    town?.focusEmployee(v.id)
  }
  return (
    <div className='roster'>
      <p className='muted'>{snap.order.length} 位伙伴，{views.filter((v) => v.role).length} 位在岗。{demo ? '点头像看 TA 在做什么；右边可以给 TA 换岗位。' : '分工由你的 agent 回传。'}</p>
      {groups.filter((g) => g.list.length).map((g) => (
        <section key={g.key}>
          <h3>{g.title}<span>{g.list.length}</span></h3>
          <ul>
            {g.list.map((v) => (
              <li key={v.id} className={state.selected === v.id ? 'sel' : ''}>
                <button className='roster-who' onClick={() => pick(v)}>
                  <Avatar character={v.id} emotion={v.emotion} status={v.status} size={44} motion='transitions' decorative />
                  <span className='roster-text'>
                    <b>{nameOf(v.id)}</b>
                    <small>{v.role?.title ?? '自由活动'}</small>
                  </span>
                  <span className={`chip chip-${tone(v)}`}>{v.ready.length ? `待收 ${v.ready.length}` : phaseText(v)}</span>
                </button>
                {demo && <RolePicker id={v.id} store={store} state={state} compact />}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/* ---------------- inbox ---------------- */

function Inbox({ store, state, town }: Props) {
  const snap = state.snap
  const demo = snap.source === 'demo'
  if (!snap.requests.length) return <Empty text='没有人在等你。大家都在自己干活。' />
  return (
    <ul className='inbox'>
      {[...snap.requests].reverse().map((r) => (
        <li key={r.id} className={`ask-${r.kind}`}>
          <button className='inbox-who' onClick={() => { store.select(r.employee); town?.focusEmployee(r.employee) }}>
            <Avatar character={r.employee} emotion={r.kind === 'error' ? 'aggrieved' : 'puzzled'} status={r.kind === 'error' ? 'error' : 'needs-input'} size={40} motion='transitions' decorative />
            <span>
              <b>{nameOf(r.employee)}</b>
              <small>{r.kind === 'error' ? '卡住了' : '问你'} · {ago(r.createdAt, snap.now)}</small>
            </span>
          </button>
          <p className='ask-q'>{r.title}</p>
          {r.detail && <p className='ask-d'>{r.detail}</p>}
          <div className='ask-options'>
            {demo
              ? r.options.map((opt) => <button key={opt} onClick={() => store.answer(r.id, opt)}>{opt}</button>)
              : r.url && <a href={r.url} target='_blank' rel='noreferrer'><Glyph name='link' size={16} />去处理</a>}
          </div>
        </li>
      ))}
    </ul>
  )
}

/* ---------------- log ---------------- */

function Log({ state }: { state: TownState }) {
  const snap = state.snap
  if (!snap.log.length) return <Empty text='还没收过东西。货架上有产出时，点它或者点下面的「一键收菜」。' />
  const days = new Map<string, Output[]>()
  for (const o of snap.log) {
    const k = dayLabel(o.harvestedAt!, snap.now)
    days.set(k, [...(days.get(k) ?? []), o])
  }
  return (
    <div className='log'>
      <p className='muted'>今天收了 {snap.stats.harvestedToday} 件，一共 {snap.stats.harvestedTotal} 件。</p>
      {[...days.entries()].map(([day, list]) => (
        <section key={day}>
          <h3>{day}<span>{list.length}</span></h3>
          <ul className='outs'>
            {list.map((o) => (
              <li key={o.id}>
                <img src={kindIconURL(o.kind)} alt='' />
                <div>
                  <b>{o.url ? <a href={o.url} target='_blank' rel='noreferrer'>{o.title}</a> : o.title}</b>
                  {o.summary && <span>{o.summary}</span>}
                  <small>{nameOf(o.employee)} · {OUTPUT_KINDS[o.kind].label} · {clock(o.harvestedAt!)} 收</small>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

/* ---------------- settings ---------------- */

function SettingsPanel({ store, state }: { store: TownStore; state: TownState }) {
  const s = state.settings
  const [url, setUrl] = useState(s.feed.url)
  const [token, setToken] = useState(s.feed.token ?? '')
  const snap = state.snap
  const qualities: Array<[Quality, string]> = [['auto', '自动'], ['high', '高'], ['medium', '中'], ['low', '低']]
  return (
    <div className='settings'>
      <section>
        <h3>数据来源</h3>
        <div className='seg'>
          <button className={s.source === 'demo' ? 'on' : ''} onClick={() => store.updateSettings({ source: 'demo' })}>演示数据</button>
          <button className={s.source === 'feed' ? 'on' : ''} disabled={!s.feed.url} onClick={() => store.updateSettings({ source: 'feed' })} title={s.feed.url ? '' : '先在下面填好 feed 地址'}>我的 agent</button>
        </div>
        <p className='muted'>演示数据是小镇自己模拟的：每个人按岗位接活、干活、偶尔问你问题或者卡住，做完的东西放上货架。关掉页面也会接着干，回来时一起结算。</p>
        <form className='feed-form' onSubmit={(e) => { e.preventDefault(); store.updateSettings({ feed: { url: url.trim(), token: token.trim() || undefined }, source: url.trim() ? 'feed' : 'demo' }) }}>
          <label>
            <span>Feed 地址（JSON）</span>
            <input type='url' placeholder='https://…/town.json' value={url} onChange={(e) => setUrl(e.target.value)} />
          </label>
          <label>
            <span>访问令牌（可选，只存在这个浏览器里）</span>
            <input type='password' autoComplete='off' placeholder='Bearer token' value={token} onChange={(e) => setToken(e.target.value)} />
          </label>
          <button type='submit' className='btn-indigo'>保存并连接</button>
          {s.source === 'feed' && (
            <p className={snap.feedError ? 'feed-status err' : 'feed-status'}>
              {state.feedLoading ? '正在读取…' : snap.feedError ? `出错了：${snap.feedError}` : snap.feedUpdatedAt ? `已连接，数据更新于 ${ago(snap.feedUpdatedAt, snap.now)}` : '已连接'}
            </p>
          )}
          <p className='muted'>格式见仓库里的 docs/TOWN.md：每 30 秒读一次，员工状态、任务进度、产出和问题都从这里来。</p>
        </form>
      </section>
      <section>
        <h3>画质</h3>
        <div className='seg'>
          {qualities.map(([q, label]) => <button key={q} className={s.quality === q ? 'on' : ''} onClick={() => store.updateSettings({ quality: q })}>{label}</button>)}
        </div>
        <p className='muted'>自动：先用高画质，卡的话自己降下来。</p>
      </section>
      <section>
        <h3>天色和声音</h3>
        <label className='toggle'>
          <input type='checkbox' checked={s.realTimeSky} onChange={(e) => store.updateSettings({ realTimeSky: e.target.checked })} />
          <span>天色跟着你的本地时间走（晚上是夜景）</span>
        </label>
        <label className='toggle'>
          <input type='checkbox' checked={s.sound} onChange={(e) => store.updateSettings({ sound: e.target.checked })} />
          <span>音效：收菜时叮一声</span>
        </label>
      </section>
      {s.source === 'demo' && (
        <section>
          <h3>演示小镇</h3>
          <p className='muted'>小镇已经开了 {duration(store.age)}。重置会清空货架、记录和分工。</p>
          <button className='btn-danger' onClick={() => { if (window.confirm('确定重置演示小镇吗？货架、收获记录和分工都会清空。')) store.resetDemo() }}>重置演示小镇</button>
        </section>
      )}
    </div>
  )
}

/* ---------------- about ---------------- */

function About() {
  return (
    <div className='about'>
      <p>信号镇是 Jojo 和 25 位伙伴上班的地方。每位伙伴都有一份岗位：写文章、做 PPT、盯资讯、写代码、审代码、看邮件……他们在自己的工位上干活，做完的东西摆上货架。</p>
      <h3>怎么玩</h3>
      <ul>
        <li><b>收菜</b>：货架上的方块就是做好的产出。点方块、点头顶的珊瑚色徽章，或者点下面的「一键收菜」。</li>
        <li><b>拍板</b>：头顶冒「?」的伙伴在等你决定，冒「!」的卡住了。点 TA 或者打开收件箱回复。</li>
        <li><b>货架满了</b>：每个货架放 3 件。满了 TA 就会停下来等你，所以记得常回来看看。</li>
        <li><b>换岗位</b>：在名册里给任何人换岗，候补的伙伴也能顶上。</li>
        <li><b>不在的时候</b>：关掉页面大家也照常上班（白班 8 点到 23 点，有几位通宵值班），回来时一起结算。</li>
      </ul>
      <h3>操作</h3>
      <ul>
        <li>拖动旋转，右键拖动或双指平移，滚轮或捏合缩放。</li>
        <li>WASD / 方向键移动镜头，Q / E 转向，+ / − 缩放。</li>
        <li>双击一位伙伴，镜头会跟着 TA。</li>
      </ul>
      <h3>接入真实的 agent</h3>
      <p>在设置里填一个 JSON 地址，小镇就会改为显示你自己的 agent：谁在做什么、做到多少、产出了什么、在等你回什么。格式见 docs/TOWN.md。</p>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className='empty'>
      <Glyph name='basket' size={36} />
      <p>{text}</p>
    </div>
  )
}
