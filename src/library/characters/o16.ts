import { buildCharacter } from '../character'

export const O16 = buildCharacter({
  id: 'o16',
  no: 22,
  name: { en: 'Mino', zh: '米诺' },
  persona: { zh: '大大的薄荷脸几乎装满了整个壳，最会表达情绪。', en: 'A big mint face that nearly fills its shell — shows every feeling.' },
  source: { file: 'reference/options-20/16.png', sha256: 'cee4135d0681431e3e3030800dbd03628719cfd91077955fa4175bfa4449cea2', batch: 'options-20', index: '16', size: 512 },
  form: '靛蓝壳体只在左侧露出一条，大薄荷脸板占满右下；顶部缺口同时咬进壳和脸板的左上大圆角，托住信号点。',
  cleanup: ['signal dot 27→25 px and raised 2 px, plate bite 48→52 px, so the full-size success pop clears the plate (source ring was too tight)'],
  shell: { type: 'rect', x: 76, y: 105, w: 358, h: 329, r: [60, 57, 58, 60], notches: [{ cx: 230.6, cy: 118.2, r: 49, fillet: 5 }] },
  face: { type: 'rect', x: 152, y: 126, w: 281, h: 308, r: [88, 57, 55, 46], notches: [{ cx: 230.6, cy: 118.2, r: 52, fillet: 5 }] },
  eyes: [
    { cx: 230, cy: 297, w: 38, h: 96 },
    { cx: 341.5, cy: 292, w: 54, h: 107 },
  ],
  mouth: { cx: 333.5, cy: 378.4, w: 86, h: 25 },
  dot: { cx: 230.6, cy: 116, r: 25 },
  notchDir: -90,
  palette: { shell: '#262d6e', face: '#cbf2e7', ink: '#262d6e', dot: '#fe6946' },
})
