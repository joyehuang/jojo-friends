import type { CSSProperties, ReactNode, Ref } from 'react'
import type { ResolvedConfig } from './config'
import { EMOTIONS } from './emotions'
import { CONFETTI, CONFETTI_TONE, TEAR_PATH, type Attrs, type Frame } from './frame'
import { VIEWBOX } from './geometry'
import { ASK_DOT, ASK_PATH, SPARKS } from './signals'
import { STATUSES } from './status'

export interface JojoIds {
  shell: string
  face: string
  lidL: string
  lidR: string
  mouth: string
  gShell: string
  gFace: string
  gDot: string
  gGlow: string
}

/** Instance-unique ids from React's useId (which may contain `:` or `«»`). */
export function makeIds(raw: string): JojoIds {
  const p = 'jojo-' + (raw.replace(/[^a-zA-Z0-9_-]/g, '') || 'x')
  return {
    shell: `${p}-shell`,
    face: `${p}-face`,
    lidL: `${p}-lid-l`,
    lidR: `${p}-lid-r`,
    mouth: `${p}-mouth`,
    gShell: `${p}-g-shell`,
    gFace: `${p}-g-face`,
    gDot: `${p}-g-dot`,
    gGlow: `${p}-g-glow`,
  }
}

const REACT_ATTR: Record<string, string> = {
  'stroke-width': 'strokeWidth',
  'stroke-dashoffset': 'strokeDashoffset',
}

/** Frame attrs → React props, plus the data-part hook the engine writes through. */
function part(frame: Frame, name: string) {
  const attrs: Attrs = frame[name] ?? {}
  const out: Record<string, string> = { 'data-part': name }
  for (const k in attrs) out[REACT_ATTR[k] ?? k] = attrs[k]
  return out
}

export function accessibleName(cfg: ResolvedConfig) {
  const e = EMOTIONS[cfg.emotion].label
  const n = cfg.character.name.en
  return cfg.status === 'idle' ? `${n}：${e}` : `${n}：${e}，状态：${STATUSES[cfg.status].label}`
}

export interface JojoSvgProps {
  frame: Frame
  cfg: ResolvedConfig
  ids: JojoIds
  decorative?: boolean
  title?: string
  className?: string
  style?: CSSProperties
  svgRef?: Ref<SVGSVGElement>
  /**
   * Legacy Jojo markup: omit `data-character`. The approved `<Jojo>` /
   * `<JojoStatic>` use it so their output stays byte-identical to the signed-off
   * baseline; `<Avatar>` always tags the character.
   */
  legacy?: boolean
}

/**
 * The layered SVG. Every animated attribute carries `data-part`; in the
 * animated component `frame` is the first frame only and the engine takes
 * over, so React never fights the animation.
 */
