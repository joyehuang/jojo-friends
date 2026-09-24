import { buildCharacter } from '../character'

export const O02 = buildCharacter({
  id: 'o02',
  no: 8,
  name: { en: 'Mochi', zh: '麻薯' },
  persona: { zh: '圆脸软软的，一戳就想笑。', en: 'A round, squishy face that giggles when poked.' },
  source: { file: 'reference/options-20/02.png', sha256: 'ea98daafed62e5b21842ffe0da3462e0c4953ed9dd8616c8083b7ab724cc010f', batch: 'options-20', index: '02', size: 512 },
  form: '浅蓝圆角壳体，一张奶油色大圆脸偏在右下、被壳体右缘和底缘裁切；靛蓝眼一细一粗，一字嘴偏右；左上缺口托信号点。',
  shell: { type: 'rect', x: 39, y: 122, w: 358, h: 326, r: [58, 54, 59, 53], notches: [{ cx: 135, cy: 134.6, r: 42, fillet: 10 }] },
  face: { type: 'rect', x: 104.4, y: 173, w: 297.2, h: 297.2, r: [148.6, 148.6, 0, 148.6] },
  eyes: [
    { cx: 201.5, cy: 317, w: 32, h: 85 },
    { cx: 305.5, cy: 311, w: 50, h: 103 },
  ],
  mouth: { cx: 302.5, cy: 388, w: 76, h: 23 },
  dot: { cx: 135, cy: 134.6, r: 25.5 },
  notchDir: -90,
  palette: { shell: '#95c5ed', face: '#f5ebd6', ink: '#2c3371', dot: '#fd6b49' },
})
