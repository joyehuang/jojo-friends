# The 26 characters

中文说明：26 位角色的名字、稳定 id、来源与造型要点。本文件由 `scripts/gen-manifest.ts` 从注册表生成，请勿手改。

Generated from the registry by `scripts/gen-manifest.ts` — do not edit by hand. Machine ids are stable; display names may change. Personas are light fiction, not capabilities.

## No.01 Jojo · Jojo — `jojo`

- 家族里最早的那一个，安静靠谱；信号点一亮，就是在认真听。 / The eldest of the family: calm, dependable, always listening when the dot is lit.
- 造型：靛蓝圆角壳体，左上 U 形缺口托着珊瑚信号点；薄荷脸板贴右下，左眼细、右眼宽的竖槽眼，短横口。
- Source: `reference/hero-h.png` (hero hero-h), identity mean IoU 0.986
- Traits: side-by-side eyes (capsule + capsule), capsule mouth, notch -90°, plate path

## No.02 Bento · 便当 — `h02`

- 横着长的一只，喜欢把东西整整齐齐码好。 / Built wide and tidy — likes everything packed neatly in rows.
- 造型：奶油色宽横壳，靛蓝横向脸板偏左下内嵌；薄荷短胶囊眼与横线嘴；顶边右侧缺口托信号点，缺口右肩略低。
- Source: `reference/h-family/02.png` (h-family 02), identity mean IoU 0.975
- Traits: side-by-side eyes (capsule + capsule), capsule mouth, notch -90°, plate rect

## No.03 Taro · 芋圆 — `h03`

- 个子高高，信号点挂在侧边，像随时准备举手。 / Tall and patient, with its dot on the side like a hand half-raised.
- 造型：淡紫竖高壳，薄荷高脸板几乎填满、四周留窄边；靛蓝高胶囊眼与短横嘴；左侧边缘缺口托信号点。
- Source: `reference/h-family/03.png` (h-family 03), identity mean IoU 0.979
- Traits: side-by-side eyes (capsule + capsule), capsule mouth, notch 180°, plate rect

## No.04 Nemu · 眠眠 — `h04`

- 眼睛总是弯弯的一条线，看起来刚睡醒，其实很清醒。 / Eyes like two sleepy lines — looks just woken up, is actually wide awake.
- 造型：浅蓝壳体右上角斜切，斜边上的缺口托信号点；奶油脸板居中偏右下；两眼是横向短线、嘴是小横线，睡眼惺忪。
- Source: `reference/h-family/04.png` (h-family 04), identity mean IoU 0.972
- Traits: side-by-side eyes (dash + dash), capsule mouth, notch -53°, plate rect

## No.05 Zaza · 眨眨 — `h05`

- 一只眼睁着、一只眼眨着，好像在说“我懂”。 / One eye open, one mid-wink, as if to say “got it”.
- 造型：薄荷壳体在后、只从左侧和顶边露出，靛蓝大脸板贴右下；左眼竖长胶囊、右眼横线，正在眨眼；左上缺口托信号点并咬到脸板角。
- Source: `reference/h-family/05.png` (h-family 05), identity mean IoU 0.971
- Traits: side-by-side eyes (capsule + dash), capsule mouth, notch -90°, plate rect
- Cleaned while redrawing: plate corner bitten by an r48 circle around the dot instead of the shell notch (r37.5), leaving a thin mint rim, so the working ring and success badge clear the plate

## No.06 Bobo · 波波 — `h06`

- 顶着一头圆圆的波波头，性格温吞，笑起来很软。 / Wears a round bob of a shell; easy-going, with a soft smile.
- 造型：靛蓝壳体上方两角都是大圆弧，像一顶圆圆的波波头；奶油脸板偏左下；短胖胶囊眼与宽横线嘴；右上圆弧上的缺口托信号点。
- Source: `reference/h-family/06.png` (h-family 06), identity mean IoU 0.954
- Traits: side-by-side eyes (capsule + capsule), capsule mouth, notch -45°, plate rect

## No.07 Kiri · 切切 — `o01`

