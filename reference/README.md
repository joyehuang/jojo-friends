# Reference art

These are the **source images** the 26 vector characters were redrawn from. They are raster concept art, kept so anyone can compare each vector master against its origin (`pnpm identity`, and the "原画与造型" panel on every character page).

| path | what it is |
| --- | --- |
| `hero-h.png` | Jojo (No.01), the approved lead character, 1254 × 1254 |
| `h-family/02.png` … `06.png` | the five companions from the first family sheet (No.02–06), 512 × 512 crops |
| `options-20/01.png` … `20.png` | twenty more candidates from the same family (No.07–26), 512 × 512 crops |
| `sheets/family-h-approved.png` | the six-character family sheet the `h-family` crops come from |
| `sheets/overview-20.png`, `sheets/group-*.png` | the sheets the `options-20` crops come from; the numbers under each tile in `overview-20.png` were added programmatically and are not part of the artwork |

| `revisions/<id>-r<N>.svg` | superseded vector designs of characters that were later revised (currently `o05`, `o07`, `o16` r1), rendered from the component when they were replaced |
| `variants/o18-on-duty/` | Filo's static "值班版 / On duty" identity look (approved 2026-10-06): approved PNG, SVG master and build script; only a lossless WebP copy is public, see its README |

## Design revisions

Three characters no longer follow their source image on purpose: **Pocket `o05`**, **Mino `o16`** and **Dotty `o07`** were revised on 2026-09-25 because their r1 redraws read as another character at icon size (Pocket and Mino as Jojo, Dotty as Zaza). Their source images above are kept unchanged as the historical reference; they are not the current design and their identity IoU against the current vector is low by design. What changed and why is recorded in each spec's `design` field and in `docs/CHARACTERS.md`.

## Provenance

- All images were generated with ChatGPT's image generation (the UI did not show a model version, so none is claimed). Jojo was generated first; the companions were generated with Jojo attached as a style reference.
- The crops are straight square crops with no shape edits.
- `hero-h.png` is the original file with one change: its embedded C2PA content-credentials chunk (`caBX`, which carries per-generation identifiers) was removed from this public copy. Pixel data is unchanged; the original file's sha256 is recorded as `source.originalSha256` in `src/library/characters/jojo.ts`. The image is AI-generated, as stated here.
- Each character's `source.sha256` is the hash of the file in this folder; `tests/characters.test.ts` checks it.

## Rights

These designs are published for viewing and review. **No licence to use the characters or mascots is granted** (the repository is `UNLICENSED`), usage rights are still to be confirmed, and no trademark search has been done.
