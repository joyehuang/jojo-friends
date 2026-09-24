import { buildCharacter } from '../character'

export const O17 = buildCharacter({
  id: 'o17',
  no: 23,
  name: { en: 'Wowo', zh: '窝窝' },
  persona: { zh: '头顶像个斜斜的小屋顶，住在里面的它很恋家。', en: 'A slanted little roof on top; a homebody who loves its nook.' },
  source: { file: 'reference/options-20/17.png', sha256: '7eb5d12256781337cdb8576a2fabfad10e79277065d02df7ff33ff94b3cd68ae', batch: 'options-20', index: '17', size: 512 },
  form: '奶油壳顶是一道从左往右斜升的屋顶，右侧拱起圆峰后陡降到小缺口，缺口托着小信号点；靛蓝脸板压在下半部并略微探出壳底。',
  shell: {
    type: 'poly',
    pts: [
      [48.5, 175, 31.5],
      [262, 39, 56],
      [282.3, 166.3, 0],
      [404, 162, 38],
      [404, 410, 28],
      [48, 410, 26],
    ],
    notches: [{ cx: 316.5, cy: 143.3, r: 37, fillet: 6 }],
  },
  face: { type: 'rect', x: 59, y: 213, w: 334.5, h: 220, r: [59, 58.5, 38.5, 38] },
  faceClip: 'none',
  eyes: [
    { cx: 169.3, cy: 317, w: 33.5, h: 87 },
    { cx: 285, cy: 311, w: 46, h: 93 },
  ],
  mouth: { cx: 258, cy: 385.5, w: 76.5, h: 20.5 },
  dot: { cx: 316.5, cy: 142.4, r: 19 },
  notchDir: -90,
  palette: { shell: '#f6e9d4', face: '#262e71', ink: '#f6e9d4', dot: '#fe6b49' },
})
