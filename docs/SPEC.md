# Jojo & Friends — character, motion and status specification

Chinese summary: 这份文档是整个家族的“一套规范”。每位角色是一份数据（`CharacterSpec`），共享同一套表情、状态、动效与生命周期契约；不同的只是壳体、脸板、五官锚点、缺口方向和调色。

This is the contract every one of the 26 characters follows. The code is the source of truth; each rule below names the file that implements it and the test that holds it.

---

## 1. What a character is

A character is **data**, not a component. `src/library/characters/<id>.ts` exports `buildCharacter(spec)`, where `spec` is a `CharacterSpec` (`src/library/character.ts`) measured in the pixels of the character's own source image:

| field | meaning |
| --- | --- |
| `id` | stable machine id: `jojo`, `h02`…`h06`, `o01`…`o20`. Never renamed. |
| `no` | catalogue number 1–26 |
| `name` | `{ en, zh }` display names — decoupled from `id`, free to change |
| `persona` | one light, fictional line (`zh`, `en`); not a job title or real capability |
| `source` | reference file, sha256 of the public copy, batch/index, size |
| `form`, `cleanup` | what is visibly distinctive; which generation glitches were cleaned |
| `design` | optional design revision (§1.1): set only when the character deliberately departs from its source |
| `shell`, `face` | outline descriptors (see §2); `face` is the plate the features live on |
| `eyes` | two capsules, viewer-left then viewer-right (stacked eyes: top then bottom) |
| `mouth` | a capsule; `w === h` is a round dot mouth |
| `dot`, `notchDir` | the signal dot and the direction its notch opens to (deg; −90 up, 180 left, 0 right) |
| `palette` | shell, face, ink (eyes/brows), dot; optional mouth, tear, track, gradient ends |
| hints | optional `brows`, `cheeks`, `bubble`, `zzz`, `gaugeHalfSpan`, `tearDrift`, `rig`, `faceClip`, `faceRotate`, `silhouette`, `fit` |

