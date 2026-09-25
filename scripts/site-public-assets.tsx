// The only generated files the public showcase ships from public/: the favicon.
// Runs in `pnpm build` / `pnpm dev`. It also deletes the folders older builds
// used to publish (downloads, source art, revision masters) so a stale local
// public/ can never leak them into dist/. The full kit is private:
// scripts/export-private-kit.tsx → private-exports/.
import { rmSync, writeFileSync } from 'node:fs'
import { renderSvg } from '../src/library/render'

const RETIRED_PUBLIC_DIRS = ['public/downloads', 'public/reference', 'public/kit']

for (const dir of RETIRED_PUBLIC_DIRS) rmSync(dir, { recursive: true, force: true })
writeFileSync('public/favicon.svg', renderSvg({ character: 'jojo', size: 64, shadow: false, flat: true, framing: 'tight', decorative: true }))
console.log('public assets: favicon.svg (no downloads, no source art)')
