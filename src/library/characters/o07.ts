import { buildCharacter } from '../character'

export const O07 = buildCharacter({
  id: 'o07',
  no: 13,
  name: { en: 'Dotty', zh: '点点' },
  persona: { zh: '一只眼长、一只眼圆，看什么都像在认真打量。', en: 'One long eye, one round one — everything gets a careful once-over.' },
  source: { file: 'reference/options-20/07.png', sha256: '4d15ef7e6fb1974305b0f40d2c5ae26050719848d9a7152ac4394c7f62779fd0', batch: 'options-20', index: '07', size: 512 },
  form: '薄荷壳体在后，靛蓝脸板是一个大圆点，偏右下落在壳上，四角露出薄荷色；左眼竖长胶囊、右眼圆点，不对称的打量脸；左上缺口托信号点。',
  design: {
    revision: 2,
    date: '2026-09-25',
    reason: { en: 'r1 had Zaza’s layout and colours (mint shell behind, square indigo plate bottom-right, dot top-left, long left eye) and differed from it by one eye.', zh: '第 1 版与眨眨（h05）布局和配色相同（薄荷壳在后、靛蓝方脸板贴右下、左上信号点、左眼竖长），只差一只眼。' },
    changes: [
      { en: 'plate: rounded square flush with the shell’s right and bottom edges → a round dot (r110 of the 321 px shell) set low and right, with mint showing all round it', zh: '脸板：与壳右缘、底缘齐平的圆角方块 → 一个大圆点（壳宽 321 中半径 110），偏右下，四周露出薄荷色' },
      { en: 'features re-spaced to sit inside the round plate; the round eye stays round, the long eye stays long', zh: '五官重新排进圆脸板里；圆眼仍是圆眼，长眼仍是长眼' },
    ],
    previous: {
      revision: 1,
      file: 'reference/revisions/o07-r1.svg',
      sha256: '1c72e8e9acb0552c80dbbe2de1be2c97a25e183b99658fd9e7344a4b2d503ea0',
      form: '薄荷壳体在后、靛蓝脸板贴右下；左眼竖长胶囊、右眼圆点，不对称的眨眼脸；左上缺口托信号点。',
    },
  },
  shell: { type: 'rect', x: 42, y: 123, w: 321, h: 309, r: [55, 51, 55, 55], notches: [{ cx: 126.5, cy: 137.5, r: 43, fillet: 10 }] },
  // the plate is a round dot of its own, set low and right on the mint shell
  face: { type: 'circle', cx: 248, cy: 318, r: 110 },
  eyes: [
    { cx: 209, cy: 308, w: 34.5, h: 85.5 },
    { cx: 290, cy: 319, w: 40, h: 40 },
  ],
  mouth: { cx: 251.5, cy: 377, w: 49, h: 19 },
  dot: { cx: 126.5, cy: 137.5, r: 26 },
  notchDir: -90,
  palette: { shell: '#c9f1e5', face: '#2d2e71', ink: '#c9f1e5', dot: '#fe6d4a' },
})
