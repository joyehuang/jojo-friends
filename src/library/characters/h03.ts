import { buildCharacter } from '../character'

export const H03 = buildCharacter({
  id: 'h03',
  no: 3,
  name: { en: 'Taro', zh: '芋圆' },
  persona: { zh: '个子高高，信号点挂在侧边，像随时准备举手。', en: 'Tall and patient, with its dot on the side like a hand half-raised.' },
  source: { file: 'reference/h-family/03.png', sha256: '24df5cf2ef5ceb2baf6982aedd88cd3e16804fcc6333ab65e611ff06182383e4', batch: 'h-family', index: '03', size: 512 },
  form: '淡紫竖高壳，薄荷高脸板几乎填满、四周留窄边；靛蓝高胶囊眼与短横嘴；左侧边缘缺口托信号点。',
  shell: { type: 'rect', x: 76.5, y: 97.5, w: 294.5, h: 363.5, r: [68, 57, 60, 60], notches: [{ cx: 84, cy: 211, r: 44, fillet: 12 }] },
  face: { type: 'rect', x: 142, y: 120.5, w: 209.5, h: 324, r: [52, 50, 40, 55] },
  eyes: [
    { cx: 195.5, cy: 289.5, w: 38, h: 122 },
    { cx: 288.5, cy: 289.5, w: 40, h: 122 },
  ],
  mouth: { cx: 244.5, cy: 402.5, w: 66, h: 24 },
  dot: { cx: 84, cy: 211, r: 24.5 },
  notchDir: 180,
  rig: { mouthCurve: 0.9 },
  palette: { shell: '#b1adda', face: '#d0f2e8', ink: '#2b3274', dot: '#fd7451' },
})
