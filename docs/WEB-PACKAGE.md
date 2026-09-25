# `@joyehuang/jojo-web` — private web package

中文说明：给 joyehuang.me 用的 **Jojo-only** 私有包。浏览器运行入口只含 Jojo（不含其他 25 位角色的数据、名字、轮廓，不含 react-dom/server）；构建期静态入口输出内联 SVG 字符串，带 `idPrefix`，同页多只不撞 id；另外只带 3 位家族成员的**成品静态 SVG**（不带它们的规格和几何）。包是 `private: true`、`UNLICENSED`，不发布到 npm。

## What it is

| entry | runs in | contains |
| --- | --- | --- |
| `@joyehuang/jojo-web/runtime` | browser (React 19 peer) | `Jojo` (the approved Jojo, legacy markup, `idPrefix`), `JOJO_GEOMETRY`, `EMOTION_IDS`, `STATUS_IDS`, `ticker`, `usePrefersReducedMotion` |
| `@joyehuang/jojo-web/static` | Node, build time only | `renderJojoSvg({ idPrefix, emotion, … })`, `renderFriendSvg(id, { idPrefix })`, `FRIENDS` (allow-list in `scripts/build-web.ts`) |

How the runtime stays Jojo-only without touching the frozen library:

- `src/web/registry.ts` replaces `src/library/characters/index.ts` for `config.ts` (the only library module that imports the 26-character registry).
- `src/web/jojo.generated.ts` is Jojo's finished character object serialised at build time, replacing `characters/jojo.ts` so the shape solver and authoring metadata stay out.
- The `jojo-only-registry` build plugin fails the build if any other `characters/*` module renders into a chunk.
- `scripts/check-web-dist.ts` greps the output for every other character's id, English/Chinese name, persona and outline, for `react-dom` in the runtime, and for source maps.
- `tests/web-package.test.tsx` renders every emotion × status × size through the **built** artifacts and the library and compares bytes (ids normalised).

## Build

```sh
pnpm build:web      # dist-web/ + out-web/joyehuang-jojo-web-<v>.tgz + report (sha256, sizes)
pnpm vitest run tests/web-package.test.tsx
```

`dist-web/`, `out-web/` and `src/web/*.generated.ts` are gitignored. The tarball is deterministic for a given commit (npm pack fixes mtimes; the minifier is deterministic).

## Distribution (no public registry)

- **Artifact:** the tarball is attached to a *release in this private repository* (tag `jojo-web-v<version>`). Only people and tokens with read access to this repo can download it.
- **Consumer (blog):** `scripts/jojo/fetch-jojo-web.mjs` in the blog downloads the asset through the GitHub API with `Authorization: Bearer $JOJO_WEB_TOKEN` (header, never in a URL or lockfile), verifies the sha256 pinned in the blog's `scripts/jojo/jojo-web.lock.json`, and unpacks it into the gitignored `vendor/jojo-web/`. Without a token the blog builds with Jojo switched off (the current site), so forks and unreviewed PRs build fine and never see the package.
- **Credential:** a fine-grained GitHub token limited to *this repository*, `Contents: Read-only`, nothing else. Store it only in `~/.config/…` (mode 0600) or as a Vercel environment variable scoped to Production and explicitly trusted Preview branches. Do not enable it for all Preview deployments: a Preview build runs code from the branch, so any branch that can reach the token can exfiltrate the package.
- **Not done here:** creating that token (needs the owner in the GitHub UI) and adding it to Vercel.

## Rights

UNLICENSED; see `NOTICE` inside the package. Browsers necessarily receive the runtime JS and rendered SVG; that is not a grant of rights and cannot be technically prevented (no obfuscation or right-click blocking is used).
