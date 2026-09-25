import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AvatarStatic, CHARACTERS, EMOTIONS, type EmotionId } from '../library'
import { FILMS } from './content/media'
import type { Inline } from './content/markdown'
import { KINDS, shortDate, type Cover, type Story, type StoryKind } from './content/stories'
import { framePlacement } from './avatar-frame'
import { Link } from './router'

/**
 * A square box whose avatar is centred on the character itself (shell, plate
 * and signal dot — not the shadow) and sized like every other character; see
 * avatar-frame.ts. The offset is constant per character, so a live <Avatar>
 * inside still moves exactly as the library animates it.
 */
export function Framed({ id, fill = 1, className = '', children }: { id: string; fill?: number; className?: string; children: ReactNode }) {
  const p = framePlacement(CHARACTERS[id], fill)
  return (
    <span className={`framed ${className}`}>
      <span className='framed-in' style={{ left: `${p.left}%`, top: `${p.top}%`, width: `${p.width}%` }}>{children}</span>
    </span>
  )
}

/** The two names a character goes by, e.g. "夹夹 Filo" or just "Jojo". */
export function displayName(id: string) {
  const c = CHARACTERS[id]
  return c.name.zh === c.name.en ? c.name.en : `${c.name.zh} ${c.name.en}`
}

export function KindStamp({ kind }: { kind: StoryKind }) {
  return <span className={`stamp stamp-${kind}`}>{KINDS[kind].label}</span>
}

/** Characters standing together on a little stage; static, so reading is quiet. */
export function SceneStage({ cast, className = '' }: { cast: Array<{ id: string; emotion: string }>; className?: string }) {
  const label = cast.map((c) => `${displayName(c.id)}：${EMOTIONS[c.emotion as EmotionId].label}`).join('；')
  return (
    <div className={`scene-stage n${cast.length} ${className}`} role='img' aria-label={label}>
      {cast.map((c, i) => (
        <Framed className='scene-actor' key={i} id={c.id}>
          <AvatarStatic character={c.id} emotion={c.emotion as EmotionId} intensity={0.85} size='100%' decorative />
        </Framed>
      ))}
    </div>
  )
}

export function StoryCover({ cover, className = '' }: { cover: Cover; className?: string }) {
  if (cover.type === 'film') {
    const f = FILMS[cover.media]
    return (
      <span className={`cover cover-film ${className}`}>
        <img src={f.poster} alt='' width={960} height={540} loading='lazy' decoding='async' />
        <span className='cover-badge' aria-hidden='true'>▶ {f.duration}</span>
      </span>
    )
  }
  return (
    <span className={`cover cover-scene ${className}`}>
      <SceneStage cast={cover.cast} />
    </span>
  )
}

/** One story in a list: the heading carries the link; the whole card is clickable. */
export function StoryCard({ story, level = 3, big = false }: { story: Story; level?: 2 | 3; big?: boolean }) {
  const H = level === 2 ? 'h2' : 'h3'
  return (
    <article className={`story-card${big ? ' big' : ''}`}>
      <StoryCover cover={story.cover} />
      <div className='sc-body'>
        <p className='sc-meta'>
          <span className='sc-no' aria-hidden='true'>{String(story.no).padStart(2, '0')}</span>
          <KindStamp kind={story.kind} />
          <time dateTime={story.date}>{shortDate(story.date)}</time>
        </p>
        <H className='sc-title'>
          <Link to={`/stories/${story.id}`} className='sc-link'>{story.title}</Link>
        </H>
        <p className='sc-excerpt'>{story.excerpt}</p>
      </div>
    </article>
  )
}

export function InlineText({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        if (n.t === 'em') return <em key={i}>{n.v}</em>
        if (n.t === 'strong') return <strong key={i}>{n.v}</strong>
        if (n.t === 'link') return n.href.startsWith('/') ? <Link key={i} to={n.href}>{n.v}</Link> : <a key={i} href={n.href} rel='noopener'>{n.v}</a>
        return n.v
      })}
    </>
  )
}

/**
 * A film that costs nothing until the reader asks for it: poster + play
 * button first, the real <video> (and its ~11 MB file) only after a click.
 */
export function FilmPlayer({ media }: { media: string }) {
  const f = FILMS[media]
  const [on, setOn] = useState(false)
  const video = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (on) video.current?.focus()
  }, [on])
  return (
    <figure className='film'>
      <div className='film-frame' style={{ aspectRatio: `${f.width} / ${f.height}` }}>
        {on ? (
          <video
            ref={video}
            src={f.src}
            poster={f.poster}
            controls
            autoPlay
            playsInline
            preload='auto'
            width={f.width}
            height={f.height}
            aria-label={f.label}
          />
        ) : (
          <button type='button' className='film-start' onClick={() => setOn(true)} aria-label={`播放${f.label}（约 ${f.size}，点击后才开始加载）`}>
            <img src={f.poster} alt='' width={960} height={540} loading='lazy' decoding='async' />
            <span className='film-play' aria-hidden='true'>
              <span className='film-tri' />
              播放原片 · {f.duration}
            </span>
          </button>
        )}
      </div>
      <figcaption>
        原片：{f.label}。{on ? '' : `点开才会加载（约 ${f.size}）。`}
      </figcaption>
    </figure>
  )
}

/** Small row of face tiles used as quiet decoration next to a link. */
export function Faces({ items }: { items: Array<{ id: string; emotion: EmotionId }> }) {
  return (
    <ul className='faces' aria-hidden='true'>
      {items.map((it) => (
        <li key={it.id}>
          <Framed id={it.id}>
            <AvatarStatic character={it.id} emotion={it.emotion} size='100%' decorative />
          </Framed>
        </li>
      ))}
    </ul>
  )
}
