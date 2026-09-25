// @joyehuang/jojo-web/static — Node/build-time entry: SVG strings for
// server-rendered, zero-JS placements. Jojo is rendered live from the approved
// geometry; the few family members a site may show are pre-rendered at package
// build time (see scripts/build-web.ts), so their specs and geometry are not in
// this package — only the finished SVGs.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { resolveConfig, type JojoOptions } from '../library/config'
import { staticFrame } from '../library/engine'
import { JojoSvg, makeIds } from '../library/JojoSvg'
import { FRIEND_SVGS, FRIEND_PLACEHOLDER, FRIEND_SIZE } from './friends.generated'

export { EMOTION_IDS } from '../library/emotions'
export type { EmotionId } from '../library/emotions'

export interface StaticJojoOptions extends Omit<JojoOptions, 'character' | 'motion' | 'gaze'> {
  /** required: page-unique prefix for clipPath/gradient ids */
  idPrefix: string
  gaze?: JojoOptions['gaze']
  decorative?: boolean
  title?: string
  className?: string
}

const cleanPrefix = (p: string) => {
  const c = p.replace(/[^a-zA-Z0-9_-]/g, '')
  if (!c) throw new Error('[jojo-web] idPrefix must contain at least one of [a-zA-Z0-9_-]')
  return c
}

/** One static pose of the approved Jojo as an inline `<svg>` string. */
export function renderJojoSvg({ idPrefix, decorative, title, className, ...o }: StaticJojoOptions): string {
  const cfg = resolveConfig({ ...o, motion: 'static' }, true)
  return renderToStaticMarkup(
    createElement(JojoSvg, {
      frame: staticFrame(cfg),
      cfg,
      ids: makeIds(cleanPrefix(idPrefix)),
      decorative,
      title,
      className,
      legacy: true,
    }),
  )
}

export type FriendId = keyof typeof FRIEND_SVGS

export const FRIENDS = Object.values(FRIEND_SVGS).map(({ id, name, persona }) => ({ id, name, persona }))
export const FRIEND_RENDER_SIZE = FRIEND_SIZE

/** A pre-rendered family member (calm, static) as an inline `<svg>` string. */
export function renderFriendSvg(id: FriendId, { idPrefix, title, decorative }: { idPrefix: string; title?: string; decorative?: boolean }): string {
  const f = FRIEND_SVGS[id]
  if (!f) throw new Error(`[jojo-web] friend "${String(id)}" is not in this package`)
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  let svg = f.svg.split(FRIEND_PLACEHOLDER).join(cleanPrefix(idPrefix))
  // pre-rendered decorative; swap in a name when the caller wants one
  if (!decorative) svg = svg.replace('aria-hidden="true"', `role="img" aria-label="${esc(title ?? f.name.en)}"`)
  return svg
}
