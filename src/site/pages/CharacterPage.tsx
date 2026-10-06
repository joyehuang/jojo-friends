import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Avatar, AvatarStatic, CHARACTER_LIST, EMOTION_GROUPS, EMOTION_LIST, EMOTIONS, STATUS_LIST, STATUSES,
  designRevision, isEmotionId, isStatusId,
  type Character, type EmotionGroup, type JojoHandle, type MotionPref, type StatusId,
} from '../../library'
import { QUIET, tri, useLook, type Backdrop, type GazePref, type Look, type Tri } from '../look'
import { Link, navigate, useLocation } from '../router'
import { IDENTITY_LOOKS, type IdentityLook } from '../variants'

const pad = (n: number) => String(n).padStart(2, '0')
const GROUPS: EmotionGroup[] = ['daily', 'bright', 'swing', 'blue']

const MOTIONS: Array<{ id: MotionPref; label: string; hint: string }> = [
  { id: 'auto', label: '自动', hint: '完整动效；系统开启“减少动态效果”时自动静止' },
  { id: 'full', label: '完整', hint: '眨眼、呼吸、小动作和过渡' },
  { id: 'transitions', label: '仅过渡', hint: '切换时动一下，然后停住（适合列表里的小头像）' },
  { id: 'static', label: '静止', hint: '完全不动' },
]
const GAZES: Array<{ id: GazePref; label: string }> = [
  { id: 'auto', label: '自己看' },
  { id: 'pointer', label: '跟随指针' },
  { id: 'center', label: '看向你' },
]
const BACKDROPS: Array<{ id: Backdrop; label: string }> = [
  { id: 'paper', label: '纸面' },
  { id: 'white', label: '纯白' },
  { id: 'mint', label: '薄荷' },
  { id: 'night', label: '深色' },
  { id: 'clear', label: '透明格' },
]
const TRIS: Array<{ id: Tri; label: string }> = [
  { id: 'auto', label: '自动' },
  { id: 'on', label: '开' },
  { id: 'off', label: '关' },
]
const STATUS_GLYPH: Record<StatusId, string> = { idle: '○', working: '◔', 'needs-input': '?', success: '✓', error: '!', offline: '–' }

function Segmented<T extends string>(props: {
  legend: string
  value: T
  options: Array<{ id: T; label: string; hint?: string }>
  onChange: (v: T) => void
  note?: ReactNode
}) {
  const hint = props.options.find((o) => o.id === props.value)?.hint
  return (
    <fieldset className='seg'>
      <legend>{props.legend}</legend>
      <div className='seg-row'>
        {props.options.map((o) => (
          <button key={o.id} type='button' aria-pressed={props.value === o.id} onClick={() => props.onChange(o.id)} title={o.hint}>
            {o.label}
          </button>
        ))}
      </div>
      {(hint || props.note) && <p className='seg-note'>{props.note ?? hint}</p>}
    </fieldset>
  )
}

function avatarProps(ch: Character, look: Look) {
  return {
    character: ch.id,
    emotion: look.emotion,
    status: look.status,
    intensity: look.intensity,
    shadow: tri(look.shadow),
    brows: tri(look.brows),
    flat: tri(look.flat),
  }
}

/** Live, stateful name for screen readers, e.g. "Bento：开心，状态：工作中". */
function stateText(ch: Character, look: Look) {
  const e = EMOTIONS[look.emotion].label
  return look.status === 'idle' ? `${ch.name.en}：${e}` : `${ch.name.en}：${e}，状态：${STATUSES[look.status].label}`
}

