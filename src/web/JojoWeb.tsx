import { useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type Ref } from 'react'
import { usePrefersReducedMotion, type JojoHandle } from '../library/Jojo'
import { resolveConfig, type JojoOptions } from '../library/config'
import { JojoEngine, staticFrame } from '../library/engine'
import { JojoSvg, makeIds } from '../library/JojoSvg'

export interface JojoWebProps extends Omit<JojoOptions, 'character'> {
  /**
   * Prefix for the SVG's clipPath/gradient ids. React's `useId` is unique only
   * inside one React root; a page can hold several roots (islands) plus
   * build-time static SVGs, so callers pass a page-unique prefix as well.
   */
  idPrefix?: string
  decorative?: boolean
  title?: string
  className?: string
  style?: CSSProperties
  ref?: Ref<JojoHandle>
}

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

function hashSeed(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * The approved Jojo (legacy markup, byte-identical art) with an id prefix.
 * Same engine and lifecycle as the library's `<Jojo>`: React renders the
 * first frame once, a shared-rAF engine animates it, paused off-screen, in
 * hidden tabs and whenever motion is static; `transitions` holds still
 * between changes, so an idle Jojo costs no frames.
 */
export function JojoWeb({ idPrefix = '', decorative, title, className, style, ref, ...options }: JojoWebProps) {
  const reduced = usePrefersReducedMotion()
  const { emotion, status, intensity, motion, gaze, size, shadow, brows, framing, flat } = options
  const gazeKey = typeof gaze === 'object' && gaze ? `${gaze.x},${gaze.y}` : gaze
  const cfg = useMemo(
    () => resolveConfig({ emotion, status, intensity, motion, gaze, size, shadow, brows, framing, flat }, reduced),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [emotion, status, intensity, motion, gazeKey, size, shadow, brows, framing, flat, reduced],
  )
  const rawId = useId()
  const ids = useMemo(() => makeIds(`${idPrefix}${rawId}`), [idPrefix, rawId])
  const [initial] = useState(() => staticFrame(cfg))
  const svgRef = useRef<SVGSVGElement>(null)
  const engineRef = useRef<JojoEngine | null>(null)
  const cfgRef = useRef(cfg)
  cfgRef.current = cfg

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const engine = new JojoEngine(svg, cfgRef.current, hashSeed(`${idPrefix}${rawId}`))
    engineRef.current = engine
    let io: IntersectionObserver | undefined
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          const e = entries[entries.length - 1]
          if (e) engine.setVisible(e.isIntersecting)
        },
        { rootMargin: '64px' },
      )
      io.observe(svg)
    }
    return () => {
      io?.disconnect()
      engine.destroy()
      engineRef.current = null
    }
  }, [idPrefix, rawId])

  useIsoLayoutEffect(() => {
    engineRef.current?.update(cfg)
  }, [cfg])

  useImperativeHandle(
    ref,
    () => ({ poke: () => engineRef.current?.poke(), replayStatus: () => engineRef.current?.replayStatus() }),
    [],
  )

  return (
    <JojoSvg
      svgRef={svgRef}
      frame={initial}
      cfg={cfg}
      ids={ids}
      decorative={decorative}
      title={title}
      className={className}
      style={style}
      legacy
    />
  )
}
