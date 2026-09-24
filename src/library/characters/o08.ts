import { buildCharacter } from '../character'

export const O08 = buildCharacter({
  id: 'o08',
  no: 14,
  name: { en: 'Vivi', zh: '薇薇' },
  persona: { zh: '眉眼往上挑，干劲十足，一脸“交给我”。', en: 'Eyes slanted with gusto — the “leave it to me” face.' },
  source: { file: 'reference/options-20/08.png', sha256: 'fc261c0f89ccb50bcd75570f312b9900190df2760a7880406b1bbe0ee26b6d64', batch: 'options-20', index: '08', size: 512 },
  form: '浅蓝壳体，靛蓝脸板贴左下、与壳体左缘和底缘齐平；浅蓝眼是一对向内收拢的斜胶囊（\\ /），下方一条宽横杠嘴；右上缺口托信号点。',
  shell: { type: 'rect', x: 137.5, y: 44, w: 321, h: 310.5, r: [55, 57, 57, 52], notches: [{ cx: 383.3, cy: 57.3, r: 42.4, fillet: 8 }] },
  // flush with the shell's left and bottom edges
  face: { type: 'rect', x: 137.5, y: 121, w: 260, h: 233.5, r: [54, 54, 51, 52] },
  // eyes lean in towards each other at the top (\ /): left eye top leans left, right eye top leans right
  eyes: [
    { cx: 240, cy: 211, w: 34, h: 95, rot: -10.5 },
    { cx: 330.5, cy: 211.5, w: 34, h: 95, rot: 10.5 },
  ],
  mouth: { cx: 283.5, cy: 295, w: 132, h: 27 },
  dot: { cx: 383.3, cy: 57.3, r: 25 },
  notchDir: -90,
  // the wide bar mouth sits low on the plate: a slightly smaller laugh/sob opening keeps it on the plate
  rig: { mouthCurve: 0.85 },
  // the dot sits near the top-right corner; puzzled tilts it right, so the small-size gauge needs a little room inside the tight frame
  fit: { size: 0.96 },
  palette: { shell: '#96c3f0', face: '#2d2e71', ink: '#96c3f0', dot: '#fe6b49' },
})
