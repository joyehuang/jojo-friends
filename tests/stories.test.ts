import { describe, expect, it } from 'vitest'
import { CHARACTERS } from '../src/library'
import { parseDoc, parseInline, plain, type Block } from '../src/site/content/markdown'

const text = (b: Block) => (b.type === 'p' ? plain(b.inline) : '')
import { KINDS, parseStory, STORIES } from '../src/site/content/stories'

const doc = (front: string, body = '正文。') => `---\n${front}\n---\n\n${body}\n`
const FRONT = ['id: a-story', 'no: 9', 'title: 标题', 'excerpt: 摘要', 'kind: original', 'date: 2026-09-26', 'cast: jojo', 'cover: scene jojo:happy', 'basis: 编的。'].join('\n')

describe('story format', () => {
  it('parses front matter, paragraphs, directives and breaks', () => {
    const d = parseDoc(doc('id: x\ntitle: T', '第一段\n接着写。\n\n::scene jojo:happy o18:smug | 两位\n\n***\n\n::video jojo-builds-home'))
    expect(d.meta).toEqual({ id: 'x', title: 'T' })
    expect(d.blocks.map((b) => b.type)).toEqual(['p', 'scene', 'break', 'video'])
    expect(text(d.blocks[0])).toBe('第一段接着写。')
    expect(d.blocks[1]).toEqual({ type: 'scene', cast: [{ id: 'jojo', emotion: 'happy' }, { id: 'o18', emotion: 'smug' }], caption: '两位' })
  })

  it('inline marks become data, never HTML', () => {
    expect(parseInline('a **b** *c* [d](/e) <script>')).toEqual([
      { t: 'text', v: 'a ' }, { t: 'strong', v: 'b' }, { t: 'text', v: ' ' }, { t: 'em', v: 'c' }, { t: 'text', v: ' ' },
      { t: 'link', v: 'd', href: '/e' }, { t: 'text', v: ' <script>' },
    ])
  })

  it('rejects stories that would break the site or blur fact and fiction', () => {
    expect(() => parseStory(doc(FRONT))).not.toThrow()
    expect(() => parseStory(doc(FRONT.replace('kind: original', 'kind: diary')))).toThrow(/kind/)
    expect(() => parseStory(doc(FRONT.replace('basis: 编的。\n', '').replace('\nbasis: 编的。', '')))).toThrow(/basis/)
    expect(() => parseStory(doc(FRONT.replace('cast: jojo', 'cast: nobody')))).toThrow(/unknown character/)
    expect(() => parseStory(doc(FRONT, '::scene jojo:ecstatic'))).toThrow(/unknown emotion/)
    expect(() => parseStory(doc(FRONT, '::video not-a-film'))).toThrow(/unknown film/)
    expect(() => parseStory(doc(FRONT, '::iframe https://x'))).toThrow(/directive/)
    expect(() => parseStory(doc(FRONT.replace('id: a-story', 'id: A Story')))).toThrow(/id/)
  })
})

describe('the first stories', () => {
  it('three short stories: two shared (acted out), one original', () => {
    expect(STORIES.map((s) => [s.id, s.kind])).toEqual([
      ['filo-picks-a-face', 'shared'],
      ['door-404', 'original'],
      ['jojo-builds-a-home', 'shared'],
    ])
    for (const s of STORIES) {
      const body = s.blocks.map(text).join('')
      expect(body.length, s.id).toBeGreaterThan(300)
      expect(body.length, s.id).toBeLessThan(1500)
      for (const id of s.cast) expect(CHARACTERS[id], id).toBeTruthy()
    }
  })

  it('every shared story says what is real and that the rest is acted out', () => {
    for (const s of STORIES.filter((x) => x.kind === 'shared')) expect(s.basis, s.id).toMatch(/演绎/)
    for (const s of STORIES.filter((x) => x.kind === 'original')) expect(s.basis, s.id).toMatch(/原创|编的/)
    expect(Object.keys(KINDS)).toEqual(['shared', 'original'])
  })

  it('the film story plays the real film from the existing media host, on request', () => {
    const s = STORIES.find((x) => x.id === 'jojo-builds-a-home')!
    expect(s.happened).toBe('2026-09-24')
    expect(s.blocks.some((b) => b.type === 'video')).toBe(true)
    expect(s.cover).toEqual({ type: 'film', media: 'jojo-builds-home' })
  })

  it('no private details: emails, account numbers, local paths, chat platforms or unowned domains', () => {
    const all = JSON.stringify(STORIES)
    expect(all).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i)
    expect(all).not.toMatch(/\d{6,}/)
    expect(all).not.toMatch(/\/Users\/|~\/|private-exports/)
    expect(all).not.toMatch(/QQ|Telegram|微信|飞书|群聊|群里/i)
    expect(all).not.toMatch(/jojo\.house/i)
  })
})
