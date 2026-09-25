// A deliberately small Markdown dialect for the stories in ./stories/*.md.
// Front matter (`key: value` lines between `---`) + blank-line separated
// blocks. Inline: **strong**, *em*, [text](/path). A few directives:
//
//   ::scene jojo:curious o18:smug | caption      one or two characters, static
//   ::video jojo-builds-home                     click-to-load film (see media.ts)
//   ::still jojo-builds-home avatar | caption    a still from a film
//   ***                                          scene break
//
// It parses to plain data (no HTML strings), so the renderer never needs
// dangerouslySetInnerHTML and a story can't inject markup.

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'em'; v: string }
  | { t: 'strong'; v: string }
  | { t: 'link'; v: string; href: string }

export interface Cast { id: string; emotion: string }

export type Block =
  | { type: 'p'; inline: Inline[] }
  | { type: 'scene'; cast: Cast[]; caption?: string }
  | { type: 'video'; media: string }
  | { type: 'still'; media: string; still: string; caption?: string }
  | { type: 'break' }

export interface ParsedDoc { meta: Record<string, string>; blocks: Block[] }

export function parseInline(src: string): Inline[] {
  const out: Inline[] = []
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/g
  let last = 0
  for (const m of src.matchAll(re)) {
    if (m.index > last) out.push({ t: 'text', v: src.slice(last, m.index) })
    if (m[1]) out.push({ t: 'strong', v: m[1] })
    else if (m[2]) out.push({ t: 'em', v: m[2] })
    else out.push({ t: 'link', v: m[3], href: m[4] })
    last = m.index + m[0].length
  }
  if (last < src.length) out.push({ t: 'text', v: src.slice(last) })
  return out
}

function splitCaption(rest: string): [string, string | undefined] {
  const i = rest.indexOf('|')
  return i < 0 ? [rest.trim(), undefined] : [rest.slice(0, i).trim(), rest.slice(i + 1).trim() || undefined]
}

function parseBlock(chunk: string): Block {
  const text = chunk.trim()
  if (text === '***') return { type: 'break' }
  const d = /^::(\w+)\s+([^\n]*)$/.exec(text)
  if (d) {
    const [head, caption] = splitCaption(d[2])
    const args = head.split(/\s+/).filter(Boolean)
    if (d[1] === 'scene') {
      const cast = args.map((a) => {
        const [id, emotion = 'calm'] = a.split(':')
        return { id, emotion }
      })
      return { type: 'scene', cast, caption }
    }
    if (d[1] === 'video' && args.length === 1) return { type: 'video', media: args[0] }
    if (d[1] === 'still' && args.length === 2) return { type: 'still', media: args[0], still: args[1], caption }
    throw new Error(`unknown story directive: ${text}`)
  }
  // soft line breaks inside a paragraph join without a space (Chinese prose)
  return { type: 'p', inline: parseInline(text.split('\n').map((l) => l.trim()).join('')) }
}

export function parseDoc(src: string): ParsedDoc {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(src.replace(/\r\n/g, '\n'))
  if (!m) throw new Error('story is missing its front matter (--- … ---)')
  const meta: Record<string, string> = {}
  for (const line of m[1].split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const i = line.indexOf(':')
    if (i < 0) throw new Error(`bad front matter line: ${line}`)
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  const blocks = m[2].split(/\n\s*\n/).filter((c) => c.trim()).map(parseBlock)
  return { meta, blocks }
}

/** Plain text of a paragraph, for search snippets and tests. */
export const plain = (inline: Inline[]) => inline.map((n) => n.v).join('')
