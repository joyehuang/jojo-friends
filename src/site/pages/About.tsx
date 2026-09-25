import { AvatarStatic, CHARACTER_LIST, EMOTION_GROUPS, EMOTION_LIST, STATUS_LIST } from '../../library'
import { Link } from '../router'
import { AUTHOR } from '../site-config'

const groups = ['daily', 'bright', 'swing', 'blue'] as const

export function About() {
  return (
    <article className='wrap spec'>
      <header className='detail-head'>
        <p className='eyebrow'>About · 关于</p>
        <h1 className='display small'>关于 Jojo &amp; Friends</h1>
        <p className='lead'>
          Jojo &amp; Friends 是 <a href={AUTHOR.url} rel='noopener'>{AUTHOR.name}</a> 的个人角色 IP：主角 Jojo 和 25 位同伴，一共 {CHARACTER_LIST.length} 位。
          每一位都有自己的壳体、脸板、五官和托着信号点的缺口，又共用同一套表情和状态。这个网站是它们的公开展厅。
        </p>
      </header>

      <section className='panel' aria-labelledby='use-title'>
        <h2 id='use-title'>使用与授权</h2>
        <ul className='bullets'>
          <li>这里是个人角色 IP 的<b>公开展示</b>，不是开源组件库，也不是素材站。</li>
          <li>目前<b>不提供通用使用授权</b>，也不提供源码、矢量母版或素材包下载。</li>
          <li>欢迎分享本站的页面链接。想在别处使用这些角色，或有合作想法，请通过 <a href={AUTHOR.contact} rel='noopener'>{AUTHOR.name} 的联系页面</a>联系。</li>
          <li>为了在浏览器里显示和播放动画，页面会把必要的前端代码和图形下载到你的浏览器；这是网站正常运行的一部分，不代表授予任何使用许可。</li>
        </ul>
      </section>

      <section className='panel' aria-labelledby='play-title'>
        <h2 id='play-title'>在这里可以做什么</h2>
        <ul className='bullets'>
          <li><b>认识每一位</b>：在<Link to='/'>角色目录</Link>里按名字或编号查找，每位都有自己的名字和个性。</li>
          <li><b>试玩</b>：点开任意一位，切换 {EMOTION_LIST.length} 种表情和 {STATUS_LIST.length} 种状态，调力度、尺寸、背景和动效，或点一下角色“戳一下”。</li>
          <li><b>分享</b>：角色页的地址会记住当前的表情和状态，复制链接发给别人，对方打开就能看到同一个样子。</li>
          <li><b>无障碍</b>：屏幕阅读器会读出角色当前的表情和状态；系统开启“减少动态效果”时，角色默认保持静止。</li>
        </ul>
      </section>

      <section className='panel' aria-labelledby='emo-title'>
        <h2 id='emo-title'>{EMOTION_LIST.length} 种表情</h2>
        <p className='prose'>
          每位角色用自己的眼睛、嘴和脸板去演同一种情绪：圆点眼会整体放大，竖排眼依旧竖着排，斜切的脸板和侧边的缺口都保持原样。
          所以换角色不是换颜色，而是换一张脸。
        </p>
        <div className='spec-emotions'>
          {groups.map((g) => (
            <div key={g}>
              <h3>{EMOTION_GROUPS[g]}</h3>
              <ul>
                {EMOTION_LIST.filter((e) => e.group === g).map((e) => (
                  <li key={e.id}><b>{e.label}</b> — {e.cue.replace(/^原图基线：/, '')}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className='panel' aria-labelledby='status-title'>
        <h2 id='status-title'>{STATUS_LIST.length} 种状态</h2>
        <p className='prose'>状态只改变信号点旁的小标识，不会改变表情：出错了，角色也不会因此哭起来。</p>
        <ul className='bullets'>
          {STATUS_LIST.map((s) => (
            <li key={s.id}><b>{s.label}</b> — {s.signal}</li>
          ))}
        </ul>
      </section>

      <section className='panel' aria-labelledby='origin-title'>
        <h2 id='origin-title'>角色从哪里来</h2>
        <p className='prose'>
          角色最初的造型来自 AI 生图（ChatGPT 图像生成），{AUTHOR.name} 以这些图为起点，把每一位重画成分层矢量角色，
          并为整个家族统一了表情与状态的表现。兜兜、米诺、点点在 2026-09-25 修订为第 2 版设计，让它们在小尺寸下不再与 Jojo、眨眨相像；
          各自的角色页写明了改了什么。
        </p>
      </section>

      <section className='panel spec-family'>
        <h2>全家福</h2>
        <ul className='strip'>
          {CHARACTER_LIST.map((c) => (
            <li key={c.id}>
              <Link to={`/c/${c.id}`} title={`${c.name.en} ${c.name.zh}`}>
                <AvatarStatic character={c.id} size='100%' decorative />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}
