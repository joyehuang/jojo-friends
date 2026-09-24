import { buildCharacter } from '../character'

export const O06 = buildCharacter({
  id: 'o06',
  no: 12,
  name: { en: 'Dudu', zh: '嘟嘟' },
  persona: { zh: '眯着眼、嘟着嘴，像在认真吹一个泡泡。', en: 'Squinting, lips pursed, seriously blowing an invisible bubble.' },
  source: { file: 'reference/options-20/06.png', sha256: 'ea6229a789d6702719db8242f199d03681342e8a1c1aec98895bae1b9ea2ef74', batch: 'options-20', index: '06', size: 512 },
  form: '靛蓝壳体，奶油色脸板贴左下、左缘只留一条细边、右侧与顶部露出宽边；一对眯成横线的眼和一个小圆方“嘟”嘴；右上角被大缺口咬去，托着信号点。',
  cleanup: ['straightened the plate’s left edge: it leaned out ~4px towards the bottom while the right edge stayed vertical'],
  shell: { type: 'rect', x: 92, y: 122.5, w: 320.5, h: 309, r: [56, 58, 56, 53], notches: [{ cx: 346, cy: 141.8, r: 43.3, fillet: 6 }] },
  face: { type: 'rect', x: 99.5, y: 202.5, w: 261, h: 229, r: [52, 55, 45, 43] },
  eyes: [
    { cx: 175.5, cy: 315, w: 23, h: 60, rot: 90 },
    { cx: 292.5, cy: 315, w: 23, h: 60, rot: 90 },
  ],
  // a hair wider than tall: a zero-length (w === h) mouth path renders nothing at rest
  mouth: { cx: 229, cy: 379, w: 41, h: 38 },
  dot: { cx: 346, cy: 141.8, r: 25.5 },
  notchDir: -90,
  // the dot sits in the top-right corner; puzzled/curious tilt it right, so the small-size gauge needs room inside the tight frame
  gaugeHalfSpan: 70,
  // tiny sleepy dashes and a small round mouth: give the reshaped arcs and the smile/laugh width enough size to read
  rig: { arc: 1.4, arcThick: 0.85, mouthW: 4, mouthCurve: 1.1 },
  fit: { size: 0.92 },
  palette: { shell: '#2d2e71', face: '#f5e8d4', ink: '#2d2e71', dot: '#fe6c4a' },
})
