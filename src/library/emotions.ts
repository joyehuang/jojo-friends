import { bump, stepTo, TAU, track, type Track } from './motion'
import type { PoseDelta } from './pose'

export const EMOTION_IDS = [
  'calm', 'focus', 'think', 'puzzled', 'curious',
  'happy', 'laugh', 'smug', 'shy', 'celebrate',
  'surprised', 'angry', 'sleepy',
  'aggrieved', 'cry', 'sob',
] as const

export type EmotionId = (typeof EMOTION_IDS)[number]

export type EmotionGroup = 'daily' | 'bright' | 'swing' | 'blue'

export const EMOTION_GROUPS: Record<EmotionGroup, string> = {
  daily: '日常',
  bright: '明亮',
  swing: '起伏',
  blue: '难过（逐级加重）',
}

export interface EmotionDef {
  id: EmotionId
  /** Chinese label shown in the demo */
  label: string
  en: string
  group: EmotionGroup
  /** one line on what makes this face readable, for the demo and docs */
  cue: string
  /** absolute pose values at full intensity (unlisted keys stay at baseline) */
  pose: PoseDelta
  /** idle blink interval in seconds, or false when the eyes are shut/arched */
  blink: false | { min: number; max: number; slow?: boolean }
  /** 0..1, how much an external gaze target (pointer/centre) may override the pose's own look */
  gazeFollow: number
  /** 0..1 amplitude of small idle saccades in auto gaze */
  drift: number
  breath: { period: number; amp: number }
  /** additive entrance: anticipation → action → settle */
  enter?: Track
  /** additive idle loop, t in seconds since the emotion began */
  loop?: (t: number) => PoseDelta
  /** effect clocks */
  fx?: { dropPeriod?: number; flow?: number; confettiPeriod?: number; zPeriod?: number }
}

