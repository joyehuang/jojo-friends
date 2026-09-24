import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { EmotionId, MotionPref, StatusId } from '../library'

export type GazePref = 'auto' | 'pointer' | 'center'
export type Backdrop = 'paper' | 'white' | 'night' | 'mint' | 'clear'
export type Tri = 'auto' | 'on' | 'off'

/** What the viewer has chosen to look at. Shared across characters so comparisons keep their settings. */
export interface Look {
  emotion: EmotionId
  status: StatusId
  intensity: number
  motion: MotionPref
  gaze: GazePref
  size: number
  backdrop: Backdrop
  shadow: Tri
  brows: Tri
  flat: Tri
}

export const QUIET: Look = {
  emotion: 'calm',
  status: 'idle',
  intensity: 0.7,
  motion: 'auto',
  gaze: 'auto',
  size: 260,
  backdrop: 'paper',
  shadow: 'auto',
  brows: 'auto',
  flat: 'auto',
}

const Ctx = createContext<{ look: Look; set: (p: Partial<Look>) => void; reset: () => void } | null>(null)

export function LookProvider({ children }: { children: ReactNode }) {
  const [look, setLook] = useState<Look>(QUIET)
  const value = useMemo(
    () => ({ look, set: (p: Partial<Look>) => setLook((l) => ({ ...l, ...p })), reset: () => setLook(QUIET) }),
    [look],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLook() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLook outside LookProvider')
  return v
}

export const tri = (t: Tri): boolean | 'auto' => (t === 'auto' ? 'auto' : t === 'on')
