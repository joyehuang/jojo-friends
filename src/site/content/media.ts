import poster from '../media/jojo-builds-home-poster.webp'
import stillAvatar from '../media/jojo-builds-home-still-avatar.webp'
import stillNight from '../media/jojo-builds-home-still-night.webp'

/**
 * Films shown in stories. The video file itself stays on Joye's existing media
 * host and is only requested after a reader presses play; the site ships a
 * small poster and a couple of stills (960 px WebP) instead.
 */
export interface Film {
  src: string
  poster: string
  stills: Record<string, string>
  width: number
  height: number
  /** m:ss, shown on the play button */
  duration: string
  /** e.g. "11.6 MB", so readers on mobile data know before they tap */
  size: string
  label: string
}

export const FILMS: Record<string, Film> = {
  'jojo-builds-home': {
    src: 'https://assets.joyehuang.dev/design/jojo-builds-home-2026-09-24/jojo-builds-home.mp4',
    poster,
    stills: { avatar: stillAvatar, night: stillNight },
    width: 1920,
    height: 1080,
    duration: '0:29',
    size: '11.6 MB',
    label: '小动画《Jojo 搭了一个家》，29 秒，有声音',
  },
}
