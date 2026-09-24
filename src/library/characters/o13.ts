import { buildCharacter } from '../character'

export const O13 = buildCharacter({
  id: 'o13',
  no: 19,
  name: { en: 'Jam', zh: '酱酱' },
  persona: { zh: '脸长在罐子顶上的标签里，装满了好心情。', en: 'Wears its face on the label at the top of the jar — full of good mood.' },
  source: { file: 'reference/options-20/13.png', sha256: '90f0dbce57d484032685d49a1338769a1f9bbabb3602161df61612e19428b4a5', batch: 'options-20', index: '13', size: 512 },
  form: '淡紫罐形壳体，上部横贯一条薄荷色标签脸板；一对竖长眼夹着一道短横口；顶部正中缺口咬穿壳与标签，托桃色信号点。',
  shell: { type: 'rect', x: 111.5, y: 26.5, w: 360, h: 335, r: [61, 61, 62, 61], notches: [{ cx: 331.5, cy: 44.5, r: 44, fillet: 28 }] },
  face: { type: 'rect', x: 122.5, y: 52.5, w: 337, h: 155, r: [34, 34, 30, 30], notches: [{ cx: 331.5, cy: 44.5, r: 44, fillet: 4 }] },
  eyes: [
    { cx: 220, cy: 139.5, w: 28.5, h: 71 },
    { cx: 358.5, cy: 139.5, w: 29.5, h: 71 },
  ],
  mouth: { cx: 289.5, cy: 175.5, w: 57, h: 19 },
  dot: { cx: 331.5, cy: 41.5, r: 28 },
  notchDir: -90,
  brows: [{ cx: 210, cy: 95, len: 22 }, { cx: 382, cy: 97, len: 20 }],
  rig: { mouthCurve: 0.75, feat: 0.85 },
  fit: { size: 0.84, dy: 84 },
  palette: { shell: '#b4b2d6', face: '#cdf1e7', ink: '#282f72', dot: '#faac8d', tear: '#4f9fe6' },
})