const E: EmotionDef[] = [
  {
    id: 'calm', label: '平静', en: 'Calm', group: 'daily',
    cue: '原图基线：竖槽眼、短横口，只有呼吸和偶尔眨眼。',
    pose: {},
    blink: { min: 2.6, max: 5.8 }, gazeFollow: 1, drift: 1,
    breath: { period: 3.8, amp: 1 },
  },
  {
    id: 'focus', label: '专注', en: 'Focused', group: 'daily',
    cue: '上眼睑压平、目光落向右下，像在读内容；口变短，身体微微前倾。',
    pose: {
      lookX: 0.3, lookY: 0.6,
      lLidTop: 0.34, rLidTop: 0.34, lLidTilt: 0.08, rLidTilt: 0.08, lLen: 118, rLen: 98,
      mW: 84, mThick: 42, mDy: 4,
      rot: 1.6, ty: 5,
      dotS: 0.94, dotY: 3,
    },
    blink: { min: 3.8, max: 7.5 }, gazeFollow: 0.25, drift: 0.2,
    breath: { period: 4.4, amp: 0.7 },
    enter: track([[0.14, { ty: -4, lookY: -0.15 }], [0.38, { ty: 2 }], [0.6, {}]]),
    // reading: eyes hop left→right in small steps, then return
    loop: (t) => {
      const c = t % 3.6
      const x = -0.22 + 0.2 * stepTo(c, 0.9, 0.12) + 0.2 * stepTo(c, 1.8, 0.12) - 0.4 * stepTo(c, 3.1, 0.3)
      return { lookX: x, ty: bump(c, 3.05, 0.5) * -1.5 }
    },
  },
  {
    id: 'think', label: '思考', en: 'Thinking', group: 'daily',
    cue: '目光稍向上、一只眼略眯；信号点“嗒嗒嗒—停”地打节拍，不旋转。',
    pose: {
      lookX: -0.45, lookY: -0.85,
      lLen: 136, lDy: -6,
      rLidTop: 0.2, rLidTilt: -0.12, rLen: 100,
      brow: 1, lBrowDy: -20, lBrowRot: -8, rBrowDy: 10, rBrowRot: 6,
      mDx: 22, mW: 64, mThick: 40, mRot: -9, mU1: 4, mU2: -4, mL1: 4, mL2: -4,
      rot: -3, tx: -5,
      dotX: -4, dotY: -8,
    },
    blink: { min: 2.2, max: 4.2 }, gazeFollow: 0.3, drift: 0,
    breath: { period: 4.2, amp: 0.8 },
    enter: track([[0.16, { lookY: 0.35, ty: 3 }], [0.42, { lookY: -0.12, ty: -2 }], [0.7, {}]]),
    loop: (t) => {
      // gaze: hold up-left, drift to up-right, hold, come back (5.6s)
      const g = t % 5.6
      const side = stepTo(g, 2.3, 0.45) - stepTo(g, 4.9, 0.45)
      // signal dot: three beats then a pause (2.4s)
      const b = t % 2.4
      const beat = bump(b, 0, 0.2) + bump(b, 0.3, 0.2) + bump(b, 0.6, 0.2)
      return {
        lookX: 0.42 * side, mDx: 10 * side, rot: 1.2 * side,
        dotY: -13 * beat, dotS: 0.05 * beat,
      }
    },
  },
  {
    id: 'puzzled', label: '疑惑', en: 'Puzzled', group: 'daily',
    cue: '歪头、两眼一高一低、嘴成小波浪；像在说“嗯？”',
    pose: {
      rot: 8, tx: 4,
      lLen: 70, lDy: 16, lLidTop: 0.12,
      rLen: 132, rDy: -12,
      brow: 1, lBrowDy: 12, lBrowRot: 10, rBrowDy: -28, rBrowRot: -12,
      mW: 88, mThick: 40, mDx: -8, mRot: 6, mU1: -12, mU2: 12, mL1: -12, mL2: 12,
      lookX: 0.12, lookY: -0.15,
      dotX: 10, dotY: -8,
    },
    blink: { min: 2.4, max: 4.6 }, gazeFollow: 0.5, drift: 0.3,
    breath: { period: 3.9, amp: 0.8 },
    enter: track([[0.12, { rot: -5 }], [0.36, { rot: 3, dotY: -10 }], [0.62, {}]]),
    loop: (t) => {
      const c = t % 3.8
      return {
        rot: 1.6 * bump(c, 1.6, 1.4),
        lLidTop: 0.16 * bump(c, 2.0, 0.6),
        mU1: 5 * Math.sin((t * TAU) / 1.9), mL1: 5 * Math.sin((t * TAU) / 1.9),
      }
    },
  },
  {
    id: 'curious', label: '好奇', en: 'Curious', group: 'daily',
    cue: '眼睛变大带高光、身体探向一侧、小圆嘴；信号点竖起来。',
    pose: {
      lLen: 136, lThick: 80, rLen: 112, rThick: 124, lDy: -6, rDy: -6,
      shine: 1,
      lookX: 0.8, lookY: -0.12,
      tx: 12, rot: 4, sy: 1.02,
      mW: 14, mThick: 46, mU1: -20, mU2: -20, mL1: 20, mL2: 20, mDx: 6,
      brow: 0.6, lBrowDy: -14, rBrowDy: -14,
      dotY: -22, dotS: 1.08, dotGlow: 0.2,
    },
    blink: { min: 2.4, max: 5 }, gazeFollow: 0.85, drift: 0.4,
    breath: { period: 3.4, amp: 0.9 },
    enter: track([[0.1, { tx: -7, sy: -0.03 }], [0.3, { tx: 6, sy: 0.02, dotY: -10 }], [0.56, {}]]),
    loop: (t) => ({
      tx: 3 * Math.sin((t * TAU) / 2.6),
      rot: 0.8 * Math.sin((t * TAU) / 2.6),
      lookX: 0.14 * Math.sin((t * TAU) / 3.3),
      dotY: -5 * Math.sin((t * TAU) / 2.6 - 0.8),
    }),
  },
  {
    id: 'happy', label: '开心', en: 'Happy', group: 'bright',
    cue: '眼睛弯成两道拱、嘴角上扬、轻轻颠；信号点跟着晚半拍。',
    pose: {
      lRot: 90, lLen: 58, lThick: 42, lBend: 26, lDy: 14,
      rRot: 90, rLen: 82, rThick: 46, rBend: 32, rDy: 10,
      mW: 132, mThick: 44, mU1: 30, mU2: 30, mL1: 30, mL2: 30,
      blush: 0.45,
      ty: -4, sy: 1.01,
      dotY: -8, dotS: 1.04,
    },
    blink: false, gazeFollow: 0.6, drift: 0.3,
    breath: { period: 3.2, amp: 0.8 },
    enter: track([
      [0.08, { sy: -0.04, sx: 0.03, ty: 3 }],
      [0.24, { sy: 0.03, sx: -0.02, ty: -16, dotY: -12 }],
      [0.44, { ty: -2, dotY: -14 }],
      [0.62, {}],
    ]),
    loop: (t) => {
      const b = 0.5 - 0.5 * Math.cos((t * TAU) / 1.2)
      const d = 0.5 - 0.5 * Math.cos(((t - 0.14) * TAU) / 1.2)
      return { ty: -6 * b, sy: 0.008 * b, dotY: -7 * d }
    },
  },
  {
    id: 'laugh', label: '大笑', en: 'Laughing', group: 'bright',
    cue: '眼睛挤成 ^ ^、嘴大张露出舌头、一阵一阵地笑到后仰。',
    pose: {
      lRot: 90, lLen: 64, lThick: 38, lBend: 36, lSharp: 1, lDy: 4,
      rRot: 90, rLen: 86, rThick: 42, rBend: 42, rSharp: 1, rDy: 0,
      mW: 150, mThick: 36, mU1: 6, mU2: 6, mL1: 104, mL2: 104, mDy: -6, tongue: 1,
      blush: 0.5,
      rot: -4, ty: -4,
      dotY: -12,
    },
    blink: false, gazeFollow: 0, drift: 0,
    breath: { period: 3, amp: 0.4 },
    enter: track([
      [0.08, { sy: -0.05, sx: 0.04, ty: 3 }],
      [0.26, { sy: 0.04, ty: -18, rot: -3, dotY: -18 }],
      [0.5, {}],
    ]),
    // fits of laughter: 1.3s of bouncing, 0.6s breather
    loop: (t) => {
      const c = t % 1.9
      const env = c < 1.3 ? Math.sin((Math.PI * c) / 1.3) : 0
      const hop = Math.abs(Math.sin(c * TAU * 1.35))
      return {
        ty: -8 * env * hop, sy: 0.02 * env * (hop - 0.5), rot: -1.8 * env * Math.sin(c * TAU * 0.9),
        mL1: 14 * env * (hop - 0.5), mL2: 14 * env * (hop - 0.5),
        dotY: -9 * env * Math.abs(Math.sin((c - 0.08) * TAU * 1.35)),
      }
    },
  },
  {
    id: 'smug', label: '得意', en: 'Smug', group: 'bright',
    cue: '半垂眼皮、斜眼看人、一边嘴角翘起；下巴微抬，信号点偶尔闪一下。',
    pose: {
      lLidTop: 0.48, rLidTop: 0.52, lLidTilt: -0.06, rLidTilt: -0.06,
      lookX: 0.6, lookY: 0.05,
      brow: 0.8, rBrowDy: -18, rBrowRot: -6, lBrowDy: 6,
      mW: 112, mThick: 42, mRot: -10, mDx: 8, mU1: 2, mU2: 20, mL1: 2, mL2: 20,
      rot: -4, ty: -6, sx: 1.01,
      dotX: 12, dotY: -6,
    },
    blink: { min: 3.2, max: 6.5 }, gazeFollow: 0.3, drift: 0.2,
    breath: { period: 4.6, amp: 0.8 },
    enter: track([[0.14, { rot: 2, ty: 4 }], [0.4, { rot: -2.5, ty: -4 }], [0.72, {}]]),
    loop: (t) => {
      const c = t % 4.2
      return {
        rot: 1 * Math.sin((t * TAU) / 4.2),
        dotGlow: 0.55 * bump(c, 2.6, 0.5), dotS: 0.06 * bump(c, 2.6, 0.5),
        mU2: 6 * bump(c, 2.5, 0.6), mL2: 6 * bump(c, 2.5, 0.6),
      }
    },
  },
  {
    id: 'shy', label: '害羞', en: 'Shy', group: 'bright',
    cue: '眼睛变小往下看、脸颊泛红、身体缩一下；偶尔偷瞄一眼。',
    pose: {
      lLen: 104, lThick: 60, rLen: 86, rThick: 98,
      lLidBot: 0.2, rLidBot: 0.2,
      lookX: -0.6, lookY: 0.62,
      blush: 1,
      mW: 58, mThick: 36, mDx: -22, mU1: -7, mU2: 7, mL1: -7, mL2: 7,
      sx: 0.97, sy: 0.965, rot: -3, tx: -8,
      dotY: 14, dotS: 0.9,
    },
    blink: { min: 1.6, max: 3.2 }, gazeFollow: 0.2, drift: 0.2,
    breath: { period: 3.4, amp: 0.8 },
    enter: track([[0.1, { ty: -4 }], [0.3, { sx: -0.03, sy: -0.03, ty: 4 }], [0.6, {}]]),
    loop: (t) => {
      const c = t % 4
      const peek = bump(c, 1.6, 0.9)
      return {
        lookY: -0.5 * peek, lookX: 0.45 * peek,
        blush: 0.1 * Math.sin((t * TAU) / 2),
        tx: 2.5 * Math.sin((t * TAU) / 4),
      }
    },
  },
  {
    id: 'celebrate', label: '庆祝', en: 'Celebrating', group: 'bright',
    cue: '先蹲后跳，信号点飞起撒出彩屑；之后每隔一会儿小跳一下。',
    pose: {
      lRot: 90, lLen: 62, lThick: 40, lBend: 32, lSharp: 0.82, lDy: 6,
      rRot: 90, rLen: 84, rThick: 44, rBend: 38, rSharp: 0.82, rDy: 2,
      mW: 146, mThick: 38, mU1: 14, mU2: 14, mL1: 88, mL2: 88, mDy: -4, tongue: 0.8,
      blush: 0.4,
      ty: -8,
      dotY: -26, dotS: 1.1, dotGlow: 0.6,
      confetti: 1,
    },
    blink: false, gazeFollow: 0, drift: 0,
    breath: { period: 3, amp: 0.5 },
    enter: track([
      [0.1, { sy: -0.08, sx: 0.05, ty: 6 }],
      [0.3, { sy: 0.06, sx: -0.04, ty: -58, dotY: -44 }],
      [0.52, { ty: -22, dotY: -30 }],
      [0.7, { ty: 3, sy: -0.03, sx: 0.02 }],
      [0.9, {}],
    ]),
    loop: (t) => {
      const c = t % 1.7
      const squash = bump(c, 0, 0.16)
      const air = bump(c, 0.12, 0.5)
      const land = bump(c, 0.58, 0.16)
      return {
        ty: 3 * squash - 20 * air + 2 * land,
        sy: -0.04 * squash + 0.03 * air - 0.03 * land,
        sx: 0.03 * squash - 0.02 * air + 0.02 * land,
        dotY: -12 * bump(c, 0.2, 0.55),
      }
    },
    fx: { confettiPeriod: 3.4 },
  },
  {
    id: 'surprised', label: '惊讶', en: 'Surprised', group: 'swing',
    cue: '先一缩再弹起，眼睛变大变圆、嘴成 O，信号点蹦高再落回。',
    pose: {
      lLen: 86, lThick: 96, lDy: -12, rLen: 76, rThick: 140, rDy: -14,
      shine: 0.9,
      brow: 1, lBrowDy: -30, rBrowDy: -30, lBrowRot: -4, rBrowRot: -4,
      mW: 18, mThick: 50, mU1: -34, mU2: -34, mL1: 34, mL2: 34, mDx: -2,
      sy: 1.04, ty: -10,
      dotY: -30, dotS: 1.12,
    },
    blink: { min: 3.2, max: 6 }, gazeFollow: 0.5, drift: 0,
    breath: { period: 3.6, amp: 0.6 },
    enter: track([
      [0.07, { sy: -0.07, sx: 0.05, ty: 5, lOpen: -0.35, rOpen: -0.35 }],
      [0.2, { sy: 0.06, sx: -0.04, ty: -30, dotY: -52, dotS: 0.18 }],
      [0.42, { ty: -6, dotY: -18 }],
      [0.66, {}],
    ]),
    loop: (t) => ({ dotY: -4 * Math.sin((t * TAU) / 2.2) }),
  },
  {
    id: 'angry', label: '生气', en: 'Angry', group: 'swing',
    cue: '上眼睑向内压成八字、口变紧下撇、身体压低前倾；只是“哼”，不吓人。',
    pose: {
      lLidTop: 0.34, lLidTilt: 0.5, rLidTop: 0.34, rLidTilt: 0.5,
      lLen: 112, rLen: 94, lDy: 6, rDy: 6,
      brow: 1, lBrowDy: 6, rBrowDy: 8, lBrowRot: 22, rBrowRot: 22,
      mW: 98, mThick: 44, mU1: -22, mU2: -22, mL1: -22, mL2: -22, mDy: 8,
      rot: 3, ty: 5, sx: 1.02, sy: 0.975,
      dotS: 1.12, dotGlow: 0.45, dotY: 3,
    },
    blink: { min: 3, max: 6 }, gazeFollow: 0.4, drift: 0.1,
    breath: { period: 2.8, amp: 1.2 },
    enter: track([
      [0.06, { rot: 2.4 }], [0.13, { rot: -2.4 }], [0.2, { rot: 1.8 }], [0.27, { rot: -1.2 }],
      [0.34, { rot: 0.6, sx: 0.02 }], [0.5, {}],
    ]),
    // periodic "hmph": puff up, dot flares, then relax
    loop: (t) => {
      const h = bump(t % 2.6, 0.1, 0.5)
      return { sx: 0.03 * h, sy: -0.03 * h, ty: 3 * h, dotS: 0.12 * h, dotGlow: 0.3 * h, mW: -12 * h }
    },
  },
  {
    id: 'sleepy', label: '困倦', en: 'Sleepy', group: 'swing',
    cue: '眼皮重得快合上，头一点一点往下掉又猛地醒；入场先打个小哈欠。',
    pose: {
      lLidTop: 0.66, rLidTop: 0.66, lLidTilt: -0.12, rLidTilt: -0.12, lDy: 14, rDy: 14,
      lookY: 0.3,
      mW: 44, mThick: 34, mU1: -4, mU2: -4, mL1: 16, mL2: 16, mDx: -6,
      rot: 5, ty: 9, sy: 0.98,
      dotY: 14, dotS: 0.88,
      zzz: 1,
    },
    blink: { min: 4, max: 7, slow: true }, gazeFollow: 0.15, drift: 0,
    breath: { period: 5.6, amp: 1.5 },
    enter: track([
      [0.25, { ty: -5, mL1: 30, mL2: 30, mU1: -10, mU2: -10, mW: 16, lLidTop: 0.2, rLidTop: 0.2 }],
      [0.9, { mL1: 36, mL2: 36, mU1: -12, mU2: -12, mW: 18, lLidTop: 0.26, rLidTop: 0.26 }],
      [1.3, {}],
    ]),
    // nodding off: slow droop, quick jerk awake, settle (6.4s)
    loop: (t) => {
      const c = t % 6.4
      const droop = stepTo(c, 0.4, 4.1) * (1 - stepTo(c, 4.6, 0.25))
      const wake = bump(c, 4.55, 0.7)
      return {
        rot: 4 * droop - 1.5 * wake, ty: 8 * droop - 5 * wake,
        lLidTop: 0.26 * droop - 0.22 * wake, rLidTop: 0.26 * droop - 0.22 * wake,
        dotY: 6 * droop - 8 * wake,
      }
    },
    fx: { zPeriod: 3.4 },
  },
  {
    id: 'aggrieved', label: '委屈', en: 'Aggrieved', group: 'blue',
    cue: '外眼角下垂、大眼含泪（不掉）、嘴抿成颤动的小弧；身体往下缩。',
    pose: {
      lLen: 118, lThick: 78, rLen: 98, rThick: 118,
      lLidTop: 0.14, rLidTop: 0.14, lLidTilt: -0.34, rLidTilt: -0.34,
      shine: 1, tearPool: 0.9,
      lookY: 0.12, lookX: -0.1,
      brow: 1, lBrowDy: -10, rBrowDy: -10, lBrowRot: -18, rBrowRot: -18,
      mW: 80, mThick: 38, mU1: -12, mU2: -12, mL1: -12, mL2: -12, mDy: 8, mDx: -10,
      sx: 0.985, sy: 0.97, ty: 7, rot: 2,
      dotY: 16, dotS: 0.92,
    },
    blink: { min: 1.8, max: 3.4 }, gazeFollow: 0.3, drift: 0.15,
    breath: { period: 3.2, amp: 1 },
    enter: track([[0.2, { ty: 6, sy: -0.03 }], [0.5, {}]]),
    loop: (t) => {
      const w = Math.sin(t * TAU * 3.1)
      const sniff = bump(t % 3.3, 2.4, 0.3)
      return {
        mU1: 3 * w, mL1: 3 * w, mU2: -3 * w, mL2: -3 * w,
        tearPool: 0.08 * Math.sin((t * TAU) / 1.4),
        sy: 0.014 * sniff, ty: -2 * sniff,
      }
    },
  },
  {
    id: 'cry', label: '轻哭', en: 'Crying', group: 'blue',
    cue: '眼睛半闭下垂，泪珠一颗一颗从两眼滑落；嘴颤着微张，时不时抽一下。',
    pose: {
      lLen: 96, rLen: 78, lDy: 8, rDy: 8,
      lLidTop: 0.3, rLidTop: 0.3, lLidTilt: -0.4, rLidTilt: -0.4,
      shine: 0.6, tearPool: 0.5, tears: 1,
      lookY: 0.25,
      brow: 1, lBrowDy: -6, rBrowDy: -6, lBrowRot: -22, rBrowRot: -22,
      mW: 92, mThick: 38, mDx: -30, mDy: 6, mU1: -24, mU2: -24, mL1: 2, mL2: 2,
      sy: 0.97, ty: 8, rot: -2,
      dotY: 18, dotS: 0.9,
    },
    blink: { min: 2.2, max: 4 }, gazeFollow: 0.15, drift: 0,
    breath: { period: 3, amp: 1.1 },
    enter: track([[0.14, { ty: -4 }], [0.32, { ty: 5, sy: -0.02 }], [0.6, {}]]),
    loop: (t) => {
      const h = bump(t % 2.7, 1.9, 0.26)
      const w = Math.sin(t * TAU * 3.6)
      return {
        ty: -5 * h, sy: 0.02 * h, lOpen: -0.2 * h, rOpen: -0.2 * h,
        mU1: 3 * w, mU2: -3 * w, mL1: 4 * w, mL2: -4 * w,
      }
    },
    fx: { dropPeriod: 2.3 },
  },
  {
    id: 'sob', label: '嚎啕', en: 'Sobbing', group: 'blue',
    cue: '眼睛挤成 > <、嘴大张往下哭、两道泪流不停，身体一抽一抽。',
    pose: {
      lLen: 66, lThick: 36, lBend: 30, lSharp: 1, lDy: 4,
      rLen: 76, rThick: 40, rBend: -34, rSharp: 1, rDy: 0,
      tears: 0.9, stream: 1,
      brow: 1, lBrowDy: -2, rBrowDy: -4, lBrowRot: -26, rBrowRot: -26,
      mW: 132, mThick: 38, mDx: -36, mDy: -6, mU1: -30, mU2: -30, mL1: 84, mL2: 84, tongue: 0.7,
      sx: 1.02, sy: 0.965, ty: 4,
      dotY: 10, dotS: 0.95,
    },
    blink: false, gazeFollow: 0, drift: 0,
    breath: { period: 3, amp: 0.3 },
    enter: track([
      [0.1, { sy: -0.05, ty: 4 }],
      [0.26, { sy: 0.05, ty: -12, mL1: 14, mL2: 14 }],
      [0.52, {}],
    ]),
    // heaving sobs: a strong pull every 0.95s, a smaller one between
    loop: (t) => {
      const c = t % 0.95
      const heave = bump(c, 0, 0.5) + 0.45 * bump(c, 0.5, 0.4)
      return {
        ty: -5 * heave, sy: 0.022 * heave, sx: -0.012 * heave, rot: 1.4 * Math.sin(t * TAU / 1.9),
        mL1: 11 * heave, mL2: 11 * heave, mW: 8 * heave,
        dotX: 2.5 * Math.sin(t * TAU * 4.2), dotY: -4 * heave,
      }
    },
    fx: { dropPeriod: 1.25, flow: 90 },
  },
]

export const EMOTIONS: Record<EmotionId, EmotionDef> = Object.fromEntries(E.map((e) => [e.id, e])) as Record<
  EmotionId,
  EmotionDef
>

export const EMOTION_LIST: readonly EmotionDef[] = EMOTION_IDS.map((id) => EMOTIONS[id])

export function isEmotionId(v: unknown): v is EmotionId {
  return typeof v === 'string' && (EMOTION_IDS as readonly string[]).includes(v)
}