function Stage({ ch, replayKey }: { ch: Character; replayKey: number }) {
  const { look } = useLook()
  const ref = useRef<JojoHandle>(null)
  useEffect(() => {
    if (replayKey) ref.current?.replayStatus()
  }, [replayKey])
  return (
    <div className='stage-col'>
      <button
        type='button'
        className={`stage bg-${look.backdrop}`}
        onClick={() => ref.current?.poke()}
        aria-label={`戳一下 ${ch.name.en}（${ch.name.zh}）`}
      >
        <Avatar ref={ref} {...avatarProps(ch, look)} motion={look.motion} gaze={look.gaze} size={look.size} decorative />
      </button>
      <p className='stage-caption' aria-live='polite'>
        {stateText(ch, look)}
        <span className='muted'> · 点击或按空格“戳一下”</span>
      </p>
      <div className='sizes' aria-label='小尺寸预览'>
        {[24, 32, 48, 64, 96].map((px) => (
          <figure key={px}>
            <div className={`size-box bg-${look.backdrop}`}>
              <AvatarStatic {...avatarProps(ch, look)} size={px} decorative />
            </div>
            <figcaption>{px}px</figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

function Controls({ ch, onReplay }: { ch: Character; onReplay: () => void }) {
  const { look, set, reset } = useLook()
  const isQuiet = JSON.stringify(look) === JSON.stringify(QUIET)
  return (
    <div className='controls' aria-label={`${ch.name.en} 的试玩控制`}>
      <fieldset className='emo'>
        <legend>表情 <span className='muted'>16 种</span></legend>
        {GROUPS.map((g) => (
          <div className='emo-group' key={g}>
            <span className='emo-group-name'>{EMOTION_GROUPS[g]}</span>
            <div className='chips'>
              {EMOTION_LIST.filter((e) => e.group === g).map((e) => (
                <button key={e.id} type='button' className='chip' aria-pressed={look.emotion === e.id} onClick={() => set({ emotion: e.id })} title={e.cue}>
                  {e.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className='seg-note'>{EMOTIONS[look.emotion].cue.replace(/^原图基线：/, '')}</p>
      </fieldset>

      <fieldset className='emo'>
        <legend>业务状态 <span className='muted'>只改信号标识，不改表情</span></legend>
        <div className='chips'>
          {STATUS_LIST.map((s) => (
            <button key={s.id} type='button' className='chip status-chip' aria-pressed={look.status === s.id} onClick={() => set({ status: s.id })}>
              <span aria-hidden='true' className='glyph'>{STATUS_GLYPH[s.id]}</span>
              {s.label}
            </button>
          ))}
        </div>
        <p className='seg-note'>{STATUSES[look.status].signal}</p>
      </fieldset>

      <div className='row2'>
        <label className='slider'>
          <span>力度 <output>{look.intensity.toFixed(2)}</output></span>
          <input type='range' min={0} max={1} step={0.05} value={look.intensity} onChange={(e) => set({ intensity: Number(e.target.value) })} />
        </label>
        <label className='slider'>
          <span>尺寸 <output>{look.size}px</output></span>
          <input type='range' min={24} max={320} step={4} value={look.size} onChange={(e) => set({ size: Number(e.target.value) })} />
        </label>
      </div>

      <Segmented legend='动效' value={look.motion} options={MOTIONS} onChange={(motion) => set({ motion })} />
      <Segmented legend='视线' value={look.gaze} options={GAZES} onChange={(gaze) => set({ gaze })} />
      <Segmented legend='背景' value={look.backdrop} options={BACKDROPS} onChange={(backdrop) => set({ backdrop })} />
      <div className='row3'>
        <Segmented legend='阴影' value={look.shadow} options={TRIS} onChange={(shadow) => set({ shadow })} note='自动：≥ 72px 才有' />
        <Segmented legend='眉毛' value={look.brows} options={TRIS} onChange={(brows) => set({ brows })} note='自动：≥ 56px 才有' />
        <Segmented legend='纯色' value={look.flat} options={TRIS} onChange={(flat) => set({ flat })} note='自动：≤ 40px 用纯色' />
      </div>

      <div className='actions'>
        <button type='button' className='btn' onClick={onReplay} disabled={look.motion === 'static'}>重播状态动效</button>
        <button type='button' className='btn ghost' onClick={reset} disabled={isQuiet}>重置为安静默认</button>
        <ShareLink ch={ch} />
      </div>
    </div>
  )
}

/** Copies this page's address (character + chosen emotion/status) so it can be shared. */
function ShareLink({ ch }: { ch: Character }) {
  const [note, setNote] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(location.href)
      setNote('链接已复制，打开后会看到同样的表情和状态')
    } catch {
      setNote('无法自动复制，请直接复制地址栏里的链接')
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setNote(''), 2400)
  }
  return (
    <>
      <button type='button' className='btn ghost' onClick={copy} aria-label={`复制 ${ch.name.en} 当前表情与状态的分享链接`}>复制分享链接</button>
      <span className='seg-note share-note' role='status'>{note}</span>
    </>
  )
}

function TriCompare({ ch, replayKey }: { ch: Character; replayKey: number }) {
  const { look } = useLook()
  const refs = [useRef<JojoHandle>(null), useRef<JojoHandle>(null), useRef<JojoHandle>(null)]
  const replay = () => refs.forEach((r) => r.current?.replayStatus())
  useEffect(() => {
    if (replayKey) replay()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayKey])
  const trio: StatusId[] = ['working', 'needs-input', 'success']
  return (
    <section className='panel' aria-labelledby='trio-title'>
      <div className='section-head'>
        <h2 id='trio-title'>三种任务状态对照</h2>
        <button type='button' className='btn small' onClick={replay} disabled={look.motion === 'static'}>重播</button>
      </div>
      <p className='prose'>
        工作中只在“完整”动效下持续推进进度弧；等你回复只弹出一次问号气泡然后静止等待；已完成播一次勾号动效后，勾号常驻。
        三者都画在 {ch.name.en} 自己的缺口旁，不会盖住脸。
      </p>
      <div className='trio'>
        {trio.map((s, i) => (
          <figure key={s} className={`bg-${look.backdrop}`}>
            <Avatar ref={refs[i]} {...avatarProps(ch, look)} status={s} motion={look.motion} size={132} />
            <figcaption>{STATUSES[s].label}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

function EmotionGrid({ ch }: { ch: Character }) {
  const { look, set } = useLook()
  return (
    <section className='panel' aria-labelledby='emo-title'>
      <h2 id='emo-title'>16 种表情一览</h2>
      <ul className='emo-grid'>
        {EMOTION_LIST.map((e) => (
          <li key={e.id}>
            <button type='button' aria-pressed={look.emotion === e.id} onClick={() => set({ emotion: e.id })}>
              <AvatarStatic character={ch.id} emotion={e.id} status={look.status} intensity={look.intensity} size={84} decorative />
              <span>{e.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** What the character looks like, for viewers: shape, colours and design version. */
function Design({ ch }: { ch: Character }) {
  const C = ch.palette
  const swatches: Array<[string, string]> = [['壳体', C.shell], ['脸板', C.face], ['五官', C.ink], ['信号点', C.dot]]
  if (C.mouth !== C.ink) swatches.splice(3, 0, ['嘴', C.mouth])
  const d = designRevision(ch)
  return (
    <section className='panel about' aria-labelledby='about-title'>
      <h2 id='about-title'>造型</h2>
      {!d.fromSource && (
        <div className='revision-note' data-design-revision={d.revision}>
          <p>
            <strong>当前是第 {d.revision} 版设计</strong>（{d.date} 修订）。{d.reason!.zh}
          </p>
          <ul>{d.changes.map((c) => <li key={c.en}>{c.zh}</li>)}</ul>
        </div>
      )}
      <p className='prose'>{ch.form}</p>
      <ul className='swatches' aria-label='调色'>
        {swatches.map(([n, c]) => (
          <li key={n}><span style={{ background: c }} aria-hidden='true' />{n} <code>{c}</code></li>
        ))}
      </ul>
      <dl className='meta'>
        <dt>编号</dt><dd>No.{pad(ch.no)}</dd>
        <dt>设计版本</dt><dd>{d.fromSource ? '第 1 版' : `第 ${d.revision} 版（${d.date}）`}</dd>
      </dl>
    </section>
  )
}

/** A static identity look (e.g. Filo on duty): one finished picture, shown beside — never instead of — the live character. */
function IdentityLookPanel({ ch, v }: { ch: Character; v: IdentityLook }) {
  return (
    <section className='panel duty' id={v.id} aria-labelledby={`${v.id}-title`}>
      <h2 id={`${v.id}-title`}>
        {v.label.zh} <span className='muted small'>{v.label.en} · 静态身份头像</span>
      </h2>
      <div className='duty-body'>
        <figure className='duty-art'>
          <img src={v.src} width={1024} height={1024} alt={v.alt} loading='lazy' decoding='async' draggable={false} />
        </figure>
        <div className='duty-text'>
          <p className='prose'>{v.summary}</p>
          <ul className='duty-adds'>{v.adds.map((a) => <li key={a}>{a}</li>)}</ul>
          <p className='duty-note'>
            这是一张静态头像，只有这一个样子：没有 16 种表情、业务状态或动效。上面的试玩控制只作用于普通版 {ch.name.en}，普通版不变。
          </p>
          <div className='sizes duty-sizes' aria-label={`${v.label.zh}与普通版的小尺寸对照`}>
            <figure>
              <div className='size-box bg-paper'><AvatarStatic character={ch.id} size={64} decorative /></div>
              <figcaption>普通版</figcaption>
            </figure>
            {[96, 64, 48, 32].map((px) => (
              <figure key={px}>
                <div className='size-box bg-paper'><img src={v.src} width={px} height={px} alt='' /></div>
                <figcaption>{px}px</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Strip({ ch, search }: { ch: Character; search: string }) {
  return (
    <nav className='panel' aria-label='切换角色（保持当前表情与状态）'>
      <h2>换一位看看 <span className='muted small'>表情和状态会保持</span></h2>
      <ul className='mini-strip'>
        {CHARACTER_LIST.map((c) => (
          <li key={c.id}>
            <Link to={`/c/${c.id}${search}`} aria-current={c.id === ch.id ? 'page' : undefined} title={`No.${pad(c.no)} ${c.name.en} ${c.name.zh}`}>
              <AvatarStatic character={c.id} size='100%' decorative />
              <span>{c.name.en}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function CharacterPage({ character: ch }: { character: Character }) {
  const { look, set } = useLook()
  const { search } = useLocation()
  const [replayKey, setReplayKey] = useState(0)

  // shareable state: ?e=<emotion>&s=<status> is read on arrival…
  useEffect(() => {
    const q = new URLSearchParams(search)
    const e = q.get('e'), s = q.get('s')
    const patch: Partial<Look> = {}
    if (isEmotionId(e) && e !== look.emotion) patch.emotion = e
    if (isStatusId(s) && s !== look.status) patch.status = s
    if (Object.keys(patch).length) set(patch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ch.id])
  // …and kept in the address bar as it changes
  const qs = (() => {
    const q = new URLSearchParams()
    if (look.emotion !== 'calm') q.set('e', look.emotion)
    if (look.status !== 'idle') q.set('s', look.status)
    const s = q.toString()
    return s ? `?${s}` : ''
  })()
  useEffect(() => {
    navigate(`/c/${ch.id}${qs}`, { replace: true })
  }, [ch.id, qs])

  // identity looks have their own anchor (/c/o18#on-duty); the page renders after load, so scroll to it once here
  const looks = IDENTITY_LOOKS[ch.id] ?? []
  useEffect(() => {
    const id = location.hash.slice(1)
    if (looks.some((v) => v.id === id)) document.getElementById(id)?.scrollIntoView()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ch.id])

  const i = CHARACTER_LIST.indexOf(ch)
  const prev = CHARACTER_LIST[(i - 1 + CHARACTER_LIST.length) % CHARACTER_LIST.length]
  const next = CHARACTER_LIST[(i + 1) % CHARACTER_LIST.length]

  return (
    <article className='wrap detail'>
      <div className='crumbs'>
        <Link to='/'>← 全部角色</Link>
        <span className='pager'>
          <Link to={`/c/${prev.id}${qs}`} aria-label={`上一位：${prev.name.en}`}>‹ {prev.name.en}</Link>
          <span className='mono'>No.{pad(ch.no)} / {CHARACTER_LIST.length}</span>
          <Link to={`/c/${next.id}${qs}`} aria-label={`下一位：${next.name.en}`}>{next.name.en} ›</Link>
        </span>
      </div>
      <header className='detail-head'>
        <p className='eyebrow'>No.{pad(ch.no)} · id <code>{ch.id}</code></p>
        <h1 className='display small'>
          {ch.name.en} <span className='zh'>{ch.name.zh}</span>
        </h1>
        <p className='lead'>{ch.persona.zh}</p>
        {looks.length > 0 && (
          <p className='look-links'>
            {looks.map((v) => (
              <a key={v.id} href={`#${v.id}`} className='look-link'>
                <img src={v.src} width={28} height={28} alt='' />
                另有{v.label.zh} <span className='muted'>{v.label.en}</span> ↓
              </a>
            ))}
          </p>
        )}
      </header>

      <div className='play'>
        <Stage ch={ch} replayKey={replayKey} />
        <Controls ch={ch} onReplay={() => setReplayKey((k) => k + 1)} />
      </div>

      {looks.map((v) => <IdentityLookPanel key={v.id} ch={ch} v={v} />)}
      <TriCompare ch={ch} replayKey={replayKey} />
      <EmotionGrid ch={ch} />
      <Design ch={ch} />
      <Strip ch={ch} search={qs} />
      <p className='disclaimer'>
        {ch.name.en} 是 Joye 个人角色 IP 的一员。表情、状态都是视觉演示，不连接任何真实 Agent 或个人任务；
        本站不提供素材下载或通用使用授权，详见<Link to='/about'>关于与使用授权</Link>。
      </p>
    </article>
  )
}
