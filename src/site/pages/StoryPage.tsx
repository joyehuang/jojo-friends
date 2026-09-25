import { CHARACTERS } from '../../library'
import { FILMS } from '../content/media'
import { formatDate, KINDS, neighbours, type Story } from '../content/stories'
import { displayName, FilmPlayer, Framed, InlineText, KindStamp, SceneStage } from '../parts'
import { AvatarStatic } from '../../library'
import { Link } from '../router'

function Body({ story }: { story: Story }) {
  return (
    <div className='story-body'>
      {story.blocks.map((b, i) => {
        switch (b.type) {
          case 'p':
            return <p key={i}><InlineText nodes={b.inline} /></p>
          case 'break':
            return <hr key={i} className='story-break' />
          case 'scene':
            return (
              <figure key={i} className='scene'>
                <SceneStage cast={b.cast} />
                {b.caption && <figcaption>{b.caption}</figcaption>}
              </figure>
            )
          case 'still': {
            const f = FILMS[b.media]
            return (
              <figure key={i} className='still'>
                <img src={f.stills[b.still]} alt={b.caption ?? ''} width={960} height={540} loading='lazy' decoding='async' />
                {b.caption && <figcaption>{b.caption}</figcaption>}
              </figure>
            )
          }
          case 'video':
            return <FilmPlayer key={i} media={b.media} />
        }
      })}
    </div>
  )
}

export default function StoryPage({ story }: { story: Story }) {
  const { newer, older } = neighbours(story)
  return (
    <article className='wrap story'>
      <nav className='crumbs' aria-label='位置'>
        <Link to='/stories'>← 全部故事</Link>
      </nav>
      <header className='story-head'>
        <p className='story-meta'>
          <KindStamp kind={story.kind} />
          <span>第 {story.no} 篇</span>
          <time dateTime={story.date}>写于 {formatDate(story.date)}</time>
        </p>
        <h1 className='story-title'>{story.title}</h1>
        <p className='story-dek'>{story.excerpt}</p>
        <ul className='cast' aria-label='出场'>
          {story.cast.map((id) => (
            <li key={id}>
              <Framed id={id} className='cast-face'>
                <AvatarStatic character={id} size='100%' decorative />
              </Framed>
              <span>{displayName(id)}</span>
            </li>
          ))}
        </ul>
      </header>

      <Body story={story} />

      <aside className='basis' aria-labelledby='basis-title'>
        <h2 id='basis-title'>关于这一篇 <span className='basis-kind'>{KINDS[story.kind].label}</span></h2>
        <p>{story.basis}</p>
        {story.happened && <p className='basis-date'>真实事件的日期：{formatDate(story.happened)}</p>}
        {story.cast.includes('jojo') || story.cast.includes('o18') ? (
          <p className='basis-more'>
            {story.cast.filter((id) => id === 'jojo' || id === 'o18').map((id, i) => (
              <span key={id}>{i > 0 && ' · '}<Link to={`/friends#${id === 'o18' ? 'filo' : id}`}>认识{CHARACTERS[id].name.zh === 'Jojo' ? ' Jojo' : CHARACTERS[id].name.zh}</Link></span>
            ))}
          </p>
        ) : null}
      </aside>

      <nav className='story-pager' aria-label='上一篇和下一篇'>
        {older ? (
          <Link to={`/stories/${older.id}`} className='sp-prev'>
            <span className='sp-label'>← 前一篇</span>
            <span className='sp-title'>{older.title}</span>
          </Link>
        ) : <span />}
        {newer ? (
          <Link to={`/stories/${newer.id}`} className='sp-next'>
            <span className='sp-label'>后一篇 →</span>
            <span className='sp-title'>{newer.title}</span>
          </Link>
        ) : <span />}
      </nav>
    </article>
  )
}