`buildCharacter` normalises the spec onto the **shared canvas** (Jojo's 1254-unit space; shell ∪ plate ∪ dot fits 760 × 714 centred on (627.5, 601); view boxes `full` 190 160 900 900, `tight` 224 186 800 800) and derives:

- the **rig** (§4) that maps shared poses onto this face;
- placements solved against the character's own plate: brows, cheeks, the needs-input bubble, the working gauge ring and span, the small-size success badge (§6);
- tear lanes that stay on the plate.

### 1.1 Design revisions

A character starts as **revision 1**: the vector redrawn from its source image. When a later review finds a design problem the source itself has — for example two characters that read as the same face at icon size — the character may be **revised** instead of left as is. A revision:

- keeps the `id`, `no`, names and the whole emotion / status protocol; only geometry (and the `form` / `persona` text describing it) changes;
- records `design: { revision, date, reason, changes, previous }` in the spec. `previous` points at a render of the superseded design kept in `reference/revisions/` with its sha256; `source` keeps pointing at the original AI image, untouched, as the **historical reference** — it is no longer claimed to match;
- is metadata only for the solver cache (`specHash` ignores `design`), and is shown on the site ("当前设计 · 第 N 版" next to the superseded version and the source, labelled as such) and in `docs/CHARACTERS.md` / the manifest, where the source IoU of a revised design is marked as not a fidelity score;
- updates `tests/fixtures/family-hashes.json` deliberately (`scripts/family-hashes.tsx --write`). That fixture fingerprints every character's complete output, so any change to a character that is not a recorded revision fails the suite.

Revised so far (2026-09-25): **Pocket `o05`** and **Mino `o16`** (r1 shared Jojo's face), **Dotty `o07`** (r1 duplicated Zaza's layout). See `docs/CHARACTERS.md`.

Jojo is the exception that proves the rule: `characters/jojo.ts` is hand-frozen from the approved kit's constants with an identity rig, so its markup is byte-identical to the signed-off baseline (`tests/status-node.test.tsx`, 240 hashes).

## 2. Shapes and layers

Outlines are parametric, never traced (`src/library/shapes.ts`):

- `rect` — per-corner radii `[tl, tr, br, bl]`;
- `poly` — clockwise vertices `[x, y, radius?]`; concave corners allowed (towers, folder tabs, roofs, overhanging plates);
- `circle`;
- `notches` on either — a circle subtracted from the outline with filleted shoulders. A notch may cut through straight edges and corner arcs; large ones make side bites.

Every descriptor produces one clockwise SVG path plus a flattened outline used by the geometry tests. No raster, no embedded images (`tests/characters.test.ts` rejects `<image>` and `data:image`).

Layer order (fixed for all characters, `src/library/JojoSvg.tsx`):

```
shadow (silhouette offset down-right)
body ─ shell
     ─ [shell clip] ─ [plate rotation] ─ face plate
                                        ─ blush
                                        ─ [plate clip] ─ features (brows, eye L, eye R) ─ mouth
                                        ─ tears
     ─ status: working gauge · success sparks · signal dot (+ ring, "!" mark, check) · needs-input bubble
confetti · Zzz
```

The plate may overhang the shell (`faceClip: 'none'`) and may be tilted as a whole (`faceRotate`); features are always drawn in plate space so they tilt with it.

## 3. Anchors and constraints

- **Eyes**: round-capped capsules — `w` stroke thickness, `h` full length, `rot` tilt of the long axis from vertical. Dots (`w = h`), dashes (`rot: 90`), slants and stacked layouts all use this one description.
- **Mouth**: capsule at rest; the emotion bends it into smiles, O-shapes and open mouths.
- **Brows**: off unless an emotion asks; placed by solver above each eye (or where the hint says).
- **Cheeks**: blush ellipses, solved to fit the plate at their largest.
- **Signal dot + notch**: `notchDir` turns the working gauge (it hugs the notch on the inward side) and the success badge (it grows into the notch, never outwards).

Hard constraints, checked for every character (`tests/characters.test.ts` via `tests/helpers/geo.ts`):

1. Eyes, mouth, brows and blush stay on the **visible plate** (plate ∩ shell when clipped) for every emotion × intensity 0 / 0.5 / 1 × entry + loop time 0–7 s × gaze centre and four extremes.
2. Tear pools, drops and streams stay on the plate through the whole drop cycle.
3. Working / needs-input / success shapes stay inside the view box and off the plate at 24, 32, 96 and 240 px, at rest and in every animated frame, for all 16 emotions.
4. Status never changes the face: the face markup is identical across all 6 statuses for every emotion.
5. No two characters share an outline; silhouette IoU between any two is < 0.97 — so a character is never a recolour.
6. Characters read apart at icon size, not just in outline (`tests/family-revisions.test.ts`, `scripts/distinctness.tsx`): the calm faces at 24 / 32 / 48 px in greyscale are compared by normalised cross-correlation of their light/dark layout. No pair may reach 0.75; the revised characters hold tighter bounds against the characters they used to resemble. This is a floor, not a verdict — the blind greyscale sheets that script writes are meant to be looked at.
7. Every character's complete output matches its fingerprint in `tests/fixtures/family-hashes.json` (all 16 emotions × 6 statuses × 4 sizes × 3 intensities, gaze extremes, flat / tight variants, animated first paint).

## 4. Emotions (16) and the shared pose protocol

`calm, focus, think, puzzled, curious, happy, laugh, smug, shy, celebrate, surprised, angry, sleepy, aggrieved, cry, sob` (`src/library/emotions.ts`). Each emotion is a pose in **Jojo units** (`src/library/pose.ts`), an optional entry track (anticipation → action → settle), an optional loop, blink rhythm, gaze behaviour and breathing.

The rig (`src/library/rig.ts`) maps a pose onto a character:

- body travel scales with the shell; tilt and squash do not;
- feature travel scales with the plate (`rig.feat`, `rig.gaze` can reduce it on small plates);
- an eye **keeps its own shape** and takes only the emotion's relative change (a dot eye stays a dot and grows when surprised; a dash stays a dash); emotions that reshape the eye (happy/laugh/celebrate arcs, sob chevrons) are drawn at this character's arc size. The two blend by how far the eye has turned or bent, so springs never pop;
- the mouth takes the emotion's change in width and opening, scaled to its own mouth.

Intensity 0..1 blends from calm (0 still reads, 1 is the full pose); reshaped eyes keep their full shape at any intensity.

## 5. Statuses (6)

`idle, working, needs-input, success, error, offline` (`src/library/status.ts`). Status is a second channel: it drives the signal dot and the shapes beside it, and dims the avatar when offline. **It never changes the emotion** — an error does not make anyone cry.

| status | shape | motion |
| --- | --- | --- |
| idle | dot in its notch | — |
| working | open progress arc hugging the notch | fills to 62 %, then the lit segment travels continuously — **only in `full` motion** |
| needs-input | white "?" bubble beside the dot | pops once with a small overshoot, then holds completely still |
| success | the dot becomes a check badge | pops, draws the check and flashes once; the check then stays. Re-renders never replay it; `replayStatus()` does |
| error | "!" in the dot | two small shakes, then holds |
| offline | grey dot, desaturated avatar | none |

## 6. Motion: modes, timing, priority, interruption

- `motion`: `auto` (default: `full`, or `static` when the OS asks for reduced motion), `full` (blink, breathing, loops, transitions), `transitions` (animate changes, then stop and unsubscribe), `static`. Reduced motion always wins, even over an explicit `full`.
- Timing: emotion changes are a slightly under-damped spring (stiffness 210, damping 22), so a change lands with a hint of follow-through; entries are keyframed tracks that start and end at rest; loops are pure functions of time since the emotion began; blinks are irregular (sometimes double); gaze saccades are small and bounded.
- Priority and interruption: reduced motion › `motion` setting. On top of the spring target, the engine adds entry → poke → loop → breathing/blink, in that order. Any new change restarts its accent from one clock — nothing stacks, no timers are created. Status runs on its own clock (`replayStatus` restarts it).
- `poke()` is a short tap reaction; repeated pokes restart it; ignored when static.

## 7. Small sizes

Resolved in `src/library/config.ts`:

- ≤ 64 px: `tight` framing; < 72 px: no shadow; < 56 px: no brows;
- ≤ 40 px: flat fills, no shine/confetti/Zzz, hairlines never thinner than ~1.4 device px;
- status shapes switch to their small variants: thicker gauge, a larger borderless bubble, a larger check badge (per-character boost, capped at Jojo's 0.55 when the plate is close).

All explicit props win over `auto`.

## 8. Static export

`<AvatarStatic>` and `renderSvg()` render exactly the frame the animated component paints first (`staticFrame`), with no effects — usable in SSR, emails, icons and asset pipelines. `scripts/export-private-kit.tsx` (`pnpm export:private`, local only) uses the same path for every file in the private asset kit; the public site offers no downloads.

## 9. Accessibility

- Default `role="img"` with a text name: `"<Name>：<表情>，状态：<状态>"` (status omitted when idle).
- `decorative` sets `aria-hidden` for avatars whose meaning is already in adjacent text.
- Status is always also spelled out in text; shapes differ by silhouette, not colour alone, so they read in greyscale at 24 px (`tests/status-node.test.tsx` proves it pixel-by-pixel for Jojo across all 16 emotions; `tests/family-small.test.tsx` checks that idle / working / needs-input / success differ by real greyscale pixels for every character — at least 4 at 32 px and 2 at 24 px, since the companions' notches leave their shapes less room than Jojo's).
- Every instance gets unique SVG `defs` ids, so many avatars on one page never cross-reference each other's gradients or clips.

## 10. Performance and lifecycle

- React renders the markup once; the engine writes animated attributes directly, only when they change.
- One shared `requestAnimationFrame` for the whole page; instances subscribe only while they have something to animate.
- Paused when off-screen (IntersectionObserver) and while the tab is hidden; `transitions` and `static` instances hold no subscription at rest.
- Unmount removes the subscription, the observer and any pointer listeners (`tests/component.test.tsx`, `tests/status.test.tsx`).
- No frame-rate promise is made; the work per frame is a few hundred attribute comparisons per animating instance.

## 11. Adding a character

See [EXTENDING.md](EXTENDING.md).
