import type { Character, CharacterSpec } from '../character'
import { CANVAS, FAMILY } from '../character'
import {
  BROW_L, BROW_R, CHEEK_L, CHEEK_R, COLORS, DOT, EYE_L, EYE_R, FACE_BOX, FACE_PATH, MOUTH, PIVOT,
  SHADOW_OFFSET, SHELL_BOX, SHELL_PATH,
} from '../geometry'
import { buildShape } from '../shapes'

/**
 * Jojo, the approved lead. Unlike the companions Jojo is not re-derived by
 * `buildCharacter`: every number below is the frozen constant the approved
 * kit shipped with (geometry.ts), and the rig is the identity, so the
 * component output stays byte-for-byte what was signed off.
 */
export const JOJO_SPEC: CharacterSpec = {
  id: 'jojo',
  no: 1,
  name: { en: 'Jojo', zh: 'Jojo' },
  persona: {
    zh: '家族里最早的那一个，安静靠谱；信号点一亮，就是在认真听。',
    en: 'The eldest of the family: calm, dependable, always listening when the dot is lit.',
  },
  source: {
    file: 'reference/hero-h.png',
    sha256: '4da1bc6dbd38326430fee82fcab0ad3ac1ac22128307997829d5ea4c6a673671',
    originalSha256: '327ecbfadffccf8ddba6e429d6766e9081b0a807f2a03f65f226e5fccbc783c7',
    batch: 'hero',
    index: 'hero-h',
    size: 1254,
  },
  form: '靛蓝圆角壳体，左上 U 形缺口托着珊瑚信号点；薄荷脸板贴右下，左眼细、右眼宽的竖槽眼，短横口。',
  shell: { type: 'path', d: SHELL_PATH, approx: { type: 'rect', x: 260, y: 258, w: 735, h: 700, r: 120 } },
  face: { type: 'path', d: FACE_PATH, approx: { type: 'rect', x: 418, y: 452, w: 577, h: 506, r: [130, 70, 120, 80] } },
  eyes: [
    { cx: EYE_L.cx, cy: EYE_L.cy, w: EYE_L.w, h: EYE_L.h },
    { cx: EYE_R.cx, cy: EYE_R.cy, w: EYE_R.w, h: EYE_R.h },
  ],
  mouth: { cx: MOUTH.cx, cy: MOUTH.cy, w: MOUTH.w, h: MOUTH.h },
  dot: { cx: DOT.cx, cy: DOT.cy, r: DOT.r },
  notchDir: -90,
  palette: { shell: COLORS.indigo, face: COLORS.mint, ink: COLORS.indigo, dot: COLORS.coral },
}

const shell = buildShape(JOJO_SPEC.shell)
const face = buildShape(JOJO_SPEC.face)

export const JOJO: Character = {
  id: JOJO_SPEC.id,
  no: JOJO_SPEC.no,
  name: JOJO_SPEC.name,
  persona: JOJO_SPEC.persona,
  source: JOJO_SPEC.source,
  form: JOJO_SPEC.form,
  cleanup: [],
  spec: JOJO_SPEC,
  fit: { s: 1, tx: 0, ty: 0 },
  shell: { ...shell, box: { ...SHELL_BOX } },
  face: { ...face, box: { ...FACE_BOX } },
  faceClip: true,
  faceRotate: null,
  silhouette: SHELL_PATH,
  eyeL: { ...EYE_L },
  eyeR: { ...EYE_R },
  mouth: { ...MOUTH },
  dot: { ...DOT },
  browL: { ...BROW_L },
  browR: { ...BROW_R },
  browWidth: 20,
  cheekL: { ...CHEEK_L },
  cheekR: { ...CHEEK_R },
  pivot: { ...PIVOT },
  shadowOffset: { ...SHADOW_OFFSET },
  palette: {
    shell: COLORS.indigo,
    shellLift: COLORS.indigoLift,
    shellDeep: COLORS.indigoDeep,
    face: COLORS.mint,
    faceLift: COLORS.mintLift,
    faceDeep: COLORS.mintDeep,
    ink: COLORS.indigo,
    mouth: COLORS.indigo,
    dot: COLORS.coral,
    dotLift: COLORS.coralLift,
    shine: '#effcf7',
    blush: COLORS.blush,
    tear: COLORS.tear,
    tearLift: COLORS.tearLift,
    tongue: COLORS.coralLift,
    shadow: COLORS.shadow,
    offline: COLORS.offline,
    track: COLORS.mint,
    gauge: COLORS.coral,
    trackOpacity: 0.4,
    bubble: '#ffffff',
    bubbleEdge: COLORS.coral,
    ask: COLORS.indigo,
    check: '#ffffff',
    mark: '#fff',
    spark: COLORS.coral,
    confetti: FAMILY.confetti,
  },
  k: { body: 1, face: 1, dot: 1, eye: 1, gaze: 1 },
  tearL: { pool: [6, 18], poolScale: 0.72, drop0: [4, 24], drop1x: -22, drop1y: 904, dropScale: 0.95, s0x: -4, s1: [-10, 70], s2: [-30, 870], s3: [-44, 934] },
  tearR: { pool: [34, 16], poolScale: 0.82, drop0: [40, 22], drop1x: 126, drop1y: 894, dropScale: 1.05, s0x: 44, s1: [62, 70], s2: [104, 860], s3: [124, 926] },
  tearStroke: 24,
  zzz: { x: 1010, y: 292 },
  signal: {
    outward: -90,
    inward: [0, 1],
    gauge: { from: 200, to: -20, full: { gap: 20, width: 20 }, small: { gap: 34, width: 34 } },
    bubble: {
      full: { x: 606, y: 206, w: 178, h: 128, rx: 46, stroke: 10, glyph: 14 },
      small: { x: 598, y: 226, w: 240, h: 170, rx: 60, stroke: 0, glyph: 19 },
      tail: 'left',
    },
    checkBoostSmall: 0.55,
    badgeDir: [0, 1],
    smallDot: 1,
  },
  rig: null,
  solved: null,
}

export const JOJO_VIEWBOX = CANVAS.viewBox
