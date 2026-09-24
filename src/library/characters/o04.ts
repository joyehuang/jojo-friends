import { buildCharacter } from '../character'

export const O04 = buildCharacter({
  id: 'o04',
  no: 10,
  name: { en: 'Kuki', zh: '曲奇' },
  persona: { zh: '侧边被咬了一口的曲奇，完全不在意。', en: 'A cookie with a bite out of its side — and not bothered one bit.' },
  source: { file: 'reference/options-20/04.png', sha256: 'd131c4186473cc969d9850d3ec86b90ef9c283587ebb304c60e85efa45fe963b', batch: 'options-20', index: '04', size: 512 },
  form: '奶油色壳体左侧被咬掉一大口，呈 C 形；靛蓝脸板贴满右下角、与壳体右缘和底缘齐平；奶油色眼一细一粗、一字嘴偏右；左上缺口托信号点。',
  shell: {
    type: 'poly',
    pts: [[72.5, 49.5, 37], [417, 48, 51], [417, 365.5, 56], [70, 365.5, 52]],
    notches: [
      { cx: 160.8, cy: 57.6, r: 41, fillet: 14 },
      // the cookie bite: a big circle whose centre sits outside the left edge
      { cx: 14.6, cy: 195.9, r: 110.4, fillet: 26 },
    ],
  },
  // flush with the shell's right and bottom edges
  face: { type: 'rect', x: 167, y: 115, w: 250, h: 250.5, r: [68, 37, 56, 45] },
  eyes: [
    { cx: 235, cy: 238, w: 31, h: 91 },
    { cx: 337.5, cy: 230, w: 52, h: 103 },
  ],
  mouth: { cx: 332, cy: 307, w: 79, h: 23 },
  dot: { cx: 160.8, cy: 57.6, r: 24.5 },
  notchDir: -90,
  palette: { shell: '#f5ebd6', face: '#2c3371', ink: '#f5ebd6', dot: '#fe6c49' },
})
