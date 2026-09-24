# API

中文说明：组件在 `src/library/`，要求 React 19+（交互句柄使用 ref-as-prop），静态字符串导出另使用 react-dom/server。尚未发布到 npm——把这个目录复制进你的项目即可使用。

The library lives in `src/library/` and requires React 19+ (ref-as-prop is used for imperative handles; `react-dom/server` is also required for `renderSvg`). It is **not published to npm**; copy the folder into your project (or build it with `pnpm build:lib`, which writes an ES module to `dist-lib/`).

## Components

```tsx
import { Avatar, AvatarStatic, Jojo, JojoStatic, renderSvg } from './library'

// animated, any family member
<Avatar character="o02" emotion="happy" status="working" intensity={0.7} size={96} />

// list avatars: quiet, move only when something changes
<Avatar character="h04" status="needs-input" size={32} motion="transitions" decorative />

// static render (SSR, emails, icon grids) — no effects, no engine
<AvatarStatic character="o11" emotion="surprised" size={24} decorative />

// SVG document as a string (Node or browser)
const svg = renderSvg({ character: 'o19', emotion: 'cry', status: 'error', size: 512 })

// the approved Jojo, unchanged API and byte-identical markup
<Jojo emotion="think" status="working" />
```

### Props (`Avatar`, `AvatarStatic`)

| prop | default | notes |
| --- | --- | --- |
| `character` | `"jojo"` | stable id (`CHARACTER_IDS`) or a `Character` from `buildCharacter()` |
| `emotion` | `"calm"` | one of 16 (`EMOTION_IDS`); visual only |
| `status` | `"idle"` | `idle / working / needs-input / success / error / offline`; drives the signal shapes only |
| `intensity` | `0.7` | 0..1 |
| `motion` | `"auto"` | `auto / full / transitions / static`; reduced motion forces static (Avatar only) |
| `gaze` | `"auto"` | `auto / pointer / center / {x, y}` in −1..1 |
| `size` | `96` | px number or any CSS length (`"100%"`) |
| `shadow`, `brows`, `flat` | `"auto"` | booleans override the size-based defaults |
| `framing` | `"auto"` | `full / tight` (tight at ≤ 64 px) |
| `decorative` | – | `aria-hidden`; otherwise `role="img"` with a text name |
| `title` | – | accessible name override |
| `ref` | – | `poke()`, `replayStatus()` (Avatar only) |

Invalid values never throw: they fall back to the default with a one-time console warning outside production.

## Data

```ts
import {
  CHARACTER_LIST, CHARACTERS, CHARACTER_IDS, getCharacter, isCharacterId,
  EMOTION_LIST, EMOTIONS, EMOTION_IDS, STATUS_LIST, STATUSES, STATUS_IDS,
} from './library'

CHARACTER_LIST.map((c) => [c.id, c.no, c.name.en, c.name.zh, c.persona.zh])
```

A `Character` carries its display names, persona, source reference, palette, normalised geometry and rig. Treat it as read-only.

## Lower level

- `resolveConfig(props, prefersReducedMotion)` — normalised options.
- `targetPose(emotion, intensity)` — the shared pose; `rigPose(pose, character)` maps it onto a character.
- `framePose(pose, fx, frameOptions)` — pose → SVG attributes keyed by `data-part` (pure).
- `staticFrame(config)` — the exact frame `AvatarStatic` renders.
- `JojoEngine`, `ticker` — the animation engine and the shared rAF (introspection for tests).
- `buildCharacter(spec)`, `buildShape(descriptor)` — see [EXTENDING.md](EXTENDING.md).

## DOM hooks

Every avatar is `<svg data-jojo data-character="<id>" data-emotion="…" data-status="…" data-motion="…">` (the legacy `<Jojo>` omits `data-character` to keep its approved markup). Layers carry `data-layer` (`shell`, `face`, `eye-left`, `eye-right`, `mouth`, `signal-dot`, `status-working`, `status-needs-input`, `status-success`, …).