- 脸板被斜着切掉一个角，做事也喜欢抄近路。 / Its plate has one corner sliced off — fond of shortcuts, too.
- 造型：靛蓝壳体、左上缺口托信号点；薄荷脸板贴右下，左上角被一刀斜切成 45° 斜边；靛蓝眼一细一粗、嘴是偏右的横线。
- Source: `reference/options-20/01.png` (options-20 01), identity mean IoU 0.979
- Traits: side-by-side eyes (capsule + capsule), capsule mouth, notch -90°, plate poly

## No.08 Mochi · 麻薯 — `o02`

- 圆脸软软的，一戳就想笑。 / A round, squishy face that giggles when poked.
- 造型：浅蓝圆角壳体，一张奶油色大圆脸偏在右下、被壳体右缘和底缘裁切；靛蓝眼一细一粗，一字嘴偏右；左上缺口托信号点。
- Source: `reference/options-20/02.png` (options-20 02), identity mean IoU 0.972
- Traits: side-by-side eyes (capsule + capsule), capsule mouth, notch -90°, plate rect

## No.09 Tata · 塔塔 — `o03`

- 两层叠起来的小塔，头顶的缺口是它的瞭望台。 / A little two-storey tower; the notch on top is its lookout.
- 造型：淡紫壳体上下两层：上层较窄、左缘内收，与下层在两侧形成圆角凹口；靛蓝横向脸板，薄荷色眼一细一粗、一字嘴偏右；上层顶边右侧缺口托信号点。
- Source: `reference/options-20/03.png` (options-20 03), identity mean IoU 0.977
- Traits: side-by-side eyes (capsule + capsule), capsule mouth, notch -90°, plate rect
- Cleaned while redrawing: levelled the top edge: the lobe right of the notch sat ~5px lower than the rest of the top

## No.10 Kuki · 曲奇 — `o04`

- 侧边被咬了一口的曲奇，完全不在意。 / A cookie with a bite out of its side — and not bothered one bit.
- 造型：奶油色壳体左侧被咬掉一大口，呈 C 形；靛蓝脸板贴满右下角、与壳体右缘和底缘齐平；奶油色眼一细一粗、一字嘴偏右；左上缺口托信号点。
- Source: `reference/options-20/04.png` (options-20 04), identity mean IoU 0.968
- Traits: side-by-side eyes (capsule + capsule), capsule mouth, notch -90°, plate rect

## No.11 Pocket · 兜兜 — `o05`

- 脸板从口袋里探出一截，总是急着给你看点什么。 / Its plate pokes out of the pocket, always eager to show you something.
- 造型：靛蓝壳体是一只矮宽的口袋，只在左侧和底边露出；薄荷脸板像卡片一样从口袋里向右上方探出壳外；一对等大的短豆豆眼、居中短横嘴；口袋左肩缺口托信号点。
- **Design revision r2** (2026-09-25) — 第 1 版与 Jojo 同一张脸（左上靛蓝框、右下薄荷脸板、一细一粗眼、偏右横嘴），小尺寸下像同一个角色。 / r1 shared Jojo’s face (indigo frame top-left, mint plate bottom-right, thin + thick eyes, offset dash mouth) and read as the same character at icon size.
  - 壳体：高方块 → 一只矮宽的口袋，只在左侧和底边露出 / shell: tall rounded block → a low, wide pocket that shows only on the left and along the bottom
  - 脸板：像从口袋里抽出的卡片，向右上方探出（原先只向右探出、与顶边齐平） / plate: overhangs up and to the right like a card pulled out of the pocket (was: overhanging only on the right, flush with the top)
  - 缺口与信号点：从整只角色的顶边移到口袋左肩，约在三分之一高度 / notch + dot: from the top edge of the whole body to the pocket’s left shoulder, a third of the way down
  - 眼睛：一细一粗胶囊 → 一对等大的短豆豆眼；嘴从偏右改为居中 / eyes: one thin + one thick capsule → a matched pair of short bean eyes; mouth centred instead of offset right
