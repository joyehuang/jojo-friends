import { useEffect } from 'react'
import { CHARACTERS } from '../library'
import { LookProvider } from './look'
import { CharacterPage } from './pages/CharacterPage'
import { Home } from './pages/Home'
import { NotFound } from './pages/NotFound'
import { Spec } from './pages/Spec'
import { Link, useLocation } from './router'
import { REPO_URL } from './site-config'

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
        <Link to='/spec' aria-current={on('/spec')}>规范</Link>
        <a href={REPO_URL} rel='noopener'>GitHub</a>
      </nav>
    </header>
  )
}

function Footer() {
  return (
    <footer className='foot'>
      <p>
        <strong>Jojo &amp; Friends</strong> 是一组 UI 角色组件与业务状态的公开展示：表情和状态只是视觉表达，本站
        <strong>不连接任何真实 Agent、账号或个人任务</strong>，也没有登录、数据库或统计追踪。
      </p>
      <p>
        角色原画由 AI 生图（ChatGPT 图像生成）得到，再按原画逐一重建为分层矢量（兜兜、米诺、点点之后修订为第 2 版设计，原画仅作历史来源）；代码公开可阅（UNLICENSED），
        角色形象的使用授权尚待确认，未做商标检索。字体 Fraunces、IBM Plex Mono 按 SIL OFL 1.1 自托管。
      </p>
      <p className='foot-links'>
        <Link to='/spec'>角色与动效规范</Link>
        <a href={REPO_URL} rel='noopener'>源代码</a>
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
      : path === '/spec' ? '规范 · Jojo & Friends' : 'Jojo & Friends · 26 位 UI 角色家族'
  }, [ch, path])

  let page
  if (path === '/' || path === '') page = <Home />
  else if (path === '/spec' || path === '/spec/') page = <Spec />
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
