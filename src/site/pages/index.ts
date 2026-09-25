import type { ComponentType } from 'react'
import type { PageKind } from '../routes'

/**
 * Each page is its own chunk, so the home page doesn't ship the play controls
 * or the story reader. The client loads the current page before hydrating;
 * the prerenderer registers them all up front (entry-server.tsx).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Page = ComponentType<any>
const LOADERS: Record<PageKind, () => Promise<{ default: Page }>> = {
  home: () => import('./Home'),
  stories: () => import('./Stories'),
  story: () => import('./StoryPage'),
  friends: () => import('./Friends'),
  play: () => import('./Play'),
  character: () => import('./CharacterPage'),
  about: () => import('./About'),
  notfound: () => import('./NotFound'),
}

const loaded = new Map<PageKind, Page>()

export function loadPage(kind: PageKind): Promise<Page> {
  const hit = loaded.get(kind)
  if (hit) return Promise.resolve(hit)
  return LOADERS[kind]().then((m) => {
    loaded.set(kind, m.default)
    return m.default
  })
}

export const loadedPage = (kind: PageKind) => loaded.get(kind)

export function registerPages(pages: Record<PageKind, Page>) {
  for (const [k, v] of Object.entries(pages)) loaded.set(k as PageKind, v)
}