- Source (historical reference, the current design departs from it on purpose): `reference/options-20/05.png` (options-20 05); superseded r1: `reference/revisions/o05-r1.svg` — 靛蓝壳体在后，薄荷色脸板向右探出壳外；脸板右下角是一个更短的圆角小台阶，与主体圆角相接成凹痕；靛蓝眼一细一粗、一字嘴偏右；左上缺口托信号点。
- Traits: side-by-side eyes (capsule + capsule), capsule mouth, notch -90°, plate rect (overhangs the shell)
- Cleaned while redrawing r1 (superseded): levelled the top edge: the lobe left of the notch sat ~7px lower than the rest of the top

## No.12 Dudu · 嘟嘟 — `o06`

- 眯着眼、嘟着嘴，像在认真吹一个泡泡。 / Squinting, lips pursed, seriously blowing an invisible bubble.
- 造型：靛蓝壳体，奶油色脸板贴左下、左缘只留一条细边、右侧与顶部露出宽边；一对眯成横线的眼和一个小圆方“嘟”嘴；右上角被大缺口咬去，托着信号点。
- Source: `reference/options-20/06.png` (options-20 06), identity mean IoU 0.960
- Traits: side-by-side eyes (dash + dash), dot mouth, notch -90°, plate rect
- Cleaned while redrawing: straightened the plate’s left edge: it leaned out ~4px towards the bottom while the right edge stayed vertical

## No.13 Dotty · 点点 — `o07`

- 一只眼长、一只眼圆，看什么都像在认真打量。 / One long eye, one round one — everything gets a careful once-over.
- 造型：薄荷壳体在后，靛蓝脸板是一个大圆点，偏右下落在壳上，四角露出薄荷色；左眼竖长胶囊、右眼圆点，不对称的打量脸；左上缺口托信号点。
- **Design revision r2** (2026-09-25) — 第 1 版与眨眨（h05）布局和配色相同（薄荷壳在后、靛蓝方脸板贴右下、左上信号点、左眼竖长），只差一只眼。 / r1 had Zaza’s layout and colours (mint shell behind, square indigo plate bottom-right, dot top-left, long left eye) and differed from it by one eye.
  - 脸板：与壳右缘、底缘齐平的圆角方块 → 一个大圆点（壳宽 321 中半径 110），偏右下，四周露出薄荷色 / plate: rounded square flush with the shell’s right and bottom edges → a round dot (r110 of the 321 px shell) set low and right, with mint showing all round it
  - 五官重新排进圆脸板里；圆眼仍是圆眼，长眼仍是长眼 / features re-spaced to sit inside the round plate; the round eye stays round, the long eye stays long
- Source (historical reference, the current design departs from it on purpose): `reference/options-20/07.png` (options-20 07); superseded r1: `reference/revisions/o07-r1.svg` — 薄荷壳体在后、靛蓝脸板贴右下；左眼竖长胶囊、右眼圆点，不对称的眨眼脸；左上缺口托信号点。
- Traits: side-by-side eyes (capsule + dot), capsule mouth, notch -90°, plate circle

## No.14 Vivi · 薇薇 — `o08`

- 眉眼往上挑，干劲十足，一脸“交给我”。 / Eyes slanted with gusto — the “leave it to me” face.
- 造型：浅蓝壳体，靛蓝脸板贴左下、与壳体左缘和底缘齐平；浅蓝眼是一对向内收拢的斜胶囊（\ /），下方一条宽横杠嘴；右上缺口托信号点。
- Source: `reference/options-20/08.png` (options-20 08), identity mean IoU 0.980
- Traits: side-by-side eyes (tilted capsule + tilted capsule), capsule mouth, notch -90°, plate rect

## No.15 Puri · 布丁 — `o09`

- 小小的嘴、侧边的信号点，安静得像一块布丁。 / Tiny mouth, dot on the side, quiet as a pudding.
- 造型：淡紫壳体在后、奶油脸板贴右下齐边；一对粗圆竖眼压得很低，中间一颗小圆点嘴；左侧缺口托信号点。
- Source: `reference/options-20/09.png` (options-20 09), identity mean IoU 0.967
- Traits: side-by-side eyes (capsule + capsule), dot mouth, notch 180°, plate rect

