import type { CharId } from './types'

/**
 * Who does which job when the town opens for the first time.
 *
 * 改这里就能换分工：左边是角色 id（见 docs/CHARACTERS.md），右边是岗位 id（见
 * roles.ts）。写 null 的伙伴是“候补”，在镇上自由活动，随时可以在名册里给 TA 派岗位。
 * 在小镇里改过的分工只保存在你自己的浏览器里，不会改这个文件。
 */
export const DEFAULT_ROSTER: Readonly<Record<CharId, string | null>> = {
  jojo: 'dispatch', // 调度总管：最早的那一个，安静靠谱
  o12: 'brief', // 空空 · 晨报员：信号点是一颗小太阳
  o13: 'geo', // 酱酱 · GEO 内容写手
  o14: 'compare', // 瞄瞄 · 竞品对比写手：悄悄往外瞄
  o02: 'social', // 麻薯 · 社媒运营
  o05: 'deck', // 兜兜 · 分享 PPT：总是急着给你看点什么
  o15: 'designer', // 马卡 · 设计师
  o10: 'scout', // 泡泡 · 资讯侦察：总像刚发现了什么新鲜事
  o03: 'researcher', // 塔塔 · 深度研究员：头顶的瞭望台
  h04: 'reader', // 眠眠 · 精读分析师：看起来刚睡醒，其实很清醒
  o06: 'seo', // 嘟嘟 · SEO 审核：眯着眼认真看
  o19: 'growth', // 歪歪 · 增长顾问：看世界的角度很特别
  o08: 'builder', // 薇薇 · 开发工程师：一脸“交给我”
  o07: 'reviewer', // 点点 · 代码审查：看什么都认真打量
  h05: 'prkeeper', // 眨眨 · PR 看护：“我懂”
  o11: 'security', // 蒂奇 · 安全审查：认真站岗
  o04: 'qa', // 曲奇 · 测试：被 bug 咬一口也不在意
  o01: 'automation', // 切切 · 自动化脚本：喜欢抄近路
  o18: 'ops', // 夹夹 · 运维值班（Filo 值班版）
  o20: 'mail', // 抱抱 · 邮件管家
  o09: 'docs', // 布丁 · 文档管家
  h02: 'data', // 便当 · 数据分析：把东西整整齐齐码好
  h03: null, // 芋圆 · 候补
  h06: null, // 波波 · 候补
  o16: null, // 米诺 · 候补
  o17: null, // 窝窝 · 候补
}
