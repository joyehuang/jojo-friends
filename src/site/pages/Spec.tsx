import { AvatarStatic, CHARACTER_LIST, EMOTION_GROUPS, EMOTION_LIST, STATUS_LIST } from '../../library'
import { Link } from '../router'
import { REPO_BLOB } from '../site-config'

const groups = ['daily', 'bright', 'swing', 'blue'] as const

export function Spec() {
  return (
    <article className='wrap spec'>
      <header className='detail-head'>
        <p className='eyebrow'>Specification · 规范</p>
        <h1 className='display small'>一套规范，二十六张脸</h1>
        <p className='lead'>
          家族里每一位都遵守同一份契约：同样的表情与状态协议、同样的动效时序与生命周期；
          不同的是各自的壳体、脸板、五官锚点、缺口方向和调色。下面是要点，完整文档在仓库的
          <a href={`${REPO_BLOB}/docs/SPEC.md`} rel='noopener'> docs/SPEC.md</a>。
        </p>
      </header>

      <section className='panel'>
        <h2>1 · 角色是一份数据</h2>
        <p className='prose'>
          每位角色是一个 <code>CharacterSpec</code>：在自己原画的像素坐标里量出来的壳体、脸板、两只眼、嘴、信号点和缺口方向，
          外加调色和少量可选提示。<code>buildCharacter()</code> 把它归一化到 Jojo 所在的共享画布（1254 单位，视框 900 / 紧凑 800），
          并求解眉毛、腮红、气泡、进度弧和小尺寸勾号的位置，保证不出脸板、不盖住脸。
        </p>
        <ul className='bullets'>
          <li><b>稳定 id 与显示名分离</b>：<code>jojo</code>、<code>h02</code>…<code>h06</code>、<code>o01</code>…<code>o20</code> 永不改变，改名不影响调用方。</li>
          <li><b>形状是参数化的</b>：圆角多边形（每个顶点可设半径、可内凹）、圆形、带圆角肩的圆形缺口与侧边咬口；没有位图，也没有自动描摹的碎路径。</li>
          <li><b>分层固定</b>：阴影 → 壳体 → 脸板（可裁切到壳体、可悬出、可整体倾斜）→ 腮红 → 眉 / 眼 / 嘴 → 泪 → 状态标识 → 彩屑 / Zzz。</li>
        </ul>
      </section>

      <section className='panel'>
        <h2>2 · 锚点与几何约束</h2>
        <ul className='bullets'>
          <li><b>眼睛</b>是圆头胶囊：<code>w</code> 粗细、<code>h</code> 全长、<code>rot</code> 倾角。圆点眼、横线眼、斜眼、竖排眼都用同一描述。</li>
          <li><b>嘴</b>是胶囊；<code>w = h</code> 即圆点嘴。</li>
          <li><b>信号点</b>坐在缺口里，<code>notchDir</code> 给出缺口朝外的方向（上、左、右或斜向），进度弧、勾号膨胀方向都据此转向。</li>
          <li><b>约束</b>：所有表情 × 力度 × 动画时间 × 视线极值下，眼、嘴、眉、腮红、泪都留在可见脸板内（脸板 ∩ 壳体）；状态标识留在画框内且不碰脸板。</li>
        </ul>
      </section>

      <section className='panel'>
        <h2>3 · 16 种表情</h2>
        <p className='prose'>
          表情写成一份共享姿态（以 Jojo 为单位），再由每位角色的 rig 映射到自己的五官：眼睛保持自己的形状，只取表情的相对变化；
          开心、大笑、庆祝、嚎啕这类需要“变形”的表情，才按该角色的弧线尺寸画成弯弧或 &gt; &lt;。
        </p>
        <div className='spec-emotions'>
          {groups.map((g) => (
            <div key={g}>
              <h3>{EMOTION_GROUPS[g]}</h3>
              <ul>
                {EMOTION_LIST.filter((e) => e.group === g).map((e) => (
                  <li key={e.id}><b>{e.label}</b> <code>{e.id}</code> — {e.cue.replace(/^原图基线：/, '')}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className='panel'>
        <h2>4 · 6 种业务状态</h2>
        <p className='prose'>状态只驱动信号点旁的标识，永远不会自动改表情（出错不会让角色哭）。</p>
        <ul className='bullets'>
          {STATUS_LIST.map((s) => (
            <li key={s.id}><b>{s.label}</b> <code>{s.id}</code> — {s.signal}</li>
          ))}
        </ul>
      </section>

      <section className='panel'>
        <h2>5 · 动效：强度、时序与优先级</h2>
        <ul className='bullets'>
          <li><b>intensity 0–1</b>：0 仍可辨认，1 为完整姿态；弯弧类眼形在任意力度都保持完整形状。</li>
          <li><b>motion</b>：<code>auto</code>（默认，系统减少动态时静止）、<code>full</code>、<code>transitions</code>（只动变化，之后停住并退订）、<code>static</code>。减少动态效果永远优先，即便显式写了 full。</li>
          <li><b>时序</b>：入场 预备 → 动作 → 回稳；循环在其上叠加；表情切换由弹簧过渡，可随时打断，不会堆叠计时器。</li>
          <li><b>优先级与打断</b>：减少动态效果 &gt; motion 设置；表情是弹簧目标，入场、戳一下、循环与呼吸眨眼按此顺序叠加在上面，新的切换随时打断旧的（重新计时，不叠加）。状态是独立的第二通道：工作中只在 full 下循环；等你回复一次提示后静止；已完成播一次后勾号常驻，普通重渲染不重播，只有 <code>replayStatus()</code> 会。</li>
        </ul>
      </section>

      <section className='panel'>
        <h2>6 · 小尺寸、导出、无障碍与性能</h2>
        <ul className='bullets'>
          <li><b>小尺寸</b>：≤ 64px 紧凑取景，≤ 40px 纯色、去高光与细装饰、笔画不细于约 1.4 设备像素；&lt; 56px 不画眉；状态标识在小尺寸加粗放大。</li>
          <li><b>静态导出</b>：<code>&lt;AvatarStatic&gt;</code> 与 <code>renderSvg()</code> 产出和动画首帧一致的 SVG，可用于 SSR、邮件、图标。</li>
          <li><b>无障碍</b>：默认 <code>role="img"</code> 并以文字说出表情和状态；<code>decorative</code> 隐藏；多实例的 SVG defs id 互不冲突。</li>
          <li><b>设计修订有记录</b>：角色若有意偏离原画（目前兜兜、米诺、点点为第 2 版），规格里记下版本、原因、改动和上一版文件；原画不改、只作历史来源，每位角色的完整输出都有指纹测试兜底。</li>
          <li><b>性能</b>：全页共享一个 requestAnimationFrame；离屏（IntersectionObserver）与标签页隐藏时暂停；卸载即清理监听与观察器。</li>
        </ul>
      </section>

      <section className='panel'>
        <h2>7 · 增加一位新角色</h2>
        <ol className='bullets'>
          <li>把原画放进 <code>reference/</code>，用 <code>scripts/ref/measure.ts</code> 量出色块、胶囊与圆角。</li>
          <li>写 <code>src/library/characters/&lt;id&gt;.ts</code>：壳体、脸板、眼、嘴、点、缺口方向、调色。</li>
          <li>用 <code>scripts/ref/check-spec.ts</code> 看原画比对（IoU）、16 表情联系表和所有约束，直到全部通过。</li>
          <li>加入注册表，跑 <code>pnpm test</code>：全家族 × 16 表情 × 6 状态的几何与渲染检查会自动覆盖新角色。</li>
        </ol>
        <p className='prose'>详见 <a href={`${REPO_BLOB}/docs/EXTENDING.md`} rel='noopener'>docs/EXTENDING.md</a>。</p>
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
