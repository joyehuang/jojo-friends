import { CHARACTERS, CHARACTER_LIST, type Character } from '../library'
import { getStory, STORIES, KINDS, type Story } from './content/stories'

export const SITE_NAME = 'Jojo 的小家'
export const SITE_NAME_EN = 'Jojo House'

/** Every page the site has. Anything else is a real 404 (on the host too). */
export type Route =
  | { kind: 'home' }
  | { kind: 'stories' }
  | { kind: 'story'; story: Story }
  | { kind: 'friends' }
  | { kind: 'play' }
  | { kind: 'character'; character: Character }
  | { kind: 'about' }
  | { kind: 'notfound' }

export type PageKind = Route['kind']

export function matchRoute(pathname: string): Route {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (p === '' || p === '/') return { kind: 'home' }
  if (p === '/stories') return { kind: 'stories' }
  if (p === '/friends') return { kind: 'friends' }
  if (p === '/play') return { kind: 'play' }
  if (p === '/about') return { kind: 'about' }
  let m = /^\/stories\/([a-z0-9-]+)$/.exec(p)
  if (m) {
    const story = getStory(m[1])
    return story ? { kind: 'story', story } : { kind: 'notfound' }
  }
  m = /^\/c\/([a-z0-9-]+)$/.exec(p)
  if (m && CHARACTERS[m[1]]) return { kind: 'character', character: CHARACTERS[m[1]] }
  return { kind: 'notfound' }
}

export interface PageMeta {
  title: string
  description: string
  /** site-relative path of the share image, if the page has its own */
  image?: string
  type: 'website' | 'article'
}

const DEFAULT_DESC = 'Jojo 是和 Joye 长期一起做事的 AI 伙伴。这是它的小家：放着一起经历过的事、几篇原创小故事，和可以一起玩的 26 位角色。'

export function routeMeta(r: Route): PageMeta {
  switch (r.kind) {
    case 'home':
      return { title: `${SITE_NAME} · ${SITE_NAME_EN}`, description: DEFAULT_DESC, image: '/og/home.png', type: 'website' }
    case 'stories':
      return { title: `故事 · ${SITE_NAME}`, description: `家里发生过的事，和几篇编的。一共 ${STORIES.length} 篇，每篇开头都标着它是哪一种。`, image: '/og/home.png', type: 'website' }
    case 'story':
      return {
        title: `${r.story.title} · ${SITE_NAME}`,
        description: `${KINDS[r.story.kind].label}｜${r.story.excerpt}`,
        image: `/og/${r.story.id}.png`,
        type: 'article',
      }
    case 'friends':
      return { title: `伙伴 · ${SITE_NAME}`, description: '住在这里的两位伙伴：Jojo，和自己挑了样子的夹夹（Filo）。', image: '/og/home.png', type: 'website' }
    case 'play':
      return { title: `一起玩 · ${SITE_NAME}`, description: `Jojo 的家族一共 ${CHARACTER_LIST.length} 位。点开任意一位，换表情、换状态，或者戳它一下。`, image: '/og/home.png', type: 'website' }
    case 'character': {
      const c = r.character
      return { title: `${c.name.en} ${c.name.zh} · 一起玩 · ${SITE_NAME}`, description: `${c.name.en}（${c.name.zh}）：${c.persona.zh} 在这里可以试玩它的 16 种表情和 6 种状态。`, image: '/og/home.png', type: 'website' }
    }
    case 'about':
      return { title: `关于 · ${SITE_NAME}`, description: '这个小家是什么、故事里哪些是真的，以及角色的使用与授权。', image: '/og/home.png', type: 'website' }
    case 'notfound':
      return { title: `找不到这个页面 · ${SITE_NAME}`, description: '这里还没有房间。', type: 'website' }
  }
}

/** Every path the build prerenders to its own HTML file. */
export function prerenderPaths(): string[] {
  return [
    '/', '/stories', '/friends', '/play', '/about',
    ...STORIES.map((s) => `/stories/${s.id}`),
    ...CHARACTER_LIST.map((c) => `/c/${c.id}`),
  ]
}
