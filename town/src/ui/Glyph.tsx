// Small line icons for the HUD buttons (24 × 24, currentColor).
const PATHS = {
  roster: 'M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8-1a3 3 0 1 0 0-6M2.5 20c.6-3.6 3-5.5 6-5.5s5.4 1.9 6 5.5m1.5-5.6c2.4.2 4.3 1.9 5 5.1',
  inbox: 'M3.5 13.5 6 5.8A2 2 0 0 1 7.9 4.5h8.2A2 2 0 0 1 18 5.8l2.5 7.7M3.5 13.5v4a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-4m-17 0h4.6l1.4 2.5h5l1.4-2.5h4.6',
  log: 'M5 4.5h10.5a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3v-12Zm0 12a3 3 0 0 1 3-3h10.5M9 8.5h6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2.2-1.3L14.4 3h-4l-.4 2.4a7.6 7.6 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2.2 1.3l.4 2.4h4l.4-2.4a7.6 7.6 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3Z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-10v5.5M12 7.6v.1',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  home: 'M4 11 12 4l8 7v8.5a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1V11Z',
  follow: 'M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm0-4a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0-13v3m0 14v3M2 12h3m14 0h3',
  close: 'M6 6l12 12M18 6 6 18',
  basket: 'M3.5 9.5h17l-1.7 9a2 2 0 0 1-2 1.6H7.2a2 2 0 0 1-2-1.6l-1.7-9Zm4.5 0L11 4m5 5.5L13 4M9 13v3.5m6-3.5v3.5',
  desk: 'M3 9.5h18M5 9.5V19m14-9.5V19M8 9.5V6.5h8v3',
  swap: 'M7 7h11l-3-3m3 3-3 3M17 17H6l3 3m-3-3 3-3',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  sun: 'M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM12 2.5v2m0 15v2m9.5-9.5h-2m-15 0h-2m15.2-6.7-1.4 1.4M6.7 17.3l-1.4 1.4m0-13.4 1.4 1.4m10.6 10.6 1.4 1.4',
  moon: 'M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z',
} as const

export type GlyphName = keyof typeof PATHS

export function Glyph({ name, size = 20 }: { name: GlyphName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth={2.2} strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
      <path d={PATHS[name]} />
    </svg>
  )
}
