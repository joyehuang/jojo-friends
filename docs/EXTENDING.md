# Adding a character

中文说明：新增角色 = 放原画 → 量尺寸 → 写一份数据 → 用检查脚本迭代到全部通过 → 注册 → 跑全量测试。

Every character in the family was added exactly this way.

## 1. Put the source in `reference/`

A square PNG of one character on a plain light background. Record where it came from (see `reference/README.md`) and strip metadata you don't want to publish.

## 2. Measure

```sh
pnpm exec tsx scripts/ref/measure.ts reference/<batch>/<file>.png
```

It prints the flat palette and every connected colour component: bbox, centroid, a capsule fit (length, thickness, tilt), corner-radius estimates and edge profiles per side. Notches, bites, chamfers and roofs show up as dips in those profiles. Parts of the back shell are hidden by the plate; continue their visible edges sensibly.

## 3. Write the spec

Create `src/library/characters/<id>.ts`:

```ts
import { buildCharacter } from '../character'

export const X01 = buildCharacter({
  id: 'x01',                       // stable, never renamed
  no: 27,
  name: { en: 'Name', zh: '名字' },
  persona: { zh: '一句轻松的虚构性格。', en: 'One light, fictional line.' },
  source: { file: 'reference/…/x01.png', sha256: '…', batch: '…', index: '01', size: 512 },
  form: '一句话描述可观察的造型特征。',
  shell: { type: 'rect', x: 42, y: 123, w: 321, h: 309, r: [55, 51, 55, 55],
           notches: [{ cx: 126.5, cy: 137.5, r: 43, fillet: 10 }] },
  face: { type: 'rect', x: 96, y: 201, w: 267, h: 231, r: [55, 48, 55, 44] },
  eyes: [{ cx: 163, cy: 295.5, w: 41, h: 108 }, { cx: 280, cy: 310.5, w: 39.5, h: 39.5 }],
  mouth: { cx: 227.5, cy: 377, w: 64, h: 23 },
  dot: { cx: 126.5, cy: 137.5, r: 26 },
  notchDir: -90,
  palette: { shell: '#c9f1e5', face: '#2d2e71', ink: '#c9f1e5', dot: '#fe6d4a' },
})
```

Shapes: `rect` (per-corner radii), `poly` (clockwise vertices with optional radii; concave corners are fine), `circle`, and `notches` (circular bites with filleted shoulders that cross the outline exactly twice). Optional hints: `brows`, `cheeks`, `bubble` (+ tail side), `zzz`, `gaugeHalfSpan`, `tearDrift`, `faceClip: 'none'` (overhanging plate) with `silhouette: 'shell+face'`, `faceRotate` (tilted plate), `rig` (`feat`, `gaze`, `arc`, `arcThick`, `mouthW`, `mouthCurve`) and `fit.size`.

## 4. Iterate with the checker

Work on a copy outside the registry so a half-finished file can't break anything:

```sh
pnpm exec tsx scripts/ref/check-spec.ts path/to/draft.ts --sheet --out out/check
```

It prints the normalised geometry and the solved placements (brows, cheeks, gauge ring, bubble side, small badge), the identity IoU against the source, and every violation of the plate / tear / status constraints. It also writes `<id>-identity.png` (source | vector | difference) and `<id>-sheet.png` (16 emotions + 6 statuses). Aim for a mean IoU ≥ 0.96, zero violations, and a contact sheet where every expression reads.

## 5. Register and test

Add the export to `CHARACTER_LIST` in `src/library/characters/index.ts`, then:

```sh
CHAR=x01 pnpm exec vitest run tests/characters.test.ts tests/family-small.test.tsx
pnpm test
```

The family tests pick the new character up automatically: all 16 × 6 renders, plate containment over every emotion / intensity / loop time / gaze extreme, tears, status clearance and framing at four sizes, "status never changes the face", small-size readability, and "not a recolour of anyone else". (The catalogue test also pins the family to exactly the 26 authorised sources, so update it deliberately if the family grows.)

## Revising an existing character

Keep the `id` and names. Put a render of the current design in `reference/revisions/<id>-r<N>.svg`, change the geometry, and record `design: { revision, date, reason, changes, previous }` in the spec (see `docs/SPEC.md` §1.1). Check it with `check-spec.ts` and `pnpm exec tsx scripts/distinctness.tsx out/distinctness` — look at the blind greyscale sheet, and make sure the new shape doesn't land on someone else. Then `pnpm solve`, `scripts/family-hashes.tsx --write` (only the revised character's fingerprint may change — diff it), `pnpm manifest`, `pnpm test`.

## 6. Ship

`pnpm build` builds the public showcase (no downloads; the build fails if any kit, source art, master or source map would be published). `pnpm export:private` regenerates the full asset kit (SVG / PNG / WebP / zips) into the gitignored `private-exports/` for private use.
