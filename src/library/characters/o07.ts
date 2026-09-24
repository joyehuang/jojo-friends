import { buildCharacter } from '../character'

export const O07 = buildCharacter({
  id: 'o07',
  no: 13,
  name: { en: 'Dotty', zh: '点点' },
  persona: { zh: '一只眼长、一只眼圆，看什么都像在认真打量。', en: 'One long eye, one round one — everything gets a careful once-over.' },
  source: { file: 'reference/options-20/07.png', sha256: '4d15ef7e6fb1974305b0f40d2c5ae26050719848d9a7152ac4394c7f62779fd0', batch: 'options-20', index: '07', size: 512 },
  form: '薄荷壳体在后、靛蓝脸板贴右下；左眼竖长胶囊、右眼圆点，不对称的眨眼脸；左上缺口托信号点。',
  shell: { type: 'rect', x: 42, y: 123, w: 321, h: 309, r: [55, 51, 55, 55], notches: [{ cx: 126.5, cy: 137.5, r: 43, fillet: 10 }] },
  face: { type: 'rect', x: 96, y: 201, w: 267, h: 231, r: [55, 48, 55, 44] },
  eyes: [
    { cx: 163, cy: 295.5, w: 41, h: 108 },
    { cx: 280, cy: 310.5, w: 39.5, h: 39.5 },
  ],
  mouth: { cx: 227.5, cy: 377, w: 64, h: 23 },
  dot: { cx: 126.5, cy: 137.5, r: 26 },
  notchDir: -90,
  palette: { shell: '#c9f1e5', face: '#2d2e71', ink: '#c9f1e5', dot: '#fe6d4a' },
})
