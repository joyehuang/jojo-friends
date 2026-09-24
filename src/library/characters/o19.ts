import { buildCharacter } from '../character'

export const O19 = buildCharacter({
  id: 'o19',
  no: 25,
  name: { en: 'Tilty', zh: '歪歪' },
  persona: { zh: '脸总是歪着一点点，看世界的角度很特别。', en: 'Face always tipped a little — sees the world from its own angle.' },
  source: { file: 'reference/options-20/19.png', sha256: '48df50726172aa797d6d9e02a68b2db20751eff5a0a03a8dcb616540ca35f937', batch: 'options-20', index: '19', size: 512 },
  form: '淡紫方壳里的靛蓝脸板逆时针歪了约九度，薄荷色双眼仍然端正；右上缺口同时咬进壳和脸板一角，托着信号点。',
  cleanup: ['notch 44→48 px and dot raised 2 px so the full-size success pop clears the plate'],
  shell: { type: 'rect', x: 76, y: 31, w: 361, h: 341.5, r: [61, 65, 57, 58.5], notches: [{ cx: 356.5, cy: 54, r: 48, fillet: 6 }] },
  face: { type: 'rect', x: 110.5, y: 96.2, w: 292.2, h: 247.7, r: 33, notches: [{ cx: 382.3, cy: 72.6, r: 48, fillet: 6 }] },
  faceRotate: -9.4,
  eyes: [
    { cx: 200, cy: 215, w: 36.5, h: 97 },
    { cx: 313, cy: 202, w: 56.5, h: 117.5 },
  ],
  mouth: { cx: 307.7, cy: 291.5, w: 86.5, h: 24.5 },
  dot: { cx: 356.5, cy: 52, r: 23 },
  notchDir: -90,
  rig: { mouthCurve: 0.8 },
  palette: { shell: '#bdb2d8', face: '#262e71', ink: '#caf1e7', dot: '#fd6443' },
})
