import { useEffect, useReducer, useRef } from 'react'
import { AvatarStatic } from '../library'
import { LookProvider } from './look'
import { loadedPage, loadPage } from './pages'
import { Framed } from './parts'
import { Link, navCount, navigate, takePendingScroll, useLocation } from './router'
import { matchRoute, routeMeta, SITE_NAME, type Route } from './routes'
import { AUTHOR } from './site-config'

const NAV: Array<{ to: string; label: string; on: (r: Route) => boolean }> = [
  { to: '/stories', label: '故事', on: (r) => r.kind === 'stories' || r.kind === 'story' },
  { to: '/friends', label: '伙伴', on: (r) => r.kind === 'friends' },
  { to: '/play', label: '一起玩', on: (r) => r.kind === 'play' || r.kind === 'character' },
  { to: '/about', label: '关于', on: (r) => r.kind === 'about' },
]

function Header({ route }: { route: Route }) {
  return (
    <header className='top'>
      <Link to='/' className='wordmark' aria-label={`${SITE_NAME}：首页`} aria-current={route.kind === 'home' ? 'page' : undefined}>
        <Framed id='jojo' className='wm-face'>
          <AvatarStatic character='jojo' size='100%' flat shadow={false} decorative />
        </Framed>
        <span className='wm-text'>
          <span className='wm-zh'>Jojo 的小家</span>
          <span className='wm-en'>Jojo House</span>
        </span>
      </Link>
      <nav aria-label='主导航'>
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} aria-current={n.on(route) ? 'page' : undefined}>{n.label}</Link>
        ))}
      </nav>
    </header>
  )
}

function Footer() {
  return (
    <footer className='foot'>
      <div className='foot-inner'>
        <p>
          <strong>Jojo 的小家</strong>。Jojo 和它的伙伴们是 <a href={AUTHOR.url} rel='noopener'>{AUTHOR.name}</a> 的个人角色 IP。
          故事分“共同经历 · 演绎”和“原创小故事”两种，每篇开头都标着。
        </p>
        <p>
          网站上的角色是画出来的，页面不连着任何真实 Agent、账号或任务；没有登录、数据库或统计追踪。
          不提供素材或源码下载。
        </p>
        <p className='foot-links'>
          <Link to='/about'>关于与使用授权</Link>
          <a href={AUTHOR.contact} rel='noopener'>联系 {AUTHOR.name}</a>
        </p>
      </div>
    </footer>
  )
}

function pageElement(route: Route, Page: NonNullable<ReturnType<typeof loadedPage>>) {
  if (route.kind === 'story') return <Page key={route.story.id} story={route.story} />
  if (route.kind === 'character') return <Page key='character' character={route.character} />
  return <Page key={route.kind} />
}

export function App() {
  const { path, hash } = useLocation()
  const route = matchRoute(path)
  const [, bump] = useReducer((n: number) => n + 1, 0)
  const shown = useRef<{ route: Route; path: string; nav: number } | null>(null)
  const Page = loadedPage(route.kind)

  // a page whose chunk isn't here yet: load it, keep showing the old page meanwhile
  useEffect(() => {
    if (Page) return
    let live = true
    loadPage(route.kind).then(() => live && bump(), () => location.reload())
    return () => {
      live = false
    }
  }, [Page, route.kind])

  const current = Page ? { route, path, nav: navCount() } : shown.current
  const CurrentPage = current ? loadedPage(current.route.kind) : undefined
  useEffect(() => {
    if (Page) shown.current = current
  })

  // title + description follow the page
  const meta = routeMeta(current?.route ?? route)
  useEffect(() => {
    document.title = meta.title
    document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description)
  }, [meta.title, meta.description])

  // the old /spec page is now /about (the host redirects too; this covers in-app history)
  useEffect(() => {
    if (path === '/spec' || path === '/spec/') navigate('/about', { replace: true })
  }, [path])

  // after an in-app navigation: bring the reader to the new page, its #anchor,
  // or (back / forward) back to where they were
  const first = useRef(true)
  const renderedNav = current?.nav
  useEffect(() => {
    const p = takePendingScroll()
    // (the first render uses the prerendered URL, which has no #hash: read it live)
    const h = hash || (typeof location !== 'undefined' ? location.hash : '')
    const anchor = h ? document.getElementById(decodeURIComponent(h.slice(1))) : null
    if (first.current) {
      first.current = false
      anchor?.scrollIntoView()
      return
    }
    if (p === null) return
    if (typeof p === 'number') window.scrollTo(0, p)
    else if (anchor) anchor.scrollIntoView({ block: 'start' })
    else window.scrollTo(0, 0)
    document.getElementById('main')?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderedNav])

  return (
    <LookProvider>
      <a className='skip' href='#main'>跳到正文</a>
      <Header route={current?.route ?? route} />
      <main id='main' tabIndex={-1}>{current && CurrentPage ? pageElement(current.route, CurrentPage) : null}</main>
      <Footer />
    </LookProvider>
  )
}
