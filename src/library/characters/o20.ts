import { buildCharacter } from '../character'

export const O20 = buildCharacter({
  id: 'o20',
  no: 26,
  name: { en: 'Hugo', zh: '抱抱' },
  persona: { zh: '脸板在侧边弯出一个弧，把信号点轻轻抱住。', en: 'Its plate curves in at the side to give the dot a gentle hug.' },
  source: { file: 'reference/options-20/20.png', sha256: 'a18933b737dd7fb6016b49f314f149970c59ac224af5397f56145eced5639da2', batch: 'options-20', index: '20', size: 512 },
  form: '靛蓝壳体右侧开口托着信号点，壳的上半截比下半截窄一级；奶油脸板右缘向内收成一道弯，从上方绕开信号点再向右下鼓出。',
  shell: {
    type: 'poly',
    pts: [
      [48, 31.5, 63.5],
      [381.5, 31.5, 60],
      [381.5, 145, 0],
      [403, 145, 0],
      [403, 372, 56.5],
      [48, 372, 62.5],
    ],
    notches: [{ cx: 385, cy: 145, r: 47, fillet: 15 }],
  },
  face: {
    type: 'poly',
    pts: [
      [68.5, 116.5, 52],
      [318, 116.5, 56.5],
      [318, 229.5, 40],
      [383, 290, 31.5],
      [383, 372.5, 40],
      [68.5, 372.5, 60],
    ],
  },
  eyes: [
    { cx: 145.5, cy: 237.5, w: 30, h: 90 },
    { cx: 246.5, cy: 231.6, w: 49, h: 102 },
  ],
  mouth: { cx: 250.5, cy: 314, w: 86, h: 23 },
  dot: { cx: 385.1, cy: 145.2, r: 25.5 },
  notchDir: 0,
  fit: { size: 0.94, dx: -40 },
  gaugeHalfSpan: 90,
  bubble: { x: 329.3, y: 37.5, w: 85.6, h: 61.6, tail: 'down' },
  palette: { shell: '#262e71', face: '#f6e9d4', ink: '#262e71', dot: '#fe6947' },
})
