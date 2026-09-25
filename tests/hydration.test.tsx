// Prerendered HTML must hydrate without a mismatch: render each kind of page
// the way the build does, put it in the document, hydrate it like main.tsx.
import { act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { StrictMode } from 'react'
import { describe, expect, it } from 'vitest'
import { App } from '../src/site/App'
import About from '../src/site/pages/About'
import CharacterPage from '../src/site/pages/CharacterPage'
import Friends from '../src/site/pages/Friends'
import Home from '../src/site/pages/Home'
import NotFound from '../src/site/pages/NotFound'
import Play from '../src/site/pages/Play'
import Stories from '../src/site/pages/Stories'
import StoryPage from '../src/site/pages/StoryPage'
import { registerPages } from '../src/site/pages'
import { setServerUrl } from '../src/site/router'

registerPages({ home: Home, stories: Stories, story: StoryPage, friends: Friends, play: Play, character: CharacterPage, about: About, notfound: NotFound })
const tree = () => <StrictMode><App /></StrictMode>

describe('hydration', () => {
  it.each(['/', '/stories', '/stories/jojo-builds-a-home', '/stories/door-404', '/friends', '/play', '/c/o18', '/about'])('%s hydrates the prerendered markup without a mismatch', async (path) => {
    // jsdom has no matchMedia; the library treats that as "no reduced-motion preference"
    history.replaceState(null, '', path)
    setServerUrl(path)
    const root = document.createElement('div')
    root.innerHTML = renderToString(tree())
    document.body.replaceChildren(root)
    const errors: unknown[] = []
    const origError = console.error
    console.error = (...a: unknown[]) => errors.push(a)
    try {
      await act(async () => {
        hydrateRoot(root, tree(), { onRecoverableError: (e) => errors.push(e) })
      })
    } finally {
      console.error = origError
    }
    expect(errors).toEqual([])
    expect(root.querySelector('main')?.textContent?.length).toBeGreaterThan(20)
  })
})
