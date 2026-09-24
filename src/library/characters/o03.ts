import { buildCharacter } from '../character'

export const O03 = buildCharacter({
  id: 'o03',
  no: 9,
  name: { en: 'Tata', zh: '塔塔' },
  persona: { zh: '两层叠起来的小塔，头顶的缺口是它的瞭望台。', en: 'A little two-storey tower; the notch on top is its lookout.' },
  source: { file: 'reference/options-20/03.png', sha256: '66957a380ce117e20589a130ef22ad2846c067b9b2a7006a82d034b55ed90630', batch: 'options-20', index: '03', size: 512 },
  form: '淡紫壳体上下两层：上层较窄、左缘内收，与下层在两侧形成圆角凹口；靛蓝横向脸板，薄荷色眼一细一粗、一字嘴偏右；上层顶边右侧缺口托信号点。',
  // two stacked rounded blocks: each outer corner of the upper tier rounds into the lower body's top edge, leaving a sharp crease on both sides
  shell: {
    type: 'poly',
    pts: [[165.2, 48, 44], [459.6, 48, 44], [459.6, 108.9, 44.4], [459.34, 113.67, 44.4], [458.57, 118.39, 44.4], [457.3, 122.99, 44.4], [455.55, 127.44, 44.4], [453.32, 131.67, 44.4], [450.65, 135.63, 44.4], [447.57, 139.29, 44.4], [444.12, 142.59, 44.4], [440.33, 145.5, 44.4], [436.25, 147.99, 44.4], [431.93, 150.03, 44.4], [427.41, 151.59, 44.4], [422.76, 152.65, 44.4], [418, 153.2, 0], [423.59, 154.99, 53.4], [428.94, 157.37, 53.4], [434, 160.32, 53.4], [438.71, 163.81, 53.4], [443, 167.79, 53.4], [446.83, 172.22, 53.4], [450.16, 177.04, 53.4], [452.94, 182.2, 53.4], [455.13, 187.63, 53.4], [456.72, 193.27, 53.4], [457.68, 199.05, 53.4], [458, 204.9, 53.4], [458, 366.5, 55], [99.5, 366.5, 46], [99.5, 146.6, 36.7], [181.8, 146.6, 0], [178.12, 143.2, 45.6], [174.82, 139.41, 45.6], [171.95, 135.28, 45.6], [169.56, 130.86, 45.6], [167.67, 126.21, 45.6], [166.3, 121.37, 45.6], [165.48, 116.42, 45.6], [165.2, 111.4, 45.6]],
    notches: [{ cx: 381.8, cy: 57.7, r: 41, fillet: 16 }],
  },
  face: { type: 'rect', x: 122, y: 162, w: 278, h: 189, r: 38 },
  eyes: [
    { cx: 212.5, cy: 251, w: 28, h: 81 },
    { cx: 306.5, cy: 244.5, w: 48, h: 90 },
  ],
  mouth: { cx: 306.5, cy: 314, w: 76, h: 21 },
  dot: { cx: 381.8, cy: 57.7, r: 24.5 },
  notchDir: -90,
  cleanup: ['levelled the top edge: the lobe right of the notch sat ~5px lower than the rest of the top'],
  // the short plate leaves little room under the mouth: a slightly smaller laugh/sob opening keeps it on the plate
  rig: { mouthCurve: 0.8 },
  // the dot sits near the right edge; puzzled tilts it right, so the small-size gauge needs a little room inside the tight frame
  fit: { size: 0.92 },
  palette: { shell: '#b7b1d6', face: '#2d3371', ink: '#ccf3e8', dot: '#fe6c49' },
})
