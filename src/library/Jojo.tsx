import {
  useEffect, useId, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore,
  type CSSProperties, type Ref,
} from 'react'
import { resolveConfig, type JojoOptions } from './config'
import { JojoEngine, staticFrame } from './engine'
import { JojoSvg, makeIds } from './JojoSvg'

export interface JojoHandle {
  /** short tap reaction (visual only); ignored when motion is static */
  poke(): void
  /** play the current status' one-shot entry again (e.g. another “done”); ignored when static */
  replayStatus(): void
}

export interface JojoProps extends JojoOptions {
  /** hide from assistive tech; put the meaning in adjacent text instead */
  decorative?: boolean
  /** accessible name override (default: “Jojo：<表情>，状态：<状态>”) */
  title?: string
  className?: string
  style?: CSSProperties
  ref?: Ref<JojoHandle>
}

const REDUCED = '(prefers-reduced-motion: reduce)'

// layout effect in the browser so a newly mounted status shape is written
// before paint; plain effect on the server (no warning)
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

function subscribeReduced(cb: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia(REDUCED)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

/** Live `prefers-reduced-motion`; `false` on the server. */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReduced,
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(REDUCED).matches : false),
    () => false,
  )
}

function hashSeed(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

function useConfig(props: JojoOptions) {
  const reduced = usePrefersReducedMotion()
  const { character, emotion, status, intensity, motion, gaze, size, shadow, brows, framing, flat } = props
  const gazeKey = typeof gaze === 'object' && gaze ? `${gaze.x},${gaze.y}` : gaze
  return useMemo(
    () => resolveConfig({ character, emotion, status, intensity, motion, gaze, size, shadow, brows, framing, flat }, reduced),
    // gaze objects are compared by value
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [character, emotion, status, intensity, motion, gazeKey, size, shadow, brows, framing, flat, reduced],
  )
}

interface InternalProps extends JojoProps {
  legacy?: boolean
}

function AnimatedAvatar({ decorative, title, className, style, ref, legacy, ...options }: InternalProps) {
  const cfg = useConfig(options)
  const rawId = useId()
  const ids = useMemo(() => makeIds(rawId), [rawId])
  // first frame only: later frames are written by the engine, so React never
  // re-applies stale attributes over a running animation
  const [initial] = useState(() => staticFrame(cfg))
  const svgRef = useRef<SVGSVGElement>(null)
  const engineRef = useRef<JojoEngine | null>(null)
  const cfgRef = useRef(cfg)
  cfgRef.current = cfg

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const engine = new JojoEngine(svg, cfgRef.current, hashSeed(rawId))
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
  }, [rawId])

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
      legacy={legacy}
    />
  )
}

/**
 * Any family member, animated. React renders the markup once; a small engine
 * (shared rAF, paused off-screen / in hidden tabs / when static) animates it
 * directly. Switching `character` keeps the current expression and status.
 */
export function Avatar(props: AvatarProps) {
  return <AnimatedAvatar {...props} />
}

/**
 * The approved Jojo component, unchanged: same props, same markup as the
 * signed-off kit (no `data-character`). Equivalent to `<Avatar character="jojo">`.
 */
export function Jojo(props: Omit<JojoProps, 'character'>) {
  return <AnimatedAvatar {...props} character='jojo' legacy />
}

export type JojoStaticProps = Omit<JojoProps, 'ref' | 'motion' | 'gaze'> & {
  gaze?: JojoOptions['gaze']
}

function StaticAvatar({ decorative, title, className, style, legacy, ...options }: JojoStaticProps & { legacy?: boolean }) {
  const cfg = resolveConfig({ ...options, motion: 'static' }, true)
  const ids = makeIds(useId())
  return (
    <JojoSvg
      frame={staticFrame(cfg)}
      cfg={cfg}
      ids={ids}
      decorative={decorative}
      title={title}
      className={className}
      style={style}
      legacy={legacy}
    />
  )
}

/**
 * Pure, hook-light render of a single pose: no engine, no effects. Use it for
 * SSR-only pages, emails, exports and icon grids.
 */
export function AvatarStatic(props: AvatarStaticProps) {
  return <StaticAvatar {...props} />
}

/** The approved static Jojo, byte-identical to the signed-off baseline. */
export function JojoStatic(props: Omit<JojoStaticProps, 'character'>) {
  return <StaticAvatar {...props} character='jojo' legacy />
}

export type AvatarProps = JojoProps
export type AvatarStaticProps = JojoStaticProps
