import { AvatarStatic } from '../../library'
import { Link } from '../router'

export function NotFound() {
  return (
    <section className='wrap notfound'>
      <AvatarStatic character='jojo' emotion='puzzled' size={160} title='Jojo：疑惑' />
      <h1>这里没有这位角色</h1>
      <p>链接里的角色编号不存在。回到目录看看 26 位小伙伴吧。</p>
      <Link to='/' className='btn'>返回角色目录</Link>
    </section>
  )
}
