import { buildCharacter } from '../character'

export const O05 = buildCharacter({
  id: 'o05',
  no: 11,
  name: { en: 'Pocket', zh: '兜兜' },
  persona: { zh: '脸板从口袋里探出一截，总是急着给你看点什么。', en: 'Its plate pokes out of the pocket, always eager to show you something.' },
  source: { file: 'reference/options-20/05.png', sha256: '99511e487be596386db51880f93b67470ace145cba43b8641d1717c3a7edf9fc', batch: 'options-20', index: '05', size: 512 },
  form: '靛蓝壳体在后，薄荷色脸板向右探出壳外；脸板右下角是一个更短的圆角小台阶，与主体圆角相接成凹痕；靛蓝眼一细一粗、一字嘴偏右；左上缺口托信号点。',
  cleanup: ['levelled the top edge: the lobe left of the notch sat ~7px lower than the rest of the top'],
  shell: { type: 'rect', x: 31, y: 49, w: 354.5, h: 317.5, r: [56, 54, 56, 53], notches: [{ cx: 129.1, cy: 61, r: 43, fillet: 16 }] },
  // the plate overhangs the shell on the right; its bottom-right is a shorter rounded step that meets the main corner in a crease
  face: {
    type: 'poly',
    pts: [[105, 126, 66], [437.8, 126, 38], [437.8, 305.4, 36], [437.22, 311.81, 36], [435.52, 318.02, 36], [432.73, 323.82, 36], [428.95, 329.04, 36], [424.31, 333.5, 36], [418.95, 337.06, 36], [413.03, 339.6, 36], [406.76, 341.06, 36], [400.33, 341.37, 36], [393.95, 340.53, 36], [387.82, 338.57, 36], [382.13, 335.55, 0], [378.66, 342.18, 51.6], [374.27, 348.24, 51.6], [369.05, 353.6, 51.6], [363.1, 358.15, 51.6], [356.56, 361.79, 51.6], [349.57, 364.44, 51.6], [342.26, 366.06, 51.6], [334.8, 366.6, 51.6], [105, 366.6, 45.5]],
  },
  faceClip: 'none',
  silhouette: 'shell+face',
  eyes: [
    { cx: 197.5, cy: 240, w: 32, h: 91 },
    { cx: 307.5, cy: 233, w: 54, h: 103 },
  ],
  mouth: { cx: 304.5, cy: 310, w: 78, h: 23 },
  dot: { cx: 129.1, cy: 60.4, r: 25 },
  notchDir: -90,
  palette: { shell: '#2c3371', face: '#cdf4e9', ink: '#2c3371', dot: '#fe6c49' },
})
