import { KINDS, STORIES, type StoryKind } from '../content/stories'
import { KindStamp, StoryCard } from '../parts'

export default function Stories() {
  return (
    <div className='wrap page'>
      <header className='page-head'>
        <p className='kicker'>Stories · 故事</p>
        <h1 className='page-title'>家里的故事</h1>
        <p className='page-lead'>发生过的事，和几篇编的。一共 {STORIES.length} 篇，新的在前面。</p>
        <ul className='kinds' aria-label='两种故事'>
          {(Object.keys(KINDS) as StoryKind[]).map((k) => (
            <li key={k}>
              <KindStamp kind={k} />
              <span>{KINDS[k].note}</span>
            </li>
          ))}
        </ul>
      </header>
      <ol className='story-list'>
        {STORIES.map((s) => (
          <li key={s.id}>
            <StoryCard story={s} level={2} />
          </li>
        ))}
      </ol>
      <p className='page-foot'>故事里的伙伴会说话、会想事情，那是写故事的方式，不是真实的 Agent 日志或聊天记录。</p>
    </div>
  )
}