export function JojoSvg({ frame, cfg, ids, decorative, title, className, style, svgRef, legacy }: JojoSvgProps) {
  const ch = cfg.character
  const C = ch.palette
  const DOT = ch.dot
  const kd = ch.k.dot, kb = ch.k.body, kf = ch.k.face
  const vb = VIEWBOX[cfg.framing]
  const flat = cfg.flat
  const offline = cfg.status === 'offline'
  const shellFill = flat ? C.shell : `url(#${ids.gShell})`
  const faceFill = flat ? C.face : `url(#${ids.gFace})`
  const dotFill = offline ? C.offline : flat ? C.dot : `url(#${ids.gDot})`
  const fr = ch.faceRotate
  const rotated = (node: ReactNode) =>
    fr ? <g transform={`rotate(${fr.deg} ${fr.cx} ${fr.cy})`}>{node}</g> : node
  const a11y = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img', 'aria-label': title ?? accessibleName(cfg) }

  return (
    <svg
      ref={svgRef}
      xmlns='http://www.w3.org/2000/svg'
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      width={cfg.px ?? undefined}
      height={cfg.px ?? undefined}
      focusable='false'
      overflow='visible'
      className={className}
      data-jojo=''
      data-character={legacy ? undefined : ch.id}
      data-emotion={cfg.emotion}
      data-status={cfg.status}
      data-motion={cfg.motion}
      style={{
        display: 'block',
        overflow: 'visible',
        width: cfg.px ? undefined : cfg.cssSize,
        height: cfg.px ? undefined : cfg.cssSize,
        flex: 'none',
        filter: offline ? 'saturate(0.2)' : undefined,
        opacity: offline ? 0.78 : undefined,
        transition: cfg.motion === 'static' ? undefined : 'filter .4s ease, opacity .4s ease',
        ...style,
      }}
      {...a11y}
    >
      <defs>
        <clipPath id={ids.shell}>
          <path d={ch.shell.d} />
        </clipPath>
        <clipPath id={ids.face}>
          <path d={ch.face.d} />
        </clipPath>
        <clipPath id={ids.lidL}>
          <path {...part(frame, 'lidL')} />
        </clipPath>
        <clipPath id={ids.lidR}>
          <path {...part(frame, 'lidR')} />
        </clipPath>
        <clipPath id={ids.mouth}>
          <path {...part(frame, 'mouthClip')} />
        </clipPath>
        {!flat && (
          <>
            <linearGradient id={ids.gShell} x1='0' y1='0' x2='1' y2='1'>
              <stop offset='0' stopColor={C.shellLift} />
              <stop offset='1' stopColor={C.shellDeep} />
            </linearGradient>
            <linearGradient id={ids.gFace} x1='0' y1='0' x2='0.35' y2='1'>
              <stop offset='0' stopColor={C.faceLift} />
              <stop offset='1' stopColor={C.faceDeep} />
            </linearGradient>
            <radialGradient id={ids.gDot} cx='0.36' cy='0.32' r='0.75'>
              <stop offset='0' stopColor={C.dotLift} />
              <stop offset='0.55' stopColor={C.dot} />
              <stop offset='1' stopColor={C.dot} />
            </radialGradient>
          </>
        )}
        <radialGradient id={ids.gGlow}>
          <stop offset='0.4' stopColor={C.dot} stopOpacity='0.55' />
          <stop offset='1' stopColor={C.dot} stopOpacity='0' />
        </radialGradient>
      </defs>

      <path {...part(frame, 'shadow')} d={ch.silhouette} fill={C.shadow} data-layer='shadow' />

      <g {...part(frame, 'body')} data-layer='character'>
        <path d={ch.shell.d} fill={shellFill} data-layer='shell' />
        <g clipPath={ch.faceClip ? `url(#${ids.shell})` : undefined}>
          {rotated(
            <g {...part(frame, 'face')} data-layer='face'>
              <path d={ch.face.d} fill={faceFill} />
              <g {...part(frame, 'blush')} fill={C.blush} data-layer='blush'>
                <ellipse {...part(frame, 'blushL')} cx={ch.cheekL.cx} cy={ch.cheekL.cy} />
                <ellipse {...part(frame, 'blushR')} cx={ch.cheekR.cx} cy={ch.cheekR.cy} />
              </g>
              <g clipPath={`url(#${ids.face})`}>
                <g {...part(frame, 'features')}>
                  <g
                    {...part(frame, 'brows')}
                    fill='none'
                    stroke={C.ink}
                    strokeWidth={ch.browWidth}
                    strokeLinecap='round'
                    data-layer='brows'
                  >
                    <path {...part(frame, 'browL')} />
                    <path {...part(frame, 'browR')} />
                  </g>
                  <g {...part(frame, 'eyeL')} data-layer='eye-left'>
                    <g clipPath={`url(#${ids.lidL})`}>
                      <path {...part(frame, 'eyeLPath')} fill='none' stroke={C.ink} strokeLinecap='round' strokeLinejoin='round' />
                      <circle {...part(frame, 'shineL')} fill={C.shine} />
                    </g>
                  </g>
                  <g {...part(frame, 'eyeR')} data-layer='eye-right'>
                    <g clipPath={`url(#${ids.lidR})`}>
                      <path {...part(frame, 'eyeRPath')} fill='none' stroke={C.ink} strokeLinecap='round' strokeLinejoin='round' />
                      <circle {...part(frame, 'shineR')} fill={C.shine} />
                    </g>
                  </g>
                </g>
                <g {...part(frame, 'mouth')} data-layer='mouth'>
                  <path {...part(frame, 'mouthPath')} fill={C.mouth} stroke={C.mouth} strokeLinejoin='round' />
                  <g clipPath={`url(#${ids.mouth})`}>
                    <ellipse {...part(frame, 'tongue')} fill={C.tongue} />
                  </g>
                </g>
              </g>
              <g {...part(frame, 'tears')} data-layer='tears'>
                {(['streamL', 'streamR'] as const).map((n) => (
                  <path
                    key={n}
                    {...part(frame, n)}
                    fill='none'
                    stroke={C.tear}
                    strokeWidth={ch.tearStroke}
                    strokeLinecap='round'
                    strokeDasharray={`${120 * kf} ${20 * kf}`}
                  />
                ))}
                {(['poolL', 'poolR', 'dropL', 'dropR'] as const).map((n) => (
                  <g key={n} {...part(frame, n)}>
                    <path d={TEAR_PATH} fill={C.tear} />
                    <ellipse cx='-8' cy='6' rx='6' ry='9' fill={C.tearLift} opacity='0.9' />
                  </g>
                ))}
              </g>
            </g>,
          )}
        </g>

        {cfg.status === 'working' && (
          <g {...part(frame, 'gauge')} fill='none' strokeLinecap='round' data-layer='status-working'>
            {ch.rig && <path {...part(frame, 'gaugeHalo')} stroke='#ffffff' strokeOpacity='0.92' />}
            <path {...part(frame, 'gaugeTrack')} stroke={C.track} strokeOpacity={C.trackOpacity} />
            <path {...part(frame, 'gaugeFill')} stroke={C.gauge} />
          </g>
        )}
        {cfg.status === 'success' && (
          <g fill='none' stroke={C.spark} strokeWidth={10 * kd} strokeLinecap='round' data-layer='status-success-spark'>
            {SPARKS.map((_, i) => (
              <path key={i} {...part(frame, `spark${i}`)} />
            ))}
          </g>
        )}
        <g {...part(frame, 'dot')} data-layer='signal-dot'>
          <circle {...part(frame, 'dotGlow')} cx={DOT.cx} cy={DOT.cy} r={DOT.r * 2.1} fill={`url(#${ids.gGlow})`} />
          <circle {...part(frame, 'ring')} cx={DOT.cx} cy={DOT.cy} fill='none' stroke={C.dot} strokeWidth={9 * kd} />
          <circle cx={DOT.cx} cy={DOT.cy} r={DOT.r} fill={dotFill} />
          <g {...part(frame, 'mark')} fill={C.mark}>
            <rect x={DOT.cx - 7 * kd} y={DOT.cy - 31 * kd} width={14 * kd} height={36 * kd} rx={7 * kd} />
            <circle cx={DOT.cx} cy={DOT.cy + 21 * kd} r={8 * kd} />
          </g>
          {cfg.status === 'success' && (
            <path
              {...part(frame, 'check')}
              fill='none'
              stroke={C.check}
              strokeLinecap='round'
              strokeLinejoin='round'
              data-layer='status-success'
            />
          )}
        </g>
        {cfg.status === 'needs-input' && (
          <g {...part(frame, 'bubble')} data-layer='status-needs-input'>
            <path
              {...part(frame, 'bubbleShape')}
              fill={C.bubble}
              stroke={C.bubbleEdge}
              strokeLinejoin='round'
            />
            <g {...part(frame, 'ask')}>
              <path
                {...part(frame, 'askPath')}
                d={ASK_PATH}
                fill='none'
                stroke={C.ask}
                strokeLinecap='round'
                strokeLinejoin='round'
              />
              <circle {...part(frame, 'askDot')} cx={ASK_DOT.cx} cy={ASK_DOT.cy} fill={C.ask} />
            </g>
          </g>
        )}
      </g>

      <g data-layer='confetti'>
        {CONFETTI.map((c, i) => (
          <rect
            key={i}
            {...part(frame, `confetti${i}`)}
            x={(-c.w * kb) / 2}
            y={(-c.h * kb) / 2}
            width={c.w * kb}
            height={c.h * kb}
            rx={Math.min(c.w * kb, c.h * kb) / 2.5}
            fill={C.confetti[CONFETTI_TONE[i]]}
          />
        ))}
      </g>
      <g
        data-layer='zzz'
        fill='none'
        stroke={C.ask}
        strokeWidth='9'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        {[0, 1].map((i) => (
          <path key={i} {...part(frame, `zzz${i}`)} d='M-13,-13 H13 L-13,13 H13' />
        ))}
      </g>
    </svg>
  )
}
