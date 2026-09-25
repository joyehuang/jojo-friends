import { buildCharacter } from '../character'

export const O16 = buildCharacter({
  id: 'o16',
  no: 22,
  name: { en: 'Mino', zh: '米诺' },
  persona: { zh: '圆圆的大薄荷脸顶着一顶小壳帽，最会表达情绪。', en: 'A big round mint face under a little shell cap — shows every feeling.' },
  source: { file: 'reference/options-20/16.png', sha256: 'cee4135d0681431e3e3030800dbd03628719cfd91077955fa4175bfa4449cea2', batch: 'options-20', index: '16', size: 512 },
  form: '左右对称：靛蓝壳体只在顶上露出一顶圆拱小帽，正中缺口托信号点；宽大的薄荷脸板比壳更宽、下缘圆鼓，像一张圆脸；一对等大的竖长胶囊眼、居中短横嘴。',
  design: {
    revision: 2,
    date: '2026-09-25',
    reason: { en: 'r1 shared Jojo’s face (indigo strip on the left, mint plate filling the lower right, thin + thick eyes, offset dash mouth) and read as the same character at icon size.', zh: '第 1 版与 Jojo 同一张脸（左侧靛蓝条、右下薄荷大脸板、一细一粗眼、偏右横嘴），小尺寸下像同一个角色。' },
    changes: [
      { en: 'layout: asymmetric (shell showing as a strip on the left) → symmetric, the shell shows only as a rounded cap on top', zh: '布局：不对称（左侧露出一条壳）→ 左右对称，壳只在顶上露出一顶圆拱小帽' },
      { en: 'plate: wider than the shell with big rounded bottom corners — a round, slightly taller face instead of a square one', zh: '脸板：比壳更宽、下缘大圆角，是一张略高的圆脸而不是方脸' },
      { en: 'notch + dot: from left of centre, biting shell and plate, to dead centre on the crown of the cap', zh: '缺口与信号点：从偏左、同时咬进壳和脸板，移到帽顶正中' },
      { en: 'eyes: one thin + one thick capsule → a matched pair of tall capsules; mouth centred instead of offset right', zh: '眼睛：一细一粗胶囊 → 一对等大的竖长胶囊；嘴从偏右改为居中' },
    ],
    previous: {
      revision: 1,
      file: 'reference/revisions/o16-r1.svg',
      sha256: 'e945825f427fdc9ce84cca62f12060e2c5cb4a135dc94999fef9335097c78d70',
      form: '靛蓝壳体只在左侧露出一条，大薄荷脸板占满右下；顶部缺口同时咬进壳和脸板的左上大圆角，托住信号点。',
      cleanup: ['signal dot 27→25 px and raised 2 px, plate bite 48→52 px, so the full-size success pop clears the plate (source ring was too tight)'],
    },
  },
  // a rounded indigo cap on a wide, soft mint face; the notch sits dead centre on the crown
  shell: { type: 'rect', x: 100, y: 44, w: 312, h: 300, r: [104, 104, 60, 60], notches: [{ cx: 256, cy: 54, r: 46, fillet: 14 }] },
  face: { type: 'rect', x: 56, y: 130, w: 400, h: 330, r: [96, 96, 128, 128] },
  faceClip: 'none',
  silhouette: 'shell+face',
  eyes: [
    { cx: 194, cy: 284, w: 56, h: 104 },
    { cx: 318, cy: 284, w: 56, h: 104 },
  ],
  mouth: { cx: 256, cy: 384, w: 72, h: 25 },
  dot: { cx: 256, cy: 52, r: 25 },
  notchDir: -90,
  palette: { shell: '#262d6e', face: '#cbf2e7', ink: '#262d6e', dot: '#fe6946' },
})
