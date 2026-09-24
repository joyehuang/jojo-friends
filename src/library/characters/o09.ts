import { buildCharacter } from '../character'

export const O09 = buildCharacter({
  id: 'o09',
  no: 15,
  name: { en: 'Puri', zh: '布丁' },
  persona: { zh: '小小的嘴、侧边的信号点，安静得像一块布丁。', en: 'Tiny mouth, dot on the side, quiet as a pudding.' },
  source: { file: 'reference/options-20/09.png', sha256: '062edf68a588ca9ae0b44ccce0930680a8f1a2e97cd1b979103e7e41011d0bd9', batch: 'options-20', index: '09', size: 512 },
  form: '淡紫壳体在后、奶油脸板贴右下齐边；一对粗圆竖眼压得很低，中间一颗小圆点嘴；左侧缺口托信号点。',
  shell: { type: 'rect', x: 92, y: 44, w: 318, h: 311, r: [55, 55, 50, 55], notches: [{ cx: 107.5, cy: 192, r: 43.5, fillet: 10 }] },
  face: { type: 'rect', x: 167, y: 90, w: 243, h: 265, r: [50, 55, 50, 50] },
  eyes: [
    { cx: 220, cy: 279.5, w: 40.5, h: 89.5 },
    { cx: 350, cy: 279.5, w: 40.5, h: 89.5 },
  ],
  mouth: { cx: 285, cy: 304.5, w: 23, h: 23 },
  dot: { cx: 107.5, cy: 192, r: 25.5 },
  notchDir: 180,
  fit: { size: 0.94 },
  rig: { gaze: 0.8, feat: 0.9, mouthW: 4 },
  tearDrift: [1, -1],
  palette: { shell: '#b4aeda', face: '#f5ead7', ink: '#2d2f71', dot: '#fe6d4a' },
})
