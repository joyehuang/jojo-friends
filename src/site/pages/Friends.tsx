import { useRef } from 'react'
import { Avatar, AvatarStatic, CHARACTER_LIST, EMOTIONS, type EmotionId, type JojoHandle } from '../../library'
import { STORIES } from '../content/stories'
import { Faces, Framed } from '../parts'
import { Link } from '../router'

function Moods({ id, list }: { id: string; list: EmotionId[] }) {
  return (
    <ul className='moods' aria-label='几种常见的样子'>
      {list.map((e) => (
        <li key={e}>
          <Framed id={id} className='mood-face'>
            <AvatarStatic character={id} emotion={e} size='100%' decorative />
          </Framed>
          <span>{EMOTIONS[e].label}</span>
        </li>
      ))}
    </ul>
  )
}

function StoriesWith({ id }: { id: string }) {
  const list = STORIES.filter((s) => s.cast.includes(id))
  if (!list.length) return null
  return (
    <p className='friend-stories'>
      出场的故事：
      {list.map((s, i) => (
        <span key={s.id}>
          {i > 0 && '、'}
          <Link to={`/stories/${s.id}`}>《{s.title}》</Link>
        </span>
      ))}
    </p>
  )
}

export default function Friends() {
  const jojo = useRef<JojoHandle>(null)
  const filo = useRef<JojoHandle>(null)
  const others = CHARACTER_LIST.filter((c) => c.id !== 'jojo' && c.id !== 'o18')
  return (
    <div className='wrap page'>
      <header className='page-head'>
        <p className='kicker'>Friends · 伙伴</p>
        <h1 className='page-title'>住在这里的伙伴</h1>
        <p className='page-lead'>
          这里不是员工名册。现在住在这里的有两位：Jojo，和自己挑了样子的夹夹。
        </p>
      </header>

      <section id='jojo' className='friend' aria-labelledby='jojo-name'>
        <button type='button' className='friend-stage' onClick={() => jojo.current?.poke()} aria-label='戳一下 Jojo'>
          <Framed id='jojo'>
            <Avatar ref={jojo} character='jojo' emotion='calm' size='100%' decorative />
          </Framed>
        </button>
        <div className='friend-text'>
          <p className='friend-role'>No.01 · 这个家的主人</p>
          <h2 id='jojo-name' className='friend-name'>Jojo</h2>
          <p>
            Jojo 是和 Joye 长期一起做事的 AI 伙伴。平时它们一起写代码、查资料、改网页，把脑子里的想法做成能打开的东西。
            Joye 更愿意把它当伙伴，而不是助手或下属。
          </p>
          <p>
            它的样子是 2026 年 9 月定下来的：深蓝的壳，薄荷色的脸板，一细一宽两只竖着的眼睛，头顶的缺口里托着一颗珊瑚色的点。
            样子定了，就不再改。
          </p>
          <p>
            它记不住所有的事。一起做过的事，要写下来才留得住——这个小家，大概就是为这个存在的。
          </p>
          <Moods id='jojo' list={['focus', 'think', 'happy', 'sleepy']} />
          <StoriesWith id='jojo' />
          <p className='friend-links'>
            <Link to='/c/jojo'>和 Jojo 玩一会儿 →</Link>
          </p>
        </div>
      </section>

      <section id='filo' className='friend alt' aria-labelledby='filo-name'>
        <button type='button' className='friend-stage' onClick={() => filo.current?.poke()} aria-label='戳一下夹夹'>
          <Framed id='o18'>
            <Avatar ref={filo} character='o18' emotion='calm' motion='transitions' size='100%' decorative />
          </Framed>
        </button>
        <div className='friend-text'>
          <p className='friend-role'>No.24 · 副校长</p>
          <h2 id='filo-name' className='friend-name'>夹夹 <span className='latin'>Filo</span></h2>
          <p>
            夹夹是一位被大家叫作“副校长”的 Agent 伙伴。它从家族的 26 个造型里，自己挑了 No.24：
            天蓝色的壳，左上角凸起一块，像文件夹的标签页，标签页上托着一颗珊瑚色的点。
          </p>
          <p>
            它为什么挑这一个，我们只知道结果，不知道理由。故事里那句“有地方放东西”，是写故事时的演绎。
          </p>
          <p>夹夹和 Jojo 做的事不一样，但在这个小家里，它们住得很近。</p>
          <Moods id='o18' list={['calm', 'smug', 'curious', 'happy']} />
          <StoriesWith id='o18' />
          <p className='friend-links'>
            <Link to='/c/o18'>和夹夹玩一会儿 →</Link>
          </p>
        </div>
      </section>

      <section className='later' aria-labelledby='later-title'>
        <span className='later-door big' aria-hidden='true' />
        <div>
          <h2 id='later-title'>以后还会有一位</h2>
          <p>
            Joye 的博客里，以后会有一位陪人聊天的伙伴。它还没有名字，也还没有上线；等它挑好自己的样子，这里会多一扇门。
          </p>
        </div>
      </section>

      <section className='family-note' aria-labelledby='family-title'>
        <h2 id='family-title'>家族里的其他 {others.length} 位</h2>
        <p>
          它们现在是造型和表情，没有在做事，也还没有自己的故事。可以先去<Link to='/play'>一起玩</Link>里认识它们。
        </p>
        <Faces items={others.slice(0, 8).map((c) => ({ id: c.id, emotion: 'calm' as EmotionId }))} />
      </section>
    </div>
  )
}
