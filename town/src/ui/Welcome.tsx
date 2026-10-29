import { Avatar } from '../../../src/library'
import { kindIconURL } from '../scene/icons'
import type { TownState, TownStore } from '../store'
import { duration, nameOf } from './format'

export function Welcome({ store, state }: { store: TownStore; state: TownState }) {
  const h = state.homecoming!
  const ready = state.snap.ready
  const byWho = new Map<string, number>()
  for (const o of h.fresh) byWho.set(o.employee, (byWho.get(o.employee) ?? 0) + 1)
  const top = [...byWho.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  const close = () => store.dismissHomecoming()
  return (
    <div className='modal-back' onClick={close}>
      <div className='modal' role='dialog' aria-modal='true' aria-labelledby='welcome-title' onClick={(e) => e.stopPropagation()}>
        <div className='modal-avatars' aria-hidden='true'>
          {(top.length ? top.map(([id]) => id) : ['jojo', 'o13', 'o08', 'o10', 'o12']).slice(0, 5).map((id, i) => (
            <span key={id} style={{ zIndex: 10 - i }}>
              <Avatar character={id} emotion={i === 0 ? 'happy' : 'smug'} status={h.firstVisit ? 'idle' : 'success'} size={64} motion='transitions' decorative />
            </span>
          ))}
        </div>
        {h.firstVisit ? (
          <>
            <h2 id='welcome-title'>欢迎来到信号镇</h2>
            <p>Jojo 和伙伴们已经在这里上班了。每个人都有自己的岗位和工位，做完的东西会摆上工位旁的货架。</p>
            <ul className='modal-tips'>
              <li><b>收菜</b>：点货架上的方块，或者下面的「一键收菜」。</li>
              <li><b>拍板</b>：头顶冒「?」的伙伴在等你决定。</li>
              <li><b>常回来</b>：货架满了 TA 就会停工等你；你不在时大家照常干活。</li>
            </ul>
            {ready.length > 0 && <p className='modal-note'>开门前大家已经做好了 {ready.length} 件，先收下吧。</p>}
          </>
        ) : (
          <>
            <h2 id='welcome-title'>欢迎回来</h2>
            <p>你离开了 {duration(h.awayMs)}。这段时间：</p>
            <div className='modal-stats'>
              <div><b>{h.fresh.length}</b><span>件新产出</span></div>
              <div><b>{h.asks.length}</b><span>个问题等你</span></div>
            </div>
            {top.length > 0 && (
              <ul className='modal-who'>
                {top.map(([id, n]) => <li key={id}><b>{nameOf(id)}</b> 做了 {n} 件</li>)}
              </ul>
            )}
            {h.fresh.length > 0 && (
              <div className='modal-items' aria-hidden='true'>
                {h.fresh.slice(-12).map((o) => <img key={o.id} src={kindIconURL(o.kind)} alt='' />)}
              </div>
            )}
          </>
        )}
        <div className='modal-actions'>
          {ready.length > 0 && <button className='btn-coral big' onClick={() => { store.harvestAll(); close() }}>一键收下 {ready.length} 件</button>}
          {!h.firstVisit && h.asks.length > 0 && <button className='btn-indigo' onClick={() => { close(); store.setPanel('inbox') }}>先看问题</button>}
          <button className='btn-plain' onClick={close}>进镇看看</button>
        </div>
      </div>
    </div>
  )
}
