# Jojo & Friends

A family of **26 UI characters** — each one a layered vector master with its own shell, face plate, eyes, mouth and notch, and all of them sharing one expression and status protocol: **16 emotions** and **6 business statuses**, as SVG and React components.

**Showcase:** https://jojo-friends.vercel.app · **Docs:** [spec](docs/SPEC.md) · [API](docs/API.md) · [the 26 characters](docs/CHARACTERS.md) · [adding a character](docs/EXTENDING.md)

> This is a UI character / status showcase. Nothing here connects to a real agent, account or task.

## What's in it

- **26 characters, not 26 recolours.** Jojo (the approved lead) plus 25 companions redrawn from their AI-generated source art as parametric vectors: rounded polygons, circles and filleted notches — no embedded bitmaps, no auto-traced paths. Chamfered and tilted plates, landscape and portrait shells, side notches, bites, stacked eyes, dot eyes and dash eyes are all kept.
- **One protocol.** `calm, focus, think, puzzled, curious, happy, laugh, smug, shy, celebrate, surprised, angry, sleepy, aggrieved, cry, sob` × `idle, working, needs-input, success, error, offline` for every character, with intensity, motion modes, gaze, poke and status replay. Status never changes the face.
- **Held by tests.** For every character: all 96 emotion × status renders, features and tears on the plate across every emotion, intensity, loop time and gaze extreme, status shapes in frame and off the face at 24–240 px, 24 px greyscale readability, and a silhouette check that no two characters are the same shape. Jojo's markup is pinned byte-for-byte to the approved baseline (240 hashes).
- **A static site** (Vite + React) to browse the family, play with every character and download SVG / PNG / WebP / kits.

## Use it

The library is **not published to npm**. Copy `src/library/` into a React 18+ project:

```tsx
import { Avatar, AvatarStatic, renderSvg } from './library'

<Avatar character="o02" emotion="happy" status="working" size={96} />
<Avatar character="h04" status="needs-input" size={32} motion="transitions" decorative />
<AvatarStatic character="o11" emotion="surprised" size={24} decorative />
const svg = renderSvg({ character: 'o19', emotion: 'cry', size: 512 })
```

See [docs/API.md](docs/API.md) for every prop, and `examples/minimal.tsx`.

## Develop

```sh
pnpm install
pnpm dev          # exports assets, then starts the site
pnpm test         # vitest: legacy Jojo suite + family contract
pnpm build        # assets → typecheck → dist/
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

- The source art was generated with ChatGPT image generation and redrawn by hand as vectors; see [reference/README.md](reference/README.md). Small generation glitches cleaned during redrawing are listed per character.
- The code is public to read but **`UNLICENSED`**: no licence is granted. **Usage rights for the characters are still to be confirmed**, and no trademark search has been done. Please don't use the characters in your own products yet.
- Third-party packages keep their own licences; the site self-hosts Fraunces and IBM Plex Mono under the SIL Open Font License 1.1.

---

## 中文说明

**Jojo & Friends** 是同一个家族的 26 位 UI 角色：主角 Jojo 加 25 位同伴。每位都有自己的壳体、脸板、五官和托着信号点的缺口，共用同一套 **16 种表情**与 **6 种业务状态**（空闲 / 工作中 / 等你回复 / 已完成 / 出错了 / 离线），以分层 SVG 和 React 组件提供。

- **不是换色的 Jojo**：25 位同伴按各自的 AI 生图原画逐一重建为参数化矢量，斜切脸板、横宽/纵长、侧边缺口、咬口、竖排眼、圆点眼、横线眼、倾斜脸板都保留。
- **一套规范**：角色数据结构、锚点与几何约束、调色、表情与状态契约、动效强度/时序/可打断、小尺寸简化、静态导出、无障碍、性能与生命周期、新增角色流程，见 [docs/SPEC.md](docs/SPEC.md)。
- **测试兜底**：26 位 × 16 表情 × 6 状态全部渲染；五官、眉、腮红、眼泪在所有表情/力度/动画时间/视线极值下不出脸板；状态标识在 24–240px 不出画框、不盖脸；Jojo 的输出与已验收版本逐字节一致。
- **使用**：组件尚未发布到 npm，复制 `src/library/` 即可（需要 React 18+）。
- **展示站**：https://jojo-friends.vercel.app ，可按名字/编号查找、试玩全部表情与状态、下载 SVG / 透明 PNG / WebP / 素材包。本站只是 UI 组件展示，不连接任何真实 Agent 或个人任务。
- **授权**：代码公开可阅但未授权（UNLICENSED）；角色形象的使用授权待确认，未做商标检索。原画为 AI 生图，详见 [reference/README.md](reference/README.md)。
