import { buildCharacter } from '../character'

export const O18 = buildCharacter({
  id: 'o18',
  no: 24,
  name: { en: 'Filo', zh: '夹夹' },
  persona: { zh: '顶上带一个文件夹的小耳朵，喜欢把东西归档。', en: 'A folder tab on top; enjoys putting things where they belong.' },
  source: { file: 'reference/options-20/18.png', sha256: 'f47d0b9d65d20647bbc45311de28561f4cd2fd5a005339fb877f87e63538bfc7', batch: 'options-20', index: '18', size: 512 },
  form: '天蓝壳体像一只文件夹：左上凸起的标签页顺滑地台阶式落到右侧，缺口开在标签页上托着信号点；奶油脸板贴右下。',
  shell: {
    type: 'poly',
    pts: [
      [99, 23.5, 68],
      [283, 23.5, 22],
      [302.5, 64, 22],
      [450.5, 64, 38],
      [450.5, 371.5, 58],
      [99, 371.5, 53.5],
    ],
    notches: [{ cx: 197, cy: 34, r: 47, fillet: 8 }],
  },
  face: { type: 'rect', x: 159.5, y: 128, w: 291, h: 244, r: [60, 48, 56.5, 53] },
  eyes: [
    { cx: 241.5, cy: 243, w: 31, h: 92 },
    { cx: 346, cy: 236.5, w: 51, h: 102 },
  ],
  mouth: { cx: 344.5, cy: 317, w: 87, h: 22.5 },
  dot: { cx: 197, cy: 34, r: 25.5 },
  notchDir: -90,
  palette: { shell: '#89c3f2', face: '#f6e9d4', ink: '#252d6e', dot: '#fe6544' },
})
