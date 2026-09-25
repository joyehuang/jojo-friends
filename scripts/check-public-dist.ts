// Guards the public showcase build: it may contain the page, its JS/CSS/fonts
// and the favicon — never downloads, asset kits, source art, vector masters,
// source maps or links to the (private) repository.
//   pnpm exec tsx scripts/check-public-dist.ts [dist]      (runs at the end of `pnpm build`)
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Everything a public build is allowed to contain, by path. */
const ALLOWED = [
  /^index\.html$/,
  /^404\.html$/,
  /^favicon\.svg$/,
  /^assets\/[\w.-]+\.(js|css|woff2?)$/,
]
/** Paths that must never be published, whatever their extension. */
const FORBIDDEN_PATH = /(^|\/)(downloads|reference|revisions|kit|private-exports|dist-lib|out)(\/|$)|\.(zip|map|tgz|tar|gz|psd|ai|ts|tsx)$/i
/** Strings that mean a download / developer entry point shipped anyway. */
const FORBIDDEN_TEXT: Array<[RegExp, string]> = [
  [/github\.com\/joyehuang/i, 'link to the source repository'],
  [/\/downloads\//, 'path into the retired /downloads tree'],
  [/jojo-friends-kit|-kit\.zip/, 'asset kit file name'],
  [/sourceMappingURL/, 'source map reference'],
  [/renderToStaticMarkup|renderToString/, 'server renderer (SVG exporter) bundled into the site'],
  [/复制代码|在 React 里使用/, 'copy-code / install section'],
  [/toBlob\(/, 'in-browser PNG/WebP exporter'],
  [/import \{ Avatar \} from/, 'copy-paste install snippet'],
]

function walk(dir: string, root = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p, root) : [relative(root, p).split(sep).join('/')]
  })
}

export function checkPublicDist(dir: string): string[] {
  const problems: string[] = []
  for (const file of walk(dir)) {
    if (FORBIDDEN_PATH.test(file)) problems.push(`${file}: must not be published`)
    else if (!ALLOWED.some((re) => re.test(file))) problems.push(`${file}: not on the public allowlist`)
    if (!/\.(html|js|css|svg)$/.test(file)) continue
    const text = readFileSync(join(dir, file), 'utf8')
    for (const [re, what] of FORBIDDEN_TEXT) if (re.test(text)) problems.push(`${file}: contains ${what} (${re})`)
  }
  return problems
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2] ?? 'dist'
  const problems = checkPublicDist(dir)
  if (problems.length) {
    console.error(`public build check FAILED (${dir}):\n  ${problems.join('\n  ')}`)
    process.exit(1)
  }
  console.log(`public build check: ${walk(dir).length} files, no downloads / source maps / developer entry points`)
}
