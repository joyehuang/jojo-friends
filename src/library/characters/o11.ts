import { buildCharacter } from '../character'

export const O11 = buildCharacter({
  id: 'o11',
  no: 17,
  name: { en: 'Tiki', zh: '蒂奇' },
  persona: { zh: '眼睛竖着排成一列，像一根认真站岗的小柱子。', en: 'Eyes stacked in a column, standing guard like a tiny totem.' },
  source: { file: 'reference/options-20/11.png', sha256: 'e05a1e975233bfebe28c7dc059de258fa13f4d410f43194e2c62239541799f52', batch: 'options-20', index: '11', size: 512 },
  form: '靛蓝方壳，左侧嵌一条薄荷竖长条脸板；两只小眼上下叠放、下方一道短横口；右上缺口托橙色信号点。',
  shell: { type: 'rect', x: 80.5, y: 96, w: 344.5, h: 333, r: [55, 68, 62, 58], notches: [{ cx: 332.5, cy: 112.5, r: 47.5, fillet: 12 }] },
  face: { type: 'rect', x: 99.5, y: 108, w: 113.5, h: 310, r: [40, 36, 36, 40] },
  eyes: [
    { cx: 155, cy: 219, w: 34, h: 60 },
    { cx: 155, cy: 310.5, w: 34, h: 59 },
  ],
  mouth: { cx: 155.5, cy: 373.5, w: 57, h: 19 },
  dot: { cx: 332.5, cy: 112.5, r: 29 },
  notchDir: -90,
  cheeks: [{ cx: 119, cy: 336 }, { cx: 191, cy: 336 }],
  brows: [{ cx: 137, cy: 176, len: 26 }, { cx: 175, cy: 176, len: 26 }],
  tearDrift: [-1, 1],
  rig: { arc: 1.35 },
  bubble: { x: 221, y: 65, w: 72, h: 52, tail: 'right' },
  palette: { shell: '#272e71', face: '#cef1e8', ink: '#272e71', dot: '#fe8c43' },
})