## No.16 Pao · 泡泡 — `o10`

- 嘴巴圆圆的，总像刚发现了什么新鲜事。 / A round little mouth, forever just-discovered-something.
- 造型：奶油壳体在后、浅蓝脸板贴右下齐边；一对高挑竖长眼，下方一张奶油色圆嘴；左上缺口托信号点。
- Source: `reference/options-20/10.png` (options-20 10), identity mean IoU 0.971
- Traits: side-by-side eyes (capsule + capsule), dot mouth, notch -90°, plate rect

## No.17 Tiki · 蒂奇 — `o11`

- 眼睛竖着排成一列，像一根认真站岗的小柱子。 / Eyes stacked in a column, standing guard like a tiny totem.
- 造型：靛蓝方壳，左侧嵌一条薄荷竖长条脸板；两只小眼上下叠放、下方一道短横口；右上缺口托橙色信号点。
- Source: `reference/options-20/11.png` (options-20 11), identity mean IoU 0.977
- Traits: stacked eyes (capsule + capsule), capsule mouth, notch -90°, plate rect

## No.18 Sora · 空空 — `o12`

- 天蓝色的外壳，拱门一样的脸，信号点是一颗小太阳。 / Sky-blue shell, an archway face, and a little sun for a dot.
- 造型：天蓝方壳，下方正中立着一块更浅的拱门形脸板、底边与壳齐平；左眼略细、右眼略粗，下方短横口；左上缺口托琥珀色信号点。
- Source: `reference/options-20/12.png` (options-20 12), identity mean IoU 0.979
- Traits: side-by-side eyes (capsule + capsule), capsule mouth, notch -90°, plate rect

## No.19 Jam · 酱酱 — `o13`

- 脸长在罐子顶上的标签里，装满了好心情。 / Wears its face on the label at the top of the jar — full of good mood.
- 造型：淡紫罐形壳体，上部横贯一条薄荷色标签脸板；一对竖长眼夹着一道短横口；顶部正中缺口咬穿壳与标签，托桃色信号点。
- Source: `reference/options-20/13.png` (options-20 13), identity mean IoU 0.972
- Traits: side-by-side eyes (capsule + capsule), capsule mouth, notch -90°, plate rect

## No.20 Peep · 瞄瞄 — `o14`

- 小脸躲在大身子的角落里，悄悄往外瞄。 / A small face tucked in the corner of a big body, peeking out.
- 造型：大块奶油方壳，右下角齐边塞着一块小淡紫脸板；左眼细小、右眼粗大，短横口偏在右眼下；左上缺口托信号点。
- Source: `reference/options-20/14.png` (options-20 14), identity mean IoU 0.982
- Traits: side-by-side eyes (capsule + capsule), capsule mouth, notch -90°, plate rect

## No.21 Maca · 马卡 — `o15`

- 一层薄荷夹一层天蓝，像刚出炉的马卡龙。 / Mint, sky-blue, mint — layered like a fresh macaron.
- 造型：薄荷方壳中段横贯一条天蓝脸带，靛蓝双竖眼和短嘴都挤在带里；左上缺口托信号点。
- Source: `reference/options-20/15.png` (options-20 15), identity mean IoU 0.984
- Traits: side-by-side eyes (capsule + capsule), capsule mouth, notch -90°, plate rect

## No.22 Mino · 米诺 — `o16`

