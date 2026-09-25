import { useMemo, useState } from 'react'
import {
  Avatar, AvatarStatic, CHARACTER_LIST, EMOTIONS, EMOTION_IDS, STATUS_IDS,
  type Character, type EmotionId,
} from '../../library'
import { Framed } from '../parts'
import { Link, navigate } from '../router'

/** The two who live in the house get a small tag in the directory. */
const RESIDENT: Record<string, string> = { jojo: '住在这里', o18: '住在这里' }

const pad = (n: number) => String(n).padStart(2, '0')

export function matches(c: Character, q: string) {
  const s = q.trim().toLowerCase().replace(/^no\.?\s*|^#/, '')
  if (!s) return true
  if (/^\d+$/.test(s)) return c.no === Number(s)
  return c.id.includes(s) || c.name.en.toLowerCase().includes(s) || c.name.zh.includes(q.trim())
}

/** Everyone together, like a class photo: all static except Jojo in the front row. */
function FamilyPhoto() {
  const rows = [CHARACTER_LIST.slice(17, 26), CHARACTER_LIST.slice(8, 17), CHARACTER_LIST.slice(1, 8)]
  return (
    <div className='photo' role='group' aria-label='26 位角色合影'>
      {rows.map((row, r) => (
        <div className={`photo-row r${r}`} key={r}>
          {row.map((c, i) => (
            <Link key={c.id} to={`/c/${c.id}`} className='photo-member' style={{ ['--i' as string]: i }} title={`No.${pad(c.no)} ${c.name.en} ${c.name.zh}`}>
              <AvatarStatic character={c.id} size='100%' decorative />
            </Link>
          ))}
          {r === 2 && (
            <Link to='/c/jojo' className='photo-member lead' title='No.01 Jojo'>
              <Avatar character='jojo' size='100%' title='Jojo：平静' />
            </Link>
          )}
        </div>
      ))}
    </div>
  )
}

function Card({ c }: { c: Character }) {
  const [hot, setHot] = useState(false)
  return (
    <li className='card'>
      <Link
        to={`/c/${c.id}`}
        className='card-link'
        onPointerEnter={() => setHot(true)}
        onPointerLeave={() => setHot(false)}
        onFocus={() => setHot(true)}
        onBlur={() => setHot(false)}
        aria-label={`No.${pad(c.no)} ${c.name.en}（${c.name.zh}）：${c.persona.zh}`}
      >
        <span className='card-no'>No.{pad(c.no)}</span>
        <Framed id={c.id} className='card-art'>
          <Avatar character={c.id} emotion={hot ? 'happy' : 'calm'} motion='transitions' size='100%' decorative />
        </Framed>
        {RESIDENT[c.id] && <span className='card-tag'>{RESIDENT[c.id]}</span>}
        <span className='card-name'>
          <span className='en'>{c.name.en}</span>
          <span className='zh'>{c.name.zh}</span>
        </span>
        <span className='card-persona'>{c.persona.zh}</span>
      </Link>
    </li>
  )
}

const SHOW: EmotionId[] = ['happy', 'surprised', 'sleepy', 'cry']

export default function Play() {
  const [q, setQ] = useState('')
  const [show, setShow] = useState<EmotionId>('happy')
  const list = useMemo(() => CHARACTER_LIST.filter((c) => matches(c, q)), [q])

  return (
    <>
      <section className='hero wrap play-hero'>
        <div className='hero-copy'>
          <p className='kicker'>Play · 一起玩</p>
          <h1 className='page-title'>一起玩</h1>
          <p className='page-lead'>
            Jojo 的家族一共 {CHARACTER_LIST.length} 位。点开任意一位，换表情、换状态，或者戳它一下。
          </p>
          <ul className='facts' aria-label='家族一览'>
            <li><b>{CHARACTER_LIST.length}</b> 位角色</li>
            <li><b>{EMOTION_IDS.length}</b> 种表情</li>
            <li><b>{STATUS_IDS.length}</b> 种状态</li>
          </ul>
          <p className='hero-note'>
            住在小家里的是 <Link to='/friends#jojo'>Jojo</Link> 和 <Link to='/friends#filo'>夹夹</Link>；其他角色目前只是造型和表情，没有在做事。
          </p>
        </div>
        <FamilyPhoto />
      </section>

      <section className='wrap directory' aria-labelledby='dir-title'>
        <div className='section-head'>
          <h2 id='dir-title'>挑一位 <span className='en-sub'>Directory</span></h2>
          <form
            className='search'
            role='search'
            onSubmit={(e) => {
              e.preventDefault()
              if (list.length === 1) navigate(`/c/${list[0].id}`)
            }}
          >
            <label htmlFor='q'>查找角色</label>
            <input
              id='q'
              type='search'
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='名字、编号或 id，例如 Mochi、麻薯、12'
              autoComplete='off'
            />
          </form>
        </div>
        <p className='count' aria-live='polite'>{q ? `找到 ${list.length} 位` : '按编号排列。指上去，它会笑一下。'}</p>
        {list.length ? (
          <ul className='cards'>
            {list.map((c) => <Card key={c.id} c={c} />)}
          </ul>
        ) : (
          <p className='empty'>没有找到“{q}”。试试名字的一部分，或 1–26 的编号。</p>
        )}
      </section>

      <section className='wrap samefeel' aria-labelledby='same-title'>
        <div className='section-head'>
          <h2 id='same-title'>同一种表情，二十六张不同的脸</h2>
          <div className='chips' role='group' aria-label='选择表情'>
            {SHOW.map((e) => (
              <button key={e} type='button' className='chip' aria-pressed={show === e} onClick={() => setShow(e)}>
                {EMOTIONS[e].label}
              </button>
            ))}
          </div>
        </div>
        <p className='prose'>
          表情是一份共享的“姿态协议”：每位角色用自己的眼睛、嘴和脸板去演同一个情绪。圆点眼会整体放大，竖排眼依旧竖着排，
          斜切的脸板和侧边的缺口都保持原样；所以换角色不是换颜色，而是换一张脸。
        </p>
        <ul className='strip'>
          {CHARACTER_LIST.map((c) => (
            <li key={c.id}>
              <Link to={`/c/${c.id}?e=${show}`} title={`${c.name.en}：${EMOTIONS[show].label}`}>
                <Framed id={c.id}>
                  <AvatarStatic character={c.id} emotion={show} size='100%' intensity={0.8} decorative />
                </Framed>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <nav className='wrap back-links' aria-label='回到小家'>
        <Link to='/stories'>← 回去读故事</Link>
        <Link to='/friends'>认识住在这里的伙伴 →</Link>
      </nav>
    </>
  )
}
