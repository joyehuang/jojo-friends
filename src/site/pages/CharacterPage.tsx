import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Avatar, AvatarStatic, CHARACTER_LIST, EMOTION_GROUPS, EMOTION_LIST, EMOTIONS, STATUS_LIST, STATUSES,
  designRevision, isEmotionId, isStatusId,
  type Character, type EmotionGroup, type JojoHandle, type MotionPref, type StatusId,
} from '../../library'
import { prebuilt, rasterise, saveBlob } from '../downloads'
import { QUIET, tri, useLook, type Backdrop, type GazePref, type Look, type Tri } from '../look'
import { Link, navigate, useLocation } from '../router'
import { REPO_BLOB } from '../site-config'

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
      </div>
    </div>
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

function Downloads({ ch }: { ch: Character }) {
  const { look } = useLook()
  const [note, setNote] = useState('')
  const base = `${ch.id}-${look.emotion}-${look.status}`
  // the SVG renderer (react-dom/server) is only loaded when someone downloads
  const svg = async () => (await import('../exporter')).poseSvg({ ...avatarProps(ch, look), size: 512, decorative: false })
  const raster = async (type: 'image/png' | 'image/webp') => {
    setNote('正在生成…')
    const blob = await rasterise(await svg(), type, 1024)
    if (!blob) {
      setNote(type === 'image/webp' ? '这个浏览器不能在本地编码 WebP，请用下方预生成的 WebP 或改下 PNG。' : '生成失败，请改用 SVG。')
      return
    }
    saveBlob(blob, `${base}.${type === 'image/png' ? 'png' : 'webp'}`)
    setNote('')
  }
  return (
    <section className='panel' aria-labelledby='dl-title'>
      <h2 id='dl-title'>下载</h2>
      <div className='dl-group'>
        <h3>当前姿态 <span className='muted'>{EMOTIONS[look.emotion].label} · {STATUSES[look.status].label}</span></h3>
        <div className='dl-row'>
          <button type='button' className='btn' onClick={async () => saveBlob(await svg(), `${base}.svg`)}>SVG</button>
          <button type='button' className='btn' onClick={() => raster('image/png')}>透明 PNG · 1024</button>
          <button type='button' className='btn' onClick={() => raster('image/webp')}>WebP · 1024</button>
        </div>
        <p className='seg-note' aria-live='polite'>{note || '由组件实时导出的静态帧，与页面上选中的角色、表情和状态一致。'}</p>
      </div>
      <div className='dl-group'>
        <h3>{ch.name.en} 预生成素材</h3>
        <div className='dl-row'>
          <a className='btn ghost' href={prebuilt.master(ch.id)} download>平静 SVG</a>
          <a className='btn ghost' href={prebuilt.png(ch.id)} download>PNG 512</a>
          <a className='btn ghost' href={prebuilt.webp(ch.id)} download>WebP 512</a>
          <a className='btn ghost' href={prebuilt.sheet(ch.id)} download>16 表情联系表 SVG</a>
          <a className='btn ghost' href={prebuilt.kit(ch.id)} download>角色素材包 .zip</a>
        </div>
      </div>
      <div className='dl-group'>
        <h3>整个家族</h3>
        <div className='dl-row'>
          <a className='btn ghost' href={prebuilt.family} download>26 位全家素材包 .zip</a>
        </div>
        <p className='seg-note'>素材包含每位角色 16 种表情 × 6 种状态的 SVG、平静姿态 PNG/WebP 与联系表。角色形象的使用授权尚待确认。</p>
      </div>
    </section>
  )
}

function snippet(ch: Character, look: Look) {
  const lines = [`  character="${ch.id}"`]
  if (look.emotion !== QUIET.emotion) lines.push(`  emotion="${look.emotion}"`)
  if (look.status !== QUIET.status) lines.push(`  status="${look.status}"`)
  if (look.intensity !== QUIET.intensity) lines.push(`  intensity={${look.intensity}}`)
  if (look.motion !== QUIET.motion) lines.push(`  motion="${look.motion}"`)
  if (look.gaze !== QUIET.gaze) lines.push(`  gaze="${look.gaze}"`)
  lines.push(`  size={${Math.min(look.size, 96)}}`)
  for (const k of ['shadow', 'brows', 'flat'] as const) if (look[k] !== 'auto') lines.push(`  ${k}={${look[k] === 'on'}}`)
  return [
    `// 从仓库复制 src/library 目录到你的项目（需要 React 19+；尚未发布到 npm）`,
    `import { Avatar } from './library'`,
    ``,
    `<Avatar`,
    ...lines,
    `/>`,
  ].join('\n')
}

