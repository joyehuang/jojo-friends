import { buildCharacter } from '../character'

export const O10 = buildCharacter({
  id: 'o10',
  no: 16,
  name: { en: 'Pao', zh: '泡泡' },
  persona: { zh: '嘴巴圆圆的，总像刚发现了什么新鲜事。', en: 'A round little mouth, forever just-discovered-something.' },
  source: { file: 'reference/options-20/10.png', sha256: '924826d32a462837ea08f4aae9ce5364c2bac2801f8c44492418866e4ffc6d42', batch: 'options-20', index: '10', size: 512 },
  form: '奶油壳体在后、浅蓝脸板贴右下齐边；一对高挑竖长眼，下方一张奶油色圆嘴；左上缺口托信号点。',
  shell: { type: 'rect', x: 42, y: 44, w: 321, h: 311, r: [55, 52, 55, 55], notches: [{ cx: 116.5, cy: 59, r: 41.5, fillet: 12 }] },
  face: { type: 'rect', x: 96, y: 118, w: 267, h: 237, r: [58, 45, 55, 45] },
  eyes: [
    { cx: 151, cy: 214, w: 35, h: 107 },
    { cx: 305.5, cy: 214, w: 36, h: 107 },
  ],
  mouth: { cx: 227.5, cy: 292.5, w: 45, h: 45 },
  dot: { cx: 116.5, cy: 59, r: 25.5 },
  notchDir: -90,
  rig: { feat: 0.85, mouthW: 2 },
  palette: { shell: '#f5e9d6', face: '#99c5f1', ink: '#2d2f71', mouth: '#f5e9d6', dot: '#fe6c4a', tear: '#3b79d0' },
})
