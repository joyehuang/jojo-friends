import { buildCharacter } from '../character'

export const O14 = buildCharacter({
  id: 'o14',
  no: 20,
  name: { en: 'Peep', zh: '瞄瞄' },
  persona: { zh: '小脸躲在大身子的角落里，悄悄往外瞄。', en: 'A small face tucked in the corner of a big body, peeking out.' },
  source: { file: 'reference/options-20/14.png', sha256: '64b946fe23f09d20c3181ef87def44164c55df048251382831388fedc603c7e1', batch: 'options-20', index: '14', size: 512 },
  form: '大块奶油方壳，右下角齐边塞着一块小淡紫脸板；左眼细小、右眼粗大，短横口偏在右眼下；左上缺口托信号点。',
  shell: { type: 'rect', x: 84.5, y: 33, w: 343, h: 328.5, r: [65, 62, 54, 62], notches: [{ cx: 179, cy: 48.5, r: 43.5, fillet: 12 }] },
  face: { type: 'rect', x: 232, y: 174.5, w: 195.5, h: 187, r: [40, 34, 54, 34] },
  eyes: [
    { cx: 287, cy: 253, w: 25.5, h: 67.5 },
    { cx: 361, cy: 251, w: 35.5, h: 71.5 },
  ],
  mouth: { cx: 351, cy: 312.5, w: 53.5, h: 18.5 },
  dot: { cx: 179, cy: 46.5, r: 27.5 },
  notchDir: -90,
  palette: { shell: '#f5ebda', face: '#b4b2d6', ink: '#293174', dot: '#fd6649', tear: '#3f86d8' },
})