- 圆圆的大薄荷脸顶着一顶小壳帽，最会表达情绪。 / A big round mint face under a little shell cap — shows every feeling.
- 造型：左右对称：靛蓝壳体只在顶上露出一顶圆拱小帽，正中缺口托信号点；宽大的薄荷脸板比壳更宽、下缘圆鼓，像一张圆脸；一对等大的竖长胶囊眼、居中短横嘴。
- **Design revision r2** (2026-09-25) — 第 1 版与 Jojo 同一张脸（左侧靛蓝条、右下薄荷大脸板、一细一粗眼、偏右横嘴），小尺寸下像同一个角色。 / r1 shared Jojo’s face (indigo strip on the left, mint plate filling the lower right, thin + thick eyes, offset dash mouth) and read as the same character at icon size.
  - 布局：不对称（左侧露出一条壳）→ 左右对称，壳只在顶上露出一顶圆拱小帽 / layout: asymmetric (shell showing as a strip on the left) → symmetric, the shell shows only as a rounded cap on top
  - 脸板：比壳更宽、下缘大圆角，是一张略高的圆脸而不是方脸 / plate: wider than the shell with big rounded bottom corners — a round, slightly taller face instead of a square one
  - 缺口与信号点：从偏左、同时咬进壳和脸板，移到帽顶正中 / notch + dot: from left of centre, biting shell and plate, to dead centre on the crown of the cap
  - 眼睛：一细一粗胶囊 → 一对等大的竖长胶囊；嘴从偏右改为居中 / eyes: one thin + one thick capsule → a matched pair of tall capsules; mouth centred instead of offset right
- Source (historical reference, the current design departs from it on purpose): `reference/options-20/16.png` (options-20 16); superseded r1: `reference/revisions/o16-r1.svg` — 靛蓝壳体只在左侧露出一条，大薄荷脸板占满右下；顶部缺口同时咬进壳和脸板的左上大圆角，托住信号点。
- Traits: side-by-side eyes (capsule + capsule), capsule mouth, notch -90°, plate rect (overhangs the shell)
- Cleaned while redrawing r1 (superseded): signal dot 27→25 px and raised 2 px, plate bite 48→52 px, so the full-size success pop clears the plate (source ring was too tight)

## No.23 Wowo · 窝窝 — `o17`

- 头顶像个斜斜的小屋顶，住在里面的它很恋家。 / A slanted little roof on top; a homebody who loves its nook.
- 造型：奶油壳顶是一道从左往右斜升的屋顶，右侧拱起圆峰后陡降到小缺口，缺口托着小信号点；靛蓝脸板压在下半部并略微探出壳底。
- Source: `reference/options-20/17.png` (options-20 17), identity mean IoU 0.977
- Traits: side-by-side eyes (capsule + capsule), capsule mouth, notch -90°, plate rect (overhangs the shell)

## No.24 Filo · 夹夹 — `o18`

- 顶上带一个文件夹的小耳朵，喜欢把东西归档。 / A folder tab on top; enjoys putting things where they belong.
- 造型：天蓝壳体像一只文件夹：左上凸起的标签页顺滑地台阶式落到右侧，缺口开在标签页上托着信号点；奶油脸板贴右下。
- Source: `reference/options-20/18.png` (options-20 18), identity mean IoU 0.978
- Traits: side-by-side eyes (capsule + capsule), capsule mouth, notch -90°, plate rect

## No.25 Tilty · 歪歪 — `o19`

- 脸总是歪着一点点，看世界的角度很特别。 / Face always tipped a little — sees the world from its own angle.
- 造型：淡紫方壳里的靛蓝脸板逆时针歪了约九度，薄荷色双眼仍然端正；右上缺口同时咬进壳和脸板一角，托着信号点。
- Source: `reference/options-20/19.png` (options-20 19), identity mean IoU 0.974
- Traits: side-by-side eyes (capsule + capsule), capsule mouth, notch -90°, plate rect, tilted -9.4°
- Cleaned while redrawing: notch 44→48 px and dot raised 2 px so the full-size success pop clears the plate

## No.26 Hugo · 抱抱 — `o20`

- 脸板在侧边弯出一个弧，把信号点轻轻抱住。 / Its plate curves in at the side to give the dot a gentle hug.
- 造型：靛蓝壳体右侧开口托着信号点，壳的上半截比下半截窄一级；奶油脸板右缘向内收成一道弯，从上方绕开信号点再向右下鼓出。
- Source: `reference/options-20/20.png` (options-20 20), identity mean IoU 0.970
- Traits: side-by-side eyes (capsule + capsule), capsule mouth, notch 0°, plate poly
