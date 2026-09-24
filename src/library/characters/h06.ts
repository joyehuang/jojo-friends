import { buildCharacter } from '../character'

export const H06 = buildCharacter({
  id: 'h06',
  no: 6,
  name: { en: 'Bobo', zh: '波波' },
  persona: { zh: '顶着一头圆圆的波波头，性格温吞，笑起来很软。', en: 'Wears a round bob of a shell; easy-going, with a soft smile.' },
  source: { file: 'reference/h-family/06.png', sha256: '6a4b748b8e5c215a7f285b78cc8738499361db1e37a75d933967ce63fb8d4481', batch: 'h-family', index: '06', size: 512 },
  form: '靛蓝壳体上方两角都是大圆弧，像一顶圆圆的波波头；奶油脸板偏左下；短胖胶囊眼与宽横线嘴；右上圆弧上的缺口托信号点。',
  shell: { type: 'rect', x: 55, y: 53, w: 346.5, h: 323, r: [140, 140, 120, 120], notches: [{ cx: 336.4, cy: 88.1, r: 46, fillet: 10 }] },
  face: { type: 'rect', x: 75.5, y: 126, w: 281.5, h: 232, r: [68, 120, 66, 70] },
  eyes: [
    { cx: 143.5, cy: 229, w: 44, h: 81 },
    { cx: 289, cy: 229.5, w: 43, h: 80 },
  ],
  mouth: { cx: 216, cy: 303, w: 99, h: 23 },
  dot: { cx: 336.4, cy: 88.1, r: 25 },
  notchDir: -45,
  gaugeHalfSpan: 75,
  palette: { shell: '#2b3375', face: '#f5ebd7', ink: '#2b3375', dot: '#fd7351' },
})
