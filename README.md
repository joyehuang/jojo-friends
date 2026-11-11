# Jojo & Friends

Joye's personal character IP: a family of **26 characters** — each one a layered vector master with its own shell, face plate, eyes, mouth and notch, and all of them sharing one expression and status protocol: **16 emotions** and **6 business statuses**, as SVG and React components.

**Public showcase:** https://jojo-friends.vercel.app · **Internal docs:** [spec](docs/SPEC.md) · [API](docs/API.md) · [the 26 characters](docs/CHARACTERS.md) · [adding a character](docs/EXTENDING.md)

> **Open source** (since 2026-11-12): the code is [MIT](LICENSE) and the character art is [CC BY 4.0](LICENSE-ART) — use the characters in your own product as long as you credit *Jojo & Friends by Joye Huang*. The showcase site stays a viewer (browse, play with every emotion and status, share a character link); files come from this repository. Nothing here connects to a real agent, account or task.

## What's in it

- **26 characters, not 26 recolours.** Jojo (the approved lead) plus 25 companions redrawn from their AI-generated source art as parametric vectors (three of them — Pocket, Mino and Dotty — later revised so they no longer read as Jojo or Zaza; see [design revisions](docs/SPEC.md#11-design-revisions)): rounded polygons, circles and filleted notches — no embedded bitmaps, no auto-traced paths. Chamfered and tilted plates, landscape and portrait shells, side notches, bites, stacked eyes, dot eyes and dash eyes are all kept.
- **One protocol.** `calm, focus, think, puzzled, curious, happy, laugh, smug, shy, celebrate, surprised, angry, sleepy, aggrieved, cry, sob` × `idle, working, needs-input, success, error, offline` for every character, with intensity, motion modes, gaze, poke and status replay. Status never changes the face.
- **Held by tests.** For every character: all 96 emotion × status renders, features and tears on the plate across every emotion, intensity, loop time and gaze extreme, status shapes in frame and off the face at 24–240 px, 24 px greyscale readability, a silhouette check that no two characters are the same shape, a greyscale icon-size look-alike check, and a fingerprint of every character's full output so an unrecorded change fails. Jojo's markup is pinned byte-for-byte to the approved baseline (240 hashes).
- **A static showcase site** (Vite + React) to browse the family and play with every character. The public build is checked (`scripts/check-public-dist.ts`, run by `pnpm build` and `tests/public-site.test.ts`) to contain only the page, its JS/CSS/fonts, a 404 page and the favicon: no downloads, kits, source art, revision masters, source maps or repository links.

## Use it

The library is not on npm yet: copy `src/library/` into a React 19+ project (the imperative handles use React 19's ref-as-prop support), keeping the licence files:

```tsx
import { Avatar, AvatarStatic, renderSvg } from './library'

<Avatar character="o02" emotion="happy" status="working" size={96} />
<Avatar character="h04" status="needs-input" size={32} motion="transitions" decorative />
<AvatarStatic character="o11" emotion="surprised" size={24} decorative />
const svg = renderSvg({ character: 'o19', emotion: 'cry', size: 512 })
```

See [docs/API.md](docs/API.md) for every prop, and `examples/minimal.tsx`.

Apps that cannot run React (a native client, an email renderer) use the **avatar pack**: `pnpm export:pack <dir>` writes every character at every emotion and size as a small static SVG (`<id>/<emotion>-<px>.svg`, plus `offline-<px>.svg`), with `boxes.json` (painted bounds for fitting into a tile) and `manifest.json`. Status is a second channel that never changes the face, so an app draws it beside the character; the script checks that for every character, emotion, status and size before it writes.

## Develop

```sh
pnpm install
pnpm dev             # favicon, then starts the site
pnpm test            # vitest: legacy Jojo suite + family contract + public-build guard
pnpm build           # favicon → typecheck → dist/ → public-build check
pnpm export:pack out # the static avatar pack for native apps (see above)
pnpm export:private  # full asset kit (SVG / PNG / WebP / zips) → private-exports/ (gitignored, never deployed)
```

Tools: `scripts/ref/measure.ts` (measure a source image), `scripts/ref/check-spec.ts` (identity + constraints + contact sheet for a draft character), `pnpm identity`, `pnpm sheets`, `scripts/gen-manifest.ts`.

## Layout

```
src/library/            the portable component library (React + SVG, no other runtime deps)
  characters/           26 character specs + registry
  character.ts          CharacterSpec schema, normalisation, placement solvers
  shapes.ts             parametric outlines (rounded polygons, circles, notches)
  emotions.ts pose.ts rig.ts status.ts signals.ts frame.ts engine.ts   the shared protocol
src/site/               the showcase website
reference/              the 26 source images + characters-source-manifest.json
docs/                   SPEC, API, CHARACTERS, EXTENDING
scripts/                asset export, measurement, identity, contact sheets
tests/                  vitest suites
```

## Provenance and rights

- The source art was generated with ChatGPT image generation and redrawn by hand as vectors; see [reference/README.md](reference/README.md). Small generation glitches cleaned during redrawing are listed per character. Pocket, Mino and Dotty are design revision 2 and intentionally depart from their source images, which stay in `reference/` as history.
- **Licences**: the code is MIT ([LICENSE](LICENSE)); the character art — the designs of the 26 characters and every picture of them, including the reference images and anything rendered from the library — is CC BY 4.0 ([LICENSE-ART](LICENSE-ART)). Credit it as *Jojo & Friends by Joye Huang* with a link to this repository and the licence. Neither licence grants trademark rights, and no trademark search has been done.
- What stays public, and its limits: the showcase has to send its front-end JavaScript and the rendered SVG to every visitor's browser, so a determined visitor can still extract the current character drawings from a normal page load. Copies of the repository or of the old downloads that were made while they were public cannot be recalled.
- Third-party packages keep their own licences; the site self-hosts Fraunces and IBM Plex Mono under the SIL Open Font License 1.1.

---

## 中文说明

**Jojo & Friends** 是同一个家族的 26 位 UI 角色：主角 Jojo 加 25 位同伴。每位都有自己的壳体、脸板、五官和托着信号点的缺口，共用同一套 **16 种表情**与 **6 种业务状态**（空闲 / 工作中 / 等你回复 / 已完成 / 出错了 / 离线），以分层 SVG 和 React 组件提供。

- **不是换色的 Jojo**：25 位同伴按各自的 AI 生图原画逐一重建为参数化矢量，斜切脸板、横宽/纵长、侧边缺口、咬口、竖排眼、圆点眼、横线眼、倾斜脸板都保留。其中兜兜、米诺、点点在 2026-09-25 修订为第 2 版设计（原版小尺寸下与 Jojo / 眨眨太像），原画保留为历史来源，见 [设计修订](docs/SPEC.md#11-design-revisions)。
- **一套规范**：角色数据结构、锚点与几何约束、调色、表情与状态契约、动效强度/时序/可打断、小尺寸简化、静态导出、无障碍、性能与生命周期、新增角色流程，见 [docs/SPEC.md](docs/SPEC.md)。
- **测试兜底**：26 位 × 16 表情 × 6 状态全部渲染；五官、眉、腮红、眼泪在所有表情/力度/动画时间/视线极值下不出脸板；状态标识在 24–240px 不出画框、不盖脸；Jojo 的输出与已验收版本逐字节一致。
- **已开源**（2026-11-12）：代码 MIT，角色画稿 CC BY 4.0。可以在自己的产品里使用这些角色，署名「Jojo & Friends by Joye Huang」并附上本仓库链接和许可证即可。不能跑 React 的应用（原生客户端等）用 `pnpm export:pack <目录>` 导出静态头像包：每个角色 × 16 种表情 × 7 个尺寸的 SVG，外加离线图、`boxes.json` 和 `manifest.json`。
- **展示站**：https://jojo-friends.vercel.app 继续公开，可按名字/编号查找、试玩全部表情与状态、分享角色链接；不再提供源码链接、复制代码、SVG / PNG / WebP 导出或素材包下载。`pnpm build` 与 `tests/public-site.test.ts` 会检查公开构建里没有下载、素材包、原画、母版、source map 或仓库链接。本站不连接任何真实 Agent 或个人任务。
- **授权**：代码见 [LICENSE](LICENSE)（MIT），画稿见 [LICENSE-ART](LICENSE-ART)（CC BY 4.0）；两者都不授予商标权，未做商标检索。原画为 AI 生图，详见 [reference/README.md](reference/README.md)。
- **残余边界**：网站正常运行时，浏览器必然会下载前端 JS 和渲染出的 SVG，技术上无法阻止有人从页面里提取当前角色图形；此前公开期间已被克隆或下载的副本也无法收回。
