import filoOnDuty from './variants/filo-on-duty.webp'

/**
 * Static identity looks ("装扮") shown next to a character's own page. They are
 * finished pictures, not character specs: no emotions, statuses or motion, and
 * the character's id, number and default design are unchanged. Display copies
 * only — the masters and build script stay in reference/variants/ (private).
 */
export interface IdentityLook {
  /** Anchor on the character page, e.g. /c/o18#on-duty */
  id: string
  label: { zh: string; en: string }
  src: string
  alt: string
  summary: string
  adds: string[]
}

export const IDENTITY_LOOKS: Record<string, IdentityLook[]> = {
  o18: [
    {
      id: 'on-duty',
      label: { zh: '值班版', en: 'On duty' },
      src: filoOnDuty,
      alt: 'Filo 值班版：天蓝文件夹壳体、奶油脸板和珊瑚红信号点不变，右侧戴着单耳通讯耳麦，壳体右上有一枚心跳守护徽章',
      summary: '值班时的 Filo：轮廓、脸、一大一小的眼睛和珊瑚红信号点都是原样，只多了值班用的小装备。',
      adds: ['单耳通讯耳麦（避开顶上的缺口）', '耳机上一盏薄荷绿指示灯', '壳体右上一枚心跳守护徽章'],
    },
  ],
}
