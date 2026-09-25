// Build-time only: renders each page to HTML (scripts/prerender.ts). Never
// shipped to the browser — the public-build check rejects a bundled server
// renderer.
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { App } from './App'
import About from './pages/About'
import CharacterPage from './pages/CharacterPage'
import Friends from './pages/Friends'
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Play from './pages/Play'
import Stories from './pages/Stories'
import StoryPage from './pages/StoryPage'
import { registerPages } from './pages'
import { setServerUrl } from './router'
import { matchRoute, prerenderPaths, routeMeta } from './routes'

registerPages({ home: Home, stories: Stories, story: StoryPage, friends: Friends, play: Play, character: CharacterPage, about: About, notfound: NotFound })

export function render(path: string) {
  setServerUrl(path)
  const route = matchRoute(path)
  const html = renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  return { html, meta: routeMeta(route), kind: route.kind }
}

export { prerenderPaths }
export { STORIES } from './content/stories'
