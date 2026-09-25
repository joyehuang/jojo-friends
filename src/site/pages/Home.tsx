import { useMemo, useState } from 'react'
import {
  Avatar, AvatarStatic, CHARACTER_LIST, EMOTIONS, EMOTION_IDS, STATUS_IDS,
  type Character, type EmotionId,
} from '../../library'
import { Link, navigate } from '../router'

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
        <span className='card-art'>
          <Avatar character={c.id} emotion={hot ? 'happy' : 'calm'} motion='transitions' size='100%' decorative />
        </span>
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

export function Home() {
  const [q, setQ] = useState('')
  const [show, setShow] = useState<EmotionId>('happy')
  const list = useMemo(() => CHARACTER_LIST.filter((c) => matches(c, q)), [q])

  return (
    <>
      <section className='hero wrap'>
        <div className='hero-copy'>
          <p className='eyebrow'>A family of 26 characters · 26 位角色的家族</p>
          <h1 className='display'>
            Jojo <em>&amp;</em> Friends
          </h1>
          <p className='lead'>
            同一个家族的 26 位小伙伴。每一位都有自己的壳体、脸板、五官和那道托着信号点的缺口，
            又共用同一套表情与业务状态：会专注、会得意、会困、会委屈到嚎啕，也会告诉你“正在处理”“等你回复”“已完成”。
          </p>
          <ul className='facts' aria-label='家族一览'>
            <li><b>{CHARACTER_LIST.length}</b> 位角色</li>
            <li><b>{EMOTION_IDS.length}</b> 种表情</li>
            <li><b>{STATUS_IDS.length}</b> 种业务状态</li>
          </ul>
          <p className='hero-note'>这里是 Joye 个人角色 IP 的展厅，不连接任何真实 Agent 或任务；点开任意一位即可试玩全部表情与状态。</p>
        </div>
        <FamilyPhoto />
      </section>

      <section className='wrap directory' aria-labelledby='dir-title'>
        <div className='section-head'>
          <h2 id='dir-title'>角色目录 <span className='en-sub'>Directory</span></h2>
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
        <p className='count' aria-live='polite'>{q ? `找到 ${list.length} 位` : '按编号排列，悬停或聚焦时会笑一下。'}</p>
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
                <AvatarStatic character={c.id} emotion={show} size='100%' intensity={0.8} decorative />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
