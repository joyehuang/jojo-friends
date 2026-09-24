// Minimal usage. Copy src/library/ into any React 18+ app (not published to npm).
import { useRef, useState } from 'react'
import { Avatar, AvatarStatic, CHARACTER_LIST, STATUSES, renderSvg, type JojoHandle, type StatusId } from '../src/library'

export function AgentAvatar({ character, status }: { character: string; status: StatusId }) {
  // Avatar in a list: quiet, animates only when something changes, meaning in text.
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <Avatar character={character} status={status} size={32} motion='transitions' decorative />
      <span>{STATUSES[status].label}</span>
    </span>
  )
}

export function Mascot({ character = 'o02' }: { character?: string }) {
  // Hero: full motion (auto-static under prefers-reduced-motion), pointer gaze,
  // a tap reaction, and an emotion chosen explicitly by the caller.
  const ref = useRef<JojoHandle>(null)
  const [happy, setHappy] = useState(false)
  return (
    <button type='button' aria-label='戳一下' onClick={() => { ref.current?.poke(); setHappy((h) => !h) }}>
      <Avatar ref={ref} character={character} emotion={happy ? 'happy' : 'curious'} intensity={0.8} size={200} gaze='pointer' decorative />
    </button>
  )
}

// The whole family as a static icon row (SSR-safe, no effects).
export const FamilyRow = () => (
  <div style={{ display: 'flex', gap: 4 }}>
    {CHARACTER_LIST.map((c) => <AvatarStatic key={c.id} character={c.id} size={24} title={c.name.en} />)}
  </div>
)

// A standalone SVG file, e.g. in a Node script.
export const svgFile = renderSvg({ character: 'o11', emotion: 'surprised', status: 'needs-input', size: 256 })
