// @vitest-environment node
// The public showcase is Joye's personal character IP on display, not a
// component library or asset store: a real production build must contain no
// downloads, asset kits, source art, vector masters, source maps, exporter
// chunk, copy-code snippet or repository links. This is a real `vite build`,
// not a check that some button is hidden with CSS.
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { build } from 'vite'
import { checkPublicDist } from '../scripts/check-public-dist'

const out = mkdtempSync(join(tmpdir(), 'jojo-public-'))

describe('public site build', () => {
  beforeAll(async () => {
    await build({ configFile: 'vite.config.ts', logLevel: 'silent', build: { outDir: out, emptyOutDir: true } })
  }, 120_000)
  afterAll(() => rmSync(out, { recursive: true, force: true }))

  it('ships only the page, its JS/CSS/fonts, the 404 page and the favicon', () => {
    expect(checkPublicDist(out)).toEqual([])
    expect(existsSync(join(out, 'index.html'))).toBe(true)
    expect(existsSync(join(out, '404.html'))).toBe(true)
  })

  it('has no downloads tree, kit, source art or revision masters', () => {
    for (const p of ['downloads', 'reference', 'kit', 'downloads/jojo-friends-kit.zip', 'reference/revisions/o05-r1.svg']) {
      expect(existsSync(join(out, p)), p).toBe(false)
    }
  })

  it('the only image it ships is the display WebP of Filo on duty — no PNG, SVG master or build script', () => {
    const images = readdirSync(join(out, 'assets')).filter((f) => !/\.(js|css|woff2?)$/.test(f))
    expect(images).toHaveLength(1)
    expect(images[0]).toMatch(/^filo-on-duty-[\w-]+\.webp$/)
    const js = readdirSync(join(out, 'assets')).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(out, 'assets', f), 'utf8')).join('\n')
    expect(js).not.toMatch(/filo-ops-avatar|\.private\.svg|design\.py|reference\/variants/)
  })

  it('the 404 page is a real page, not the app shell', () => {
    const html = readFileSync(join(out, '404.html'), 'utf8')
    expect(html).toContain('找不到这个页面')
    expect(html).not.toContain('id="root"')
  })
})

describe('checkPublicDist', () => {
  it('catches every kind of leak it guards against', () => {
    const bad = mkdtempSync(join(tmpdir(), 'jojo-leak-'))
    try {
      mkdirSync(join(bad, 'assets'))
      mkdirSync(join(bad, 'downloads/jojo'), { recursive: true })
      mkdirSync(join(bad, 'reference/revisions'), { recursive: true })
      writeFileSync(join(bad, 'index.html'), '<a href="https://github.com/joyehuang/jojo-friends">GitHub</a>')
      writeFileSync(join(bad, 'downloads/jojo/jojo-kit.zip'), 'PK')
      writeFileSync(join(bad, 'reference/revisions/o05-r1.svg'), '<svg/>')
      writeFileSync(join(bad, 'assets/index-abc.js'), 'x()\n//# sourceMappingURL=index-abc.js.map')
      writeFileSync(join(bad, 'assets/index-abc.js.map'), '{}')
      writeFileSync(join(bad, 'assets/exporter-abc.js'), 'renderToStaticMarkup(a);c.toBlob(ok)')
      writeFileSync(join(bad, 'notes.txt'), 'private')
      writeFileSync(join(bad, 'assets/filo-ops-avatar.private.svg'), '<svg/>')
      writeFileSync(join(bad, 'assets/filo-on-duty-abc.png'), 'png')
      const problems = checkPublicDist(bad).join('\n')
      for (const want of [
        'index.html: contains link to the source repository',
        'downloads/jojo/jojo-kit.zip: must not be published',
        'reference/revisions/o05-r1.svg: must not be published',
        'assets/index-abc.js: contains source map reference',
        'assets/index-abc.js.map: must not be published',
        'assets/exporter-abc.js: contains server renderer',
        'assets/exporter-abc.js: contains in-browser PNG/WebP exporter',
        'notes.txt: not on the public allowlist',
        'assets/filo-ops-avatar.private.svg: not on the public allowlist',
        'assets/filo-on-duty-abc.png: not on the public allowlist',
      ]) expect(problems).toContain(want)
    } finally {
      rmSync(bad, { recursive: true, force: true })
    }
  })
})

describe('public build configuration', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'))

  it('the build never runs the private kit exporter and always runs the public check', () => {
    expect(pkg.scripts.build).not.toMatch(/export-private-kit|export-site-assets/)
    expect(pkg.scripts.dev).not.toMatch(/export-private-kit|export-site-assets/)
    expect(pkg.scripts.build).toMatch(/check-public-dist\.ts dist$/)
    expect(pkg.license).toBe('UNLICENSED')
  })

  it('source maps stay off', () => {
    expect(readFileSync('vite.config.ts', 'utf8')).toMatch(/sourcemap:\s*false/)
  })

  it('the host has no catch-all rewrite, so retired URLs 404 instead of serving the app', () => {
    const sources: string[] = vercel.rewrites.map((r: { source: string }) => r.source)
    expect(sources.sort()).toEqual(['/about', '/c/:id'])
    expect(vercel.redirects).toEqual([{ source: '/spec', destination: '/about', permanent: true }])
  })

  it('the private exporter writes outside public/', () => {
    const src = readFileSync('scripts/export-private-kit.tsx', 'utf8')
    expect(src).toContain("const OUT = 'private-exports'")
    expect(src).not.toMatch(/['"]public\//)
    expect(readFileSync('.gitignore', 'utf8')).toMatch(/^private-exports$/m)
  })
})
