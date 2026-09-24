// Jojo H geometry, measured from the approved hero-h.png (1254×1254).
// All coordinates live in that PNG's pixel space so the vector master can be
// laid over the source image 1:1 for identity checks.

export const COLORS = {
  indigo: '#2d3272',
  indigoDeep: '#292d6b',
  indigoLift: '#32377b',
  mint: '#cff0e6',
  mintLift: '#d6f3ea',
  mintDeep: '#c9ede1',
  coral: '#fe6a4a',
  coralLift: '#ff8a6c',
  tear: '#6fb9ec',
  tearLift: '#d8f0ff',
  blush: '#ff9a86',
  /** warm ink used at low alpha so the shadow reads on cream and disappears on dark */
  shadow: '#5e4828',
  offline: '#a9a8b8',
} as const

/** Body outline: rounded indigo shell with the U-notch that cradles the signal dot. */
export const SHELL_PATH =
  'M260,380 C260,312 310,262 365,262 C396,262 418,288 422,318 ' +
  'A80,80 0 0 0 582,318 C590,284 622,258 670,258 L875,258 ' +
  'A120,120 0 0 1 995,378 L995,838 A120,120 0 0 1 875,958 L380,958 A120,120 0 0 1 260,838 Z'

/** Mint face plate, flush with the shell's right and bottom edges. */
export const FACE_PATH =
  'M418,582 A130,130 0 0 1 548,452 L925,452 A70,70 0 0 1 995,522 L995,838 ' +
  'A120,120 0 0 1 875,958 L498,958 A80,80 0 0 1 418,878 Z'

export const FACE_BOX = { x0: 418, y0: 452, x1: 995, y1: 958 } as const
export const SHELL_BOX = { x0: 260, y0: 258, x1: 995, y1: 958 } as const

/** Shadow is the shell shape offset down-right, as in the hero art. */
export const SHADOW_OFFSET = { x: 62, y: 67 } as const

/** Pivot for tilt/squash: bottom centre of the shell. */
export const PIVOT = { x: 627.5, y: 958 } as const

/** Baseline features (hero art). Eyes are vertical capsules of unequal width. */
export const EYE_L = { cx: 589, cy: 690, w: 68, h: 196 } as const
export const EYE_R = { cx: 802, cy: 680, w: 110, h: 215 } as const
export const MOUTH = { cx: 804, cy: 846.5, w: 162, h: 47 } as const
export const DOT = { cx: 501, cy: 297, r: 53 } as const

/** Default brows sit in the mint band above the eyes; off unless an emotion asks. */
export const BROW_L = { cx: 589, cy: 540, len: 64 } as const
export const BROW_R = { cx: 802, cy: 522, len: 84 } as const

/** Cheek anchors for blush and tear paths. */
export const CHEEK_L = { cx: 506, cy: 812 } as const
export const CHEEK_R = { cx: 930, cy: 772 } as const

/**
 * Framing. `full` leaves room for the shadow and celebratory motion; `tight`
 * hugs the shell for small avatars where padding would waste pixels.
 */
export const VIEWBOX = {
  full: { x: 190, y: 160, w: 900, h: 900 },
  tight: { x: 224, y: 186, w: 800, h: 800 },
} as const

export type Framing = keyof typeof VIEWBOX
