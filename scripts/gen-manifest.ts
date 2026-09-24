// Writes reference/characters-source-manifest.json and docs/CHARACTERS.md from
// the registry, and verifies the sources: 26 files, unique hashes, no two
// images near-duplicates of each other, every hash matching the file on disk.
//   pnpm exec tsx scripts/gen-manifest.ts
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'
import { CHARACTER_LIST } from '../src/library'
import { identity } from './ref/identity'

/** 32 × 32 greyscale thumbnail of the non-background content, for duplicate detection. */
async function thumb(file: string) {
  const buf = await sharp(file).removeAlpha().greyscale().trim({ threshold: 18 }).resize(32, 32, { fit: 'fill' }).raw().toBuffer()
  return Array.from(buf)
}

async function main() {
  const rows = []
  const thumbs: number[][] = []
  for (const ch of CHARACTER_LIST) {
    const bytes = readFileSync(ch.source.file)
    const sha = createHash('sha256').update(bytes).digest('hex')
    if (sha !== ch.source.sha256) throw new Error(`${ch.id}: sha256 mismatch for ${ch.source.file}`)
    thumbs.push(await thumb(ch.source.file))
    const id = await identity(ch)
    const e = ch.spec.eyes
    const stacked = Math.abs(e[0].cx - e[1].cx) < Math.max(e[0].w, e[1].w)
    rows.push({
      id: ch.id,
      no: ch.no,
      name: ch.name,
      persona: ch.persona,
      source: {
        file: ch.source.file,
        batch: ch.source.batch,
        index: ch.source.index,
        sizePx: ch.source.size,
        sha256: sha,
        ...(ch.source.originalSha256 ? { originalSha256: ch.source.originalSha256, note: 'public copy has the embedded C2PA chunk removed; pixels identical' } : {}),
      },
      form: ch.form,
      traits: {
        shell: ch.spec.shell.type,
        plate: ch.spec.face.type,
        plateClip: ch.faceClip ? 'shell' : 'overhangs',
        plateRotate: ch.faceRotate?.deg ?? 0,
        notchDir: ch.signal.outward,
        eyeLayout: stacked ? 'stacked' : 'side-by-side',
        eyes: e.map((q) => (Math.abs(q.w - q.h) < 3 ? 'dot' : (q.rot ?? 0) === 90 ? 'dash' : q.rot ? 'tilted capsule' : 'capsule')),
        mouth: Math.abs(ch.spec.mouth.w - ch.spec.mouth.h) < 4 ? 'dot' : 'capsule',
        palette: { shell: ch.palette.shell, plate: ch.palette.face, ink: ch.palette.ink, mouth: ch.palette.mouth, dot: ch.palette.dot },
      },
      cleanup: ch.cleanup,
      identity: { meanIoU: id.mean, perColour: id.iou },
    })
  }
  // verification
  const shas = new Set(rows.map((r) => r.source.sha256))
  if (rows.length !== 26 || shas.size !== 26) throw new Error(`expected 26 unique sources, got ${rows.length} / ${shas.size}`)
  let closest = { d: Infinity, pair: '' }
  for (let a = 0; a < thumbs.length; a++) for (let b = a + 1; b < thumbs.length; b++) {
    const d = thumbs[a].reduce((s, v, i) => s + Math.abs(v - thumbs[b][i]), 0) / thumbs[a].length
    if (d < closest.d) closest = { d, pair: `${rows[a].id}/${rows[b].id}` }
  }
  if (closest.d < 6) throw new Error(`near-duplicate sources: ${closest.pair} (mean abs diff ${closest.d.toFixed(1)})`)

  const manifest = {
    title: 'Jojo & Friends — character source manifest',
    count: rows.length,
    scope:
      'The approved lead (hero-h) + the 5 companions of the first family sheet (h-family 02–06) + the 20 same-family candidates (options-20 01–20). ' +
      'h-family/01-jojo.png is a crop of the lead and is not a separate character; the later 20 different-art-style explorations (styles-20) are a different family and are not included.',
    verification: {
      uniqueSha256: shas.size,
      nearestSourcePair: { pair: closest.pair, meanAbsDiff32px: +closest.d.toFixed(2) },
      identityMethod: 'calm vector master rendered in the source framing vs the source pixels; per-colour IoU over the character\'s shell / plate / ink / dot classes',
    },
    characters: rows,
  }
  writeFileSync('reference/characters-source-manifest.json', JSON.stringify(manifest, null, 2) + '\n')

  const md = [
    '# The 26 characters',
    '',
    '中文说明：26 位角色的名字、稳定 id、来源与造型要点。本文件由 `scripts/gen-manifest.ts` 从注册表生成，请勿手改。',
    '',
    'Generated from the registry by `scripts/gen-manifest.ts` — do not edit by hand. Machine ids are stable; display names may change. Personas are light fiction, not capabilities.',
    '',
    ...rows.map((r) => [
      `## No.${String(r.no).padStart(2, '0')} ${r.name.en} · ${r.name.zh} — \`${r.id}\``,
      '',
      `- ${r.persona.zh} / ${r.persona.en}`,
      `- 造型：${r.form}`,
      `- Source: \`${r.source.file}\` (${r.source.batch} ${r.source.index}), identity mean IoU ${r.identity.meanIoU.toFixed(3)}`,
      `- Traits: ${r.traits.eyeLayout} eyes (${r.traits.eyes.join(' + ')}), ${r.traits.mouth} mouth, notch ${r.traits.notchDir}°, plate ${r.traits.plate}${r.traits.plateClip === 'overhangs' ? ' (overhangs the shell)' : ''}${r.traits.plateRotate ? `, tilted ${r.traits.plateRotate}°` : ''}`,
      ...(r.cleanup.length ? [`- Cleaned while redrawing: ${r.cleanup.join('; ')}`] : []),
      '',
    ].join('\n')),
  ].join('\n')
  writeFileSync('docs/CHARACTERS.md', md)
  console.log(`manifest: ${rows.length} characters, unique sha ${shas.size}, nearest pair ${closest.pair} ${closest.d.toFixed(1)}`)
  console.log(rows.map((r) => `${r.id} ${r.identity.meanIoU.toFixed(3)}`).join('  '))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
