import { AvatarStatic } from '../../library'
import { Framed } from '../parts'
import { Link } from '../router'

/** The same door as in the story 《404 号房门》. */
export default function NotFound() {
  return (
    <section className='wrap notfound'>
      <Framed id='jojo' className='nf-face'>
        <AvatarStatic character='jojo' emotion='puzzled' size='100%' title='Jojo：疑惑' />
      </Framed>
      <p className='kicker'>404 号房门</p>
      <h1 className='page-title'>这里还没有房间</h1>
      <p className='page-lead'>地址可能打错了一个字母，或者这个页面已经不在了。门上贴着一张纸：</p>
      <p className='nf-note'>“回走廊往左是故事，往右是伙伴。”</p>
      <p className='nf-links'>
        <Link to='/stories' className='btn'>← 故事</Link>
        <Link to='/' className='btn ghost'>回到小家</Link>
        <Link to='/friends' className='btn'>伙伴 →</Link>
      </p>
      <p className='nf-more'>这扇门有一个<Link to='/stories/door-404'>小故事</Link>。</p>
    </section>
  )
}
