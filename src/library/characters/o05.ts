import { buildCharacter } from '../character'

export const O05 = buildCharacter({
  id: 'o05',
  no: 11,
  name: { en: 'Pocket', zh: '兜兜' },
  persona: { zh: '脸板从口袋里探出一截，总是急着给你看点什么。', en: 'Its plate pokes out of the pocket, always eager to show you something.' },
  source: { file: 'reference/options-20/05.png', sha256: '99511e487be596386db51880f93b67470ace145cba43b8641d1717c3a7edf9fc', batch: 'options-20', index: '05', size: 512 },
  form: '靛蓝壳体是一只矮宽的口袋，只在左侧和底边露出；薄荷脸板像卡片一样从口袋里向右上方探出壳外；一对等大的短豆豆眼、居中短横嘴；口袋左肩缺口托信号点。',
  design: {
    revision: 2,
    date: '2026-09-25',
    reason: { en: 'r1 shared Jojo’s face (indigo frame top-left, mint plate bottom-right, thin + thick eyes, offset dash mouth) and read as the same character at icon size.', zh: '第 1 版与 Jojo 同一张脸（左上靛蓝框、右下薄荷脸板、一细一粗眼、偏右横嘴），小尺寸下像同一个角色。' },
    changes: [
      { en: 'shell: tall rounded block → a low, wide pocket that shows only on the left and along the bottom', zh: '壳体：高方块 → 一只矮宽的口袋，只在左侧和底边露出' },
      { en: 'plate: overhangs up and to the right like a card pulled out of the pocket (was: overhanging only on the right, flush with the top)', zh: '脸板：像从口袋里抽出的卡片，向右上方探出（原先只向右探出、与顶边齐平）' },
      { en: 'notch + dot: from the top edge of the whole body to the pocket’s left shoulder, a third of the way down', zh: '缺口与信号点：从整只角色的顶边移到口袋左肩，约在三分之一高度' },
      { en: 'eyes: one thin + one thick capsule → a matched pair of short bean eyes; mouth centred instead of offset right', zh: '眼睛：一细一粗胶囊 → 一对等大的短豆豆眼；嘴从偏右改为居中' },
    ],
    previous: {
      revision: 1,
      file: 'reference/revisions/o05-r1.svg',
      sha256: '4d210a4874f11869392dd792577ad3a8801cf0e3bacbe6e2b5ce0a47d92f37f4',
      form: '靛蓝壳体在后，薄荷色脸板向右探出壳外；脸板右下角是一个更短的圆角小台阶，与主体圆角相接成凹痕；靛蓝眼一细一粗、一字嘴偏右；左上缺口托信号点。',
      cleanup: ['levelled the top edge: the lobe left of the notch sat ~7px lower than the rest of the top'],
    },
  },
  // the pocket: a wide, low indigo pouch; the card rises out of it, up and to the right
  shell: { type: 'rect', x: 30, y: 176, w: 364, h: 262, r: [52, 40, 66, 64], notches: [{ cx: 98, cy: 188, r: 43, fillet: 14 }] },
  face: { type: 'rect', x: 152, y: 70, w: 312, h: 296, r: [46, 58, 40, 30] },
  faceClip: 'none',
  silhouette: 'shell+face',
  eyes: [
    { cx: 254, cy: 202, w: 52, h: 76 },
    { cx: 364, cy: 202, w: 52, h: 76 },
  ],
  mouth: { cx: 309, cy: 282, w: 60, h: 22 },
  dot: { cx: 98, cy: 187, r: 25 },
  notchDir: -90,
  palette: { shell: '#2c3371', face: '#cdf4e9', ink: '#2c3371', dot: '#fe6c49' },
})
