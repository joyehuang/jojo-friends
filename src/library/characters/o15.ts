import { buildCharacter } from '../character'

export const O15 = buildCharacter({
  id: 'o15',
  no: 21,
  name: { en: 'Maca', zh: '马卡' },
  persona: { zh: '一层薄荷夹一层天蓝，像刚出炉的马卡龙。', en: 'Mint, sky-blue, mint — layered like a fresh macaron.' },
  source: { file: 'reference/options-20/15.png', sha256: '4a5cd82a07757a52f204520740d474ae1e9cca4e4c7cb0f2f1a634b13921eaaf', batch: 'options-20', index: '15', size: 512 },
  form: '薄荷方壳中段横贯一条天蓝脸带，靛蓝双竖眼和短嘴都挤在带里；左上缺口托信号点。',
  shell: { type: 'rect', x: 34, y: 31, w: 364, h: 334, r: [65, 65, 61, 65], notches: [{ cx: 127.6, cy: 45.4, r: 45.5, fillet: 10 }] },
  face: { type: 'rect', x: 34, y: 137, w: 363, h: 141, r: 27 },
  eyes: [
    { cx: 142, cy: 205.5, w: 30, h: 76 },
    { cx: 287.5, cy: 205.5, w: 31, h: 76 },
  ],
  mouth: { cx: 215, cy: 243, w: 61, h: 21 },
  dot: { cx: 127.6, cy: 45.4, r: 26.5 },
  notchDir: -90,
  rig: { mouthCurve: 0.8 },
  palette: { shell: '#cdf0e7', face: '#8cc1ed', ink: '#272e71', dot: '#fd6346', tear: '#2f6fd0', tearLift: '#eaf6ff', blush: '#ff8878' },
})
