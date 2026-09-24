import { buildCharacter } from '../character'

export const O01 = buildCharacter({
  id: 'o01',
  no: 7,
  name: { en: 'Kiri', zh: '切切' },
  persona: { zh: '脸板被斜着切掉一个角，做事也喜欢抄近路。', en: 'Its plate has one corner sliced off — fond of shortcuts, too.' },
  source: { file: 'reference/options-20/01.png', sha256: 'bcdaa910c9f2031d235be1085949ea8dbf4d2aca174c12d1d24cc419ccb49a83', batch: 'options-20', index: '01', size: 512 },
  form: '靛蓝壳体、左上缺口托信号点；薄荷脸板贴右下，左上角被一刀斜切成 45° 斜边；靛蓝眼一细一粗、嘴是偏右的横线。',
  shell: { type: 'poly', pts: [[70, 134.5, 40], [156, 134.5], [156, 123], [419, 123, 50], [419, 448.5, 60], [70, 448.5, 55]], notches: [{ cx: 156, cy: 136.7, r: 43.5, fillet: 20 }] },
  face: { type: 'poly', pts: [[251.4, 169.5, 16], [419, 169.5, 48], [419, 448.5, 60], [94, 448.5, 58], [94, 322.8, 16]] },
  eyes: [
    { cx: 220, cy: 317, w: 33, h: 93 },
    { cx: 327, cy: 311, w: 49, h: 103 },
  ],
  mouth: { cx: 321.5, cy: 390, w: 82, h: 25 },
  dot: { cx: 156, cy: 136.7, r: 25.5 },
  notchDir: -90,
  palette: { shell: '#2c326e', face: '#ccf4e9', ink: '#2c326e', dot: '#fd6947' },
})
