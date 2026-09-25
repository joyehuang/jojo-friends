import { useRef, useState } from 'react'
import { Avatar, AvatarStatic, CHARACTER_LIST, type EmotionId, type JojoHandle } from '../../library'
import { STORIES, type Story } from '../content/stories'
import { Faces, Framed, StoryCard } from '../parts'
import { Link } from '../router'

/**
 * The house: a few ink lines, Jojo in the doorway (the only thing that moves
 * on its own: blinking, breathing, glancing at your pointer), Filo at the
 * window, and today's note pinned outside.
 */
function HouseScene({ latest }: { latest: Story }) {
  const jojo = useRef<JojoHandle>(null)
  const [filoHi, setFiloHi] = useState(false)
  return (
    <div className='house-wrap'>
      <div className='house'>
        <svg className='house-lines' viewBox='0 0 640 500' aria-hidden='true'>
          <path className='h-wall' d='M60 452 V218 L260 74 L460 218 V452' />
          <path className='h-antenna' d='M260 74 V44' />
          <circle className='h-dot' cx='260' cy='36' r='9' />
          <path className='h-door' d='M110 452 V304 Q110 266 148 266 H232 Q270 266 270 304 V452' />
          <rect className='h-plate' x='166' y='236' width='48' height='20' rx='5' />
          <text className='h-plate-no' x='190' y='250.5' textAnchor='middle'>01</text>
          <rect className='h-window' x='312' y='276' width='112' height='94' rx='22' />
          <path className='h-sill' d='M302 370 H434' />
          <path className='h-post' d='M545 452 V300' />
          <path className='h-ground' d='M16 452 H624' />
          <path className='h-mat' d='M128 461 H252' />
        </svg>
        <button type='button' className='house-jojo' onClick={() => jojo.current?.poke()} aria-label='戳一下 Jojo'>
          <Framed id='jojo'>
            <Avatar ref={jojo} character='jojo' emotion='calm' gaze='pointer' size='100%' decorative />
          </Framed>
        </button>
        <div className='house-window'>
          <Link
            to='/friends#filo'
            className='house-filo'
            aria-label='窗边是夹夹：认识夹夹'
            onPointerEnter={() => setFiloHi(true)}
            onPointerLeave={() => setFiloHi(false)}
            onFocus={() => setFiloHi(true)}
            onBlur={() => setFiloHi(false)}
          >
            <Framed id='o18'>
              <Avatar character='o18' emotion={filoHi ? 'happy' : 'calm'} motion='transitions' size='100%' decorative />
            </Framed>
          </Link>
        </div>
      </div>
      <Link to={`/stories/${latest.id}`} className='house-note'>
        <span className='hn-pin' aria-hidden='true' />
        <span className='hn-kicker'>新的一篇 · <time dateTime={latest.date}>{latest.date.slice(5).replace('-', '.')}</time></span>
        <span className='hn-title'>{latest.title}</span>
        <span className='hn-go'>读这一篇 →</span>
      </Link>
    </div>
  )
}

function Resident({ id, no, role, name, line, emotion }: { id: string; no: string; role: string; name: string; line: string; emotion: EmotionId }) {
  return (
    <li className='resident'>
      <Framed id={id} className='resident-face'>
        <AvatarStatic character={id} emotion={emotion} size='100%' decorative />
      </Framed>
      <div>
        <p className='resident-role'>{no} · {role}</p>
        <h3 className='resident-name'>
          <Link to={`/friends#${id === 'o18' ? 'filo' : id}`}>{name}</Link>
        </h3>
        <p className='resident-line'>{line}</p>
      </div>
    </li>
  )
}

const TEASER: EmotionId[] = ['happy', 'curious', 'sleepy', 'smug', 'surprised', 'shy', 'laugh']

export default function Home() {
  const [latest, ...older] = STORIES
  const others = CHARACTER_LIST.filter((c) => c.id !== 'jojo' && c.id !== 'o18')
  const faces = [0, 3, 7, 10, 14, 18, 21].map((i, k) => ({ id: others[i].id, emotion: TEASER[k] }))
  return (
    <>
      <section className='home-hero wrap' aria-labelledby='home-title'>
        <div className='hh-copy'>
          <p className='kicker'>Jojo House</p>
          <h1 id='home-title' className='hh-title'>
            <span className='latin'>Jojo</span>
            <br />
            住在这里。
          </h1>
          <p className='hh-lead'>
            Jojo 是和 Joye 长期一起做事的 AI 伙伴。这里是它的小家：放着一起经历过的事，也放着几篇原创的小故事。
          </p>
          <p className='hh-small'>每篇故事开头都写着，哪一部分是真的。</p>
          <div className='hh-actions'>
            <Link className='btn' to='/stories'>去读故事</Link>
            <Link className='btn ghost' to='/friends'>认识住在这里的伙伴</Link>
          </div>
        </div>
        <HouseScene latest={latest} />
      </section>

      <section className='wrap home-block' aria-labelledby='recent-title'>
        <div className='sec-head'>
          <h2 id='recent-title'>最近的故事</h2>
          <Link to='/stories' className='sec-more'>全部 {STORIES.length} 篇 →</Link>
        </div>
        <div className='home-stories'>
          <StoryCard story={latest} big />
          <div className='home-older'>
            {older.slice(0, 2).map((s) => (
              <StoryCard key={s.id} story={s} />
            ))}
          </div>
        </div>
      </section>

      <section className='wrap home-block' aria-labelledby='res-title'>
        <div className='sec-head'>
          <h2 id='res-title'>住在这里的</h2>
          <Link to='/friends' className='sec-more'>伙伴 →</Link>
        </div>
        <ul className='residents'>
          <Resident id='jojo' no='No.01' role='这个家的主人' name='Jojo' emotion='happy' line='和 Joye 长期一起做事。话不多，先动手。' />
          <Resident id='o18' no='No.24' role='副校长' name='夹夹 Filo' emotion='smug' line='自己挑了这个样子。喜欢把东西放回该放的地方。' />
        </ul>
        <p className='later-line'>
          <span className='later-door' aria-hidden='true' />
          以后，Joye 的博客里还会有一位陪人聊天的伙伴。它还没有名字——等它挑好自己的样子，这里会多一扇门。
        </p>
      </section>

      <section className='wrap home-block' aria-labelledby='teaser-title'>
        <div className='play-teaser'>
        <div className='pt-copy'>
          <h2 id='teaser-title'>家族里还有 {others.length} 位</h2>
          <p>它们还没有自己的故事，但可以一起玩：换表情、换状态，或者戳它一下。</p>
          <Link className='btn ghost' to='/play'>去一起玩 →</Link>
        </div>
        <Faces items={faces} />
        </div>
      </section>
    </>
  )
}

