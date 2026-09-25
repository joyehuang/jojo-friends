import { useEffect } from 'react'
import { CHARACTERS } from '../library'
import { LookProvider } from './look'
import { CharacterPage } from './pages/CharacterPage'
import { Home } from './pages/Home'
import { About } from './pages/About'
import { NotFound } from './pages/NotFound'
import { Link, navigate, useLocation } from './router'
import { AUTHOR } from './site-config'

function Header({ path }: { path: string }) {
  const on = (p: string) => (path === p || (p === '/' && path.startsWith('/c/')) ? 'page' : undefined)
  return (
    <header className='top'>
      <Link to='/' className='wordmark' aria-label='Jojo & Friends 首页'>
        <span className='wm-jojo'>Jojo</span>
        <span className='wm-amp'>&amp;</span>
        <span className='wm-friends'>Friends</span>
      </Link>
      <nav aria-label='主导航'>
        <Link to='/' aria-current={on('/')}>角色</Link>
        <Link to='/about' aria-current={on('/about')}>关于</Link>
      </nav>
    </header>
  )
}

function Footer() {
  return (
    <footer className='foot'>
      <p>
        <strong>Jojo &amp; Friends</strong> 是 <a href={AUTHOR.url} rel='noopener'>{AUTHOR.name}</a> 的个人角色 IP 公开展示。欢迎浏览、试玩和分享角色页面；
        目前不提供通用使用授权，也不提供素材或源码下载。
      </p>
      <p>
        表情和状态只是视觉表达，本站<strong>不连接任何真实 Agent、账号或个人任务</strong>，也没有登录、数据库或统计追踪。
        字体 Fraunces、IBM Plex Mono 按 SIL OFL 1.1 自托管。
      </p>
      <p className='foot-links'>
        <Link to='/about'>关于与使用授权</Link>
        <a href={AUTHOR.contact} rel='noopener'>联系 {AUTHOR.name}</a>
      </p>
    </footer>
  )
}

export function App() {
  const { path } = useLocation()
  const m = /^\/c\/([a-z0-9-]+)\/?$/.exec(path)
  const ch = m ? CHARACTERS[m[1]] : undefined

  useEffect(() => {
    document.title = ch
      ? `${ch.name.en} ${ch.name.zh} · Jojo & Friends`
      : path === '/about' ? '关于 · Jojo & Friends' : 'Jojo & Friends · 26 位角色的家族'
  }, [ch, path])

  // the old /spec page is now /about (the host redirects too; this covers in-app history)
  useEffect(() => {
    if (path === '/spec' || path === '/spec/') navigate('/about', { replace: true })
  }, [path])

  let page
  if (path === '/' || path === '') page = <Home />
  else if (path === '/about' || path === '/about/') page = <About />
  else if (ch) page = <CharacterPage key='character' character={ch} />
  else page = <NotFound />

  return (
    <LookProvider>
      <a className='skip' href='#main'>跳到正文</a>
      <Header path={path} />
      <main id='main'>{page}</main>
      <Footer />
    </LookProvider>
  )
}
