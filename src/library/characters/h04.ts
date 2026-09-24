import { buildCharacter } from '../character'

export const H04 = buildCharacter({
  id: 'h04',
  no: 4,
  name: { en: 'Nemu', zh: '眠眠' },
  persona: { zh: '眼睛总是弯弯的一条线，看起来刚睡醒，其实很清醒。', en: 'Eyes like two sleepy lines — looks just woken up, is actually wide awake.' },
  source: { file: 'reference/h-family/04.png', sha256: '763161317d56ed5c108e6a7ae8bc22c9818e635bba78679bc8e19f01ade1f09f', batch: 'h-family', index: '04', size: 512 },
  form: '浅蓝壳体右上角斜切，斜边上的缺口托信号点；奶油脸板居中偏右下；两眼是横向短线、嘴是小横线，睡眼惺忪。',
  shell: { type: 'poly', pts: [[117, 36, 60], [308.7, 36, 10], [393.5, 99.6], [393.5, 84.1], [463, 136.3, 12], [463, 373, 58], [117, 373, 58]], notches: [{ cx: 393.5, cy: 76.5, r: 44, fillet: 8 }] },
  face: { type: 'rect', x: 174, y: 132, w: 275, h: 226.5, r: [65, 85, 45, 45] },
  eyes: [
    { cx: 239.5, cy: 257.5, w: 24.5, h: 53.5, rot: 90 },
    { cx: 363.5, cy: 257.5, w: 24.5, h: 53.5, rot: 90 },
  ],
  mouth: { cx: 301.5, cy: 304.5, w: 54, h: 22 },
  dot: { cx: 393.5, cy: 76.5, r: 25 },
  notchDir: -53,
  gaugeHalfSpan: 95,
  rig: { arc: 1.3 },
  palette: { shell: '#96c5ed', face: '#f4ead5', ink: '#2b3374', dot: '#fd7351' },
})
