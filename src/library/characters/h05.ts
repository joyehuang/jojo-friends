import { buildCharacter } from '../character'

export const H05 = buildCharacter({
  id: 'h05',
  no: 5,
  name: { en: 'Zaza', zh: '眨眨' },
  persona: { zh: '一只眼睁着、一只眼眨着，好像在说“我懂”。', en: 'One eye open, one mid-wink, as if to say “got it”.' },
  source: { file: 'reference/h-family/05.png', sha256: '6fe898c0520d88e5e5cf0644c7436086a3f83f72c3cf7b5de1e54cdbb24f5e31', batch: 'h-family', index: '05', size: 512 },
  form: '薄荷壳体在后、只从左侧和顶边露出，靛蓝大脸板贴右下；左眼竖长胶囊、右眼横线，正在眨眼；左上缺口托信号点并咬到脸板角。',
  cleanup: ['plate corner bitten by an r48 circle around the dot instead of the shell notch (r37.5), leaving a thin mint rim, so the working ring and success badge clear the plate'],
  shell: { type: 'poly', pts: [[73, 48.5, 50], [165, 48.5], [165, 42], [430.5, 42, 50], [430.5, 370.5, 55], [73, 370.5, 55]], notches: [{ cx: 165, cy: 56.5, r: 37.5, fillet: 8 }] },
  face: { type: 'rect', x: 137, y: 74.5, w: 293.5, h: 296, r: [78, 53, 55, 65], notches: [{ cx: 165, cy: 56.5, r: 48, fillet: 4 }] },
  eyes: [
    { cx: 221, cy: 217.5, w: 39, h: 104 },
    { cx: 330.5, cy: 229.5, w: 24, h: 60, rot: 90 },
  ],
  mouth: { cx: 285.5, cy: 296, w: 58, h: 19 },
  dot: { cx: 165, cy: 56.5, r: 21 },
  notchDir: -90,
  fit: { size: 0.94 },
  brows: [{ cx: 221, cy: 140.5, len: 35 }, { cx: 330.5, cy: 168, len: 42 }],
  palette: { shell: '#d0f2e8', face: '#2b3275', ink: '#d0f2e8', dot: '#fd7251' },
})