function UseInReact({ ch }: { ch: Character }) {
  const { look } = useLook()
  const [copied, setCopied] = useState(false)
  const code = snippet(ch, look)
  return (
    <section className='panel' aria-labelledby='code-title'>
      <div className='section-head'>
        <h2 id='code-title'>在 React 里使用</h2>
        <button
          type='button'
          className='btn small'
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code)
              setCopied(true)
              setTimeout(() => setCopied(false), 1600)
            } catch {
              setCopied(false)
            }
          }}
        >
          {copied ? '已复制' : '复制代码'}
        </button>
      </div>
      <pre className='code'><code>{code}</code></pre>
      <p className='seg-note'>
        代码随上面的选择变化。静态场景可用 <code>&lt;AvatarStatic&gt;</code> 或 <code>renderSvg()</code>（返回 SVG 字符串，SSR / Node 可用）；
        动画实例用 <code>ref.poke()</code> 戳一下、<code>ref.replayStatus()</code> 重播状态。详见 <a href={`${REPO_BLOB}/docs/API.md`} rel='noopener'>API 文档</a>。
      </p>
    </section>
  )
}

function About({ ch }: { ch: Character }) {
  const C = ch.palette
  const swatches: Array<[string, string]> = [['壳体', C.shell], ['脸板', C.face], ['五官', C.ink], ['信号点', C.dot]]
  if (C.mouth !== C.ink) swatches.splice(3, 0, ['嘴', C.mouth])
  const d = designRevision(ch)
  const prev = d.previous
  return (
    <section className='panel about' aria-labelledby='about-title'>
      <h2 id='about-title'>{d.fromSource ? '原画与造型' : '原画、设计修订与造型'}</h2>
      {!d.fromSource && (
        <div className='revision-note' data-design-revision={d.revision}>
          <p>
            <strong>当前是第 {d.revision} 版设计</strong>（{d.date} 修订）。{d.reason!.zh}
            下面的 AI 生图只作为<strong>历史来源</strong>保留，当前成品有意与它不同。
          </p>
          <ul>{d.changes.map((c) => <li key={c.en}>{c.zh}</li>)}</ul>
        </div>
      )}
      <div className={d.fromSource ? 'about-grid' : 'about-grid revised'}>
        {d.fromSource ? (
          <figure className='source'>
            <img src={`/${ch.source.file}`} alt={`${ch.name.en} 的 AI 生图原画`} width={256} height={256} loading='lazy' />
            <figcaption>AI 生图原画（{ch.source.batch} · {ch.source.index}），矢量母版按它重建</figcaption>
          </figure>
        ) : (
          <div className='revision-figs'>
            <figure className='source current'>
              <AvatarStatic character={ch.id} size='100%' title={`${ch.name.en} 当前设计（第 ${d.revision} 版）`} />
              <figcaption><strong>当前设计 · 第 {d.revision} 版</strong></figcaption>
            </figure>
            <figure className='source superseded'>
              <img src={`/${prev!.file}`} alt={`${ch.name.en} 第 ${prev!.revision} 版设计（已替换）`} width={256} height={256} loading='lazy' />
              <figcaption>第 {prev!.revision} 版（按原画重建，已替换）</figcaption>
            </figure>
            <figure className='source original'>
              <img src={`/${ch.source.file}`} alt={`${ch.name.en} 的原始 AI 生图参考`} width={256} height={256} loading='lazy' />
              <figcaption>原始 AI 生图参考（{ch.source.batch} · {ch.source.index}），历史来源，不是当前成品</figcaption>
            </figure>
          </div>
        )}
        <div>
          <p className='prose'>{ch.form}</p>
          <ul className='swatches' aria-label='调色'>
            {swatches.map(([n, c]) => (
              <li key={n}><span style={{ background: c }} aria-hidden='true' />{n} <code>{c}</code></li>
            ))}
          </ul>
          <dl className='meta'>
            <dt>稳定 id</dt><dd><code>{ch.id}</code></dd>
            <dt>设计版本</dt><dd>{d.fromSource ? '第 1 版（按原画重建）' : `第 ${d.revision} 版（${d.date}，有意偏离原画）`}</dd>
            <dt>{d.fromSource ? '来源' : '原画来源'}</dt><dd><code>{ch.source.file}</code></dd>
            <dt>{d.fromSource ? 'sha256' : '原画 sha256'}</dt><dd><code className='hash'>{ch.source.sha256}</code></dd>
            {prev && (
              <>
                <dt>第 {prev.revision} 版</dt><dd><code>{prev.file}</code></dd>
              </>
            )}
          </dl>
          {ch.cleanup.length > 0 && (
            <>
              <p className='muted small'>重建时克制清理的生图瑕疵：</p>
              <ul className='cleanup'>{ch.cleanup.map((c) => <li key={c}>{c}</li>)}</ul>
            </>
          )}
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
      </header>

      <div className='play'>
        <Stage ch={ch} replayKey={replayKey} />
        <Controls ch={ch} onReplay={() => setReplayKey((k) => k + 1)} />
      </div>

      <TriCompare ch={ch} replayKey={replayKey} />
      <EmotionGrid ch={ch} />
      <Downloads ch={ch} />
      <UseInReact ch={ch} />
      <About ch={ch} />
      <Strip ch={ch} search={qs} />
      <p className='disclaimer'>这是 UI 角色组件与业务状态的展示：表情、状态都是视觉演示，不连接任何真实 Agent 或个人任务。</p>
    </article>
  )
}
