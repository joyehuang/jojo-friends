import { buildCharacter } from '../character'

export const H02 = buildCharacter({
  id: 'h02',
  no: 2,
  name: { en: 'Bento', zh: '便当' },
  persona: { zh: '横着长的一只，喜欢把东西整整齐齐码好。', en: 'Built wide and tidy — likes everything packed neatly in rows.' },
  source: { file: 'reference/h-family/02.png', sha256: '4c36c3ee8cca18162c0e73e29a2ae998316b7ff4c30dfad801cc0f681b24ecb8', batch: 'h-family', index: '02', size: 512 },
  form: '奶油色宽横壳，靛蓝横向脸板偏左下内嵌；薄荷短胶囊眼与横线嘴；顶边右侧缺口托信号点，缺口右肩略低。',
  shell: { type: 'poly', pts: [[41.5, 175.5, 72], [392, 175.5], [392, 184], [480.5, 184, 50], [480.5, 443, 66], [41.5, 443, 64]], notches: [{ cx: 392, cy: 196, r: 46, fillet: 14 }] },
  face: { type: 'rect', x: 60.5, y: 247.5, w: 337, h: 177, r: [45, 72, 30, 40] },
  eyes: [
    { cx: 161, cy: 334.5, w: 35, h: 62 },
    { cx: 297, cy: 334.5, w: 35, h: 62 },
  ],
  mouth: { cx: 229.5, cy: 380, w: 56, h: 19 },
  dot: { cx: 392, cy: 196, r: 27 },
  notchDir: -90,
  palette: { shell: '#f4ead5', face: '#2b3274', ink: '#cef2e8', dot: '#fd6e4c' },
})
