import { CHARACTERS, isEmotionId, type EmotionId } from '../../library'
import { FILMS } from './media'
import { parseDoc, type Block, type Cast } from './markdown'

/**
 * Every story says which kind it is, at the top of the page and in lists.
 * "shared" stories start from something that really happened with Joye;
 * "original" ones are made up. Neither kind is a log of a real agent.
 */
export const KINDS = {
  shared: {
    label: '共同经历 · 演绎',
    note: '以真实发生过的事为底本；细节、心理和对话是演绎。',
  },
  original: {
    label: '原创小故事',
    note: '编的，没有对应的真实事件。',
  },
} as const
export type StoryKind = keyof typeof KINDS

export type Cover = { type: 'film'; media: string } | { type: 'scene'; cast: Array<{ id: string; emotion: EmotionId }> }

export interface Story {
  id: string
  no: number
  title: string
  excerpt: string
  kind: StoryKind
  /** when the story was written (YYYY-MM-DD) */
  date: string
  /** when the real event happened, if known (shared stories only) */
  happened?: string
  /** character ids, most important first */
  cast: string[]
  cover: Cover
  /** what is real and what is made up, in one paragraph */
  basis: string
  blocks: Block[]
}

const DATE = /^\d{4}-\d{2}-\d{2}$/
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function checkCast(where: string, cast: Cast[]) {
  for (const c of cast) {
    if (!CHARACTERS[c.id]) throw new Error(`${where}: unknown character "${c.id}"`)
    if (!isEmotionId(c.emotion)) throw new Error(`${where}: unknown emotion "${c.emotion}"`)
  }
}

export function parseStory(src: string, file = 'story'): Story {
  const { meta, blocks } = parseDoc(src)
  const need = (k: string) => {
    const v = meta[k]
    if (!v) throw new Error(`${file}: front matter is missing "${k}"`)
    return v
  }
  const id = need('id')
  if (!ID.test(id)) throw new Error(`${file}: id "${id}" must be lowercase-with-dashes`)
  const kind = need('kind')
  if (!(kind in KINDS)) throw new Error(`${file}: kind must be one of ${Object.keys(KINDS).join(', ')}`)
  const date = need('date')
  if (!DATE.test(date)) throw new Error(`${file}: date must be YYYY-MM-DD`)
  const happened = meta.happened
  if (happened && !DATE.test(happened)) throw new Error(`${file}: happened must be YYYY-MM-DD`)
  const cast = need('cast').split(',').map((s) => s.trim()).filter(Boolean)
  checkCast(file, cast.map((id) => ({ id, emotion: 'calm' })))

  const [coverType, ...coverArgs] = need('cover').split(/\s+/)
  let cover: Cover
  if (coverType === 'film' && FILMS[coverArgs[0]]) cover = { type: 'film', media: coverArgs[0] }
  else if (coverType === 'scene' && coverArgs.length) {
    const c = coverArgs.map((a) => {
      const [cid, emotion = 'calm'] = a.split(':')
      return { id: cid, emotion }
    })
    checkCast(`${file} cover`, c)
    cover = { type: 'scene', cast: c as Array<{ id: string; emotion: EmotionId }> }
  } else throw new Error(`${file}: cover must be "film <media>" or "scene <id:emotion> …"`)

  for (const b of blocks) {
    if (b.type === 'scene') checkCast(file, b.cast)
    if ((b.type === 'video' || b.type === 'still') && !FILMS[b.media]) throw new Error(`${file}: unknown film "${b.media}"`)
    if (b.type === 'still' && !FILMS[b.media].stills[b.still]) throw new Error(`${file}: unknown still "${b.still}"`)
  }

  const no = Number(need('no'))
  if (!Number.isInteger(no) || no < 1) throw new Error(`${file}: no must be a positive integer`)
  return {
    id, no, kind: kind as StoryKind, date, happened, cast, cover, blocks,
    title: need('title'), excerpt: need('excerpt'), basis: need('basis'),
  }
}

const files = import.meta.glob('./stories/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

/** Newest first (by story number). */
export const STORIES: Story[] = Object.entries(files)
  .map(([file, src]) => parseStory(src, file))
  .sort((a, b) => b.no - a.no)

{
  const seen = new Set<string>()
  const nos = new Set<number>()
  for (const s of STORIES) {
    if (seen.has(s.id)) throw new Error(`duplicate story id "${s.id}"`)
    if (nos.has(s.no)) throw new Error(`duplicate story no ${s.no}`)
    seen.add(s.id)
    nos.add(s.no)
  }
}

export const getStory = (id: string) => STORIES.find((s) => s.id === id)

/** Older and newer neighbours, for the pager at the end of a story. */
export function neighbours(s: Story) {
  const i = STORIES.indexOf(s)
  return { newer: STORIES[i - 1], older: STORIES[i + 1] }
}

const cn = (d: string) => {
  const [y, m, day] = d.split('-').map(Number)
  return `${y} 年 ${m} 月 ${day} 日`
}
export const formatDate = cn
export const shortDate = (d: string) => {
  const [, m, day] = d.split('-').map(Number)
  return `${m} 月 ${day} 日`
}
