import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AvatarStatic, type AvatarStaticProps } from './Jojo'

export interface RenderOptions extends AvatarStaticProps {
  /** prepend `<?xml …?>` so the string can be saved as a .svg file (default true) */
  xmlDeclaration?: boolean
}

/**
 * A standalone SVG document for one pose of any character — the same markup
 * `<AvatarStatic>` renders. Works in Node and in the browser.
 */
export function renderSvg({ xmlDeclaration = true, ...props }: RenderOptions = {}) {
  const svg = renderToStaticMarkup(createElement(AvatarStatic, props))
  return (xmlDeclaration ? '<?xml version="1.0" encoding="UTF-8"?>\n' : '') + svg
}
