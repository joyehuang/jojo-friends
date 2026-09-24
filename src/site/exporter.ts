import { renderSvg, type RenderOptions } from '../library/render'

/** Standalone SVG document for the current pose (the same markup AvatarStatic renders). */
export function poseSvg(opts: RenderOptions) {
  return renderSvg({ size: 512, ...opts, xmlDeclaration: true })
}
