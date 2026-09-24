import { buildCharacter } from '../character'

export const O12 = buildCharacter({
  id: 'o12',
  no: 18,
  name: { en: 'Sora', zh: '空空' },
  persona: { zh: '天蓝色的外壳，拱门一样的脸，信号点是一颗小太阳。', en: 'Sky-blue shell, an archway face, and a little sun for a dot.' },
  source: { file: 'reference/options-20/12.png', sha256: '271410a390c2701cc06a62bb264f009d91132b53b0e422f1e42ed51439b43c62', batch: 'options-20', index: '12', size: 512 },
  form: '天蓝方壳，下方正中立着一块更浅的拱门形脸板、底边与壳齐平；左眼略细、右眼略粗，下方短横口；左上缺口托琥珀色信号点。',
  shell: { type: 'rect', x: 27.5, y: 95.5, w: 362, h: 333.5, r: [61, 61, 63, 61], notches: [{ cx: 112.5, cy: 113.5, r: 45, fillet: 10 }] },
  face: { type: 'rect', x: 88.5, y: 236.5, w: 239.5, h: 192.5, r: [55, 55, 0, 0] },
  eyes: [
    { cx: 154, cy: 325, w: 31, h: 79.5 },
    { cx: 258.5, cy: 323.5, w: 38, h: 82.5 },
  ],
  mouth: { cx: 218, cy: 392.5, w: 47, h: 19.5 },
  dot: { cx: 112, cy: 111.5, r: 27.5 },
  notchDir: -90,
  palette: { shell: '#8cc1ed', face: '#c1defa', ink: '#272e71', dot: '#ec9e39', tear: '#3b79d0' },
})
