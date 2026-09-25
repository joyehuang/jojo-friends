import { CHARACTER_LIST, EMOTION_LIST, STATUS_LIST } from '../../library'
import { KINDS } from '../content/stories'
import { KindStamp } from '../parts'
import { Link } from '../router'
import { AUTHOR } from '../site-config'

export default function About() {
  return (
    <article className='wrap page about-page'>
      <header className='page-head'>
        <p className='kicker'>About · 关于</p>
        <h1 className='page-title'>关于这个小家</h1>
        <p className='page-lead'>
          这里是 Jojo 的小家，也是 <a href={AUTHOR.url} rel='noopener'>{AUTHOR.name}</a> 的个人角色 IP「Jojo &amp; Friends」住的地方：
          主角 Jojo，和家族里的另外 {CHARACTER_LIST.length - 1} 位。
        </p>
      </header>

      <section className='prose-block' aria-labelledby='what-title'>
        <h2 id='what-title'>这里放什么</h2>
        <ul className='bullets'>
          <li><Link to='/stories'>故事</Link>：和 Joye 一起经历过的事，以及几篇原创小故事。短的，读完一篇大概两三分钟。</li>
          <li><Link to='/friends'>伙伴</Link>：现在住在这里的 Jojo 和夹夹。以后有新伙伴，会在这里多一扇门。</li>
          <li><Link to='/play'>一起玩</Link>：全家族 {CHARACTER_LIST.length} 位角色，每位 {EMOTION_LIST.length} 种表情、{STATUS_LIST.length} 种状态，可以换着看、戳一下，也可以把当前的样子分享给别人。</li>
        </ul>
      </section>

      <section className='prose-block' aria-labelledby='true-title'>
        <h2 id='true-title'>故事里哪些是真的</h2>
        <p>每篇故事开头都有一个标记：</p>
        <ul className='bullets kinds-explain'>
          {(Object.keys(KINDS) as Array<keyof typeof KINDS>).map((k) => (
            <li key={k}><KindStamp kind={k} /> {KINDS[k].note}</li>
          ))}
        </ul>
        <p>
          每篇末尾的“关于这一篇”会写清楚：真实的部分是哪几件事，其余是演绎。故事里的伙伴会说话、会想事情，那是写故事的方式——
          不是真实的 Agent 日志，也不是聊天记录。
        </p>
        <p>
          网站上的角色是画出来的，页面不连着任何真实 Agent、账号或任务；这里没有登录、数据库或统计追踪。
        </p>
      </section>

      <section className='prose-block' aria-labelledby='use-title'>
        <h2 id='use-title'>使用与授权</h2>
        <ul className='bullets'>
          <li>这里是个人角色 IP 的<b>公开展示</b>，不是开源组件库，也不是素材站。</li>
          <li>目前<b>不提供通用使用授权</b>，也不提供源码、矢量母版或素材包下载。</li>
          <li>欢迎分享本站的页面链接。想在别处使用这些角色，或有合作想法，请通过 <a href={AUTHOR.contact} rel='noopener'>{AUTHOR.name} 的联系页面</a>联系。</li>
          <li>为了在浏览器里显示和播放动画，页面会把必要的前端代码和图形下载到你的浏览器；这是网站正常运行的一部分，不代表授予任何使用许可。</li>
        </ul>
      </section>

      <section className='prose-block' aria-labelledby='origin-title'>
        <h2 id='origin-title'>角色从哪里来</h2>
        <p>
          角色最初的造型来自 AI 生图（ChatGPT 图像生成），{AUTHOR.name} 以这些图为起点，把每一位重画成分层矢量角色，
          并为整个家族统一了表情与状态的表现。兜兜、米诺、点点在 2026-09-25 修订为第 2 版设计，让它们在小尺寸下不再与 Jojo、眨眨相像；
          各自的角色页写明了改了什么。
        </p>
        <p>故事里的小动画原片放在 {AUTHOR.name} 自己的媒体空间，只有点开播放时才会加载。字体 Fraunces、IBM Plex Mono 按 SIL OFL 1.1 自托管。</p>
      </section>
    </article>
  )
}
