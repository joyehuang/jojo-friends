// @vitest-environment node
// The public site is Joye's personal character IP on display, not a
// component library or asset store: a real production build must contain no
// downloads, asset kits, source art, vector masters, standard-avatar exports,
// source maps, exporter chunk, copy-code snippet or repository links. This is
// the real pipeline — client build, server build, prerender — not a check that
// some button is hidden with CSS.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { build } from 'vite'
import { checkPublicDist } from '../scripts/check-public-dist'
import { prerender } from '../scripts/prerender'
import { resolveRequest } from '../scripts/serve-dist'

const out = mkdtempSync(join(tmpdir(), 'jojo-public-'))
const ssr = mkdtempSync(join(tmpdir(), 'jojo-ssr-'))
const page = (p: string) => readFileSync(join(out, p), 'utf8')

describe('public site build', () => {
  const env = process.env.NODE_ENV
  beforeAll(async () => {
    // build exactly like `pnpm build` (vitest sets NODE_ENV=test, which would
    // switch the React plugin to its dev JSX transform with source paths)
    process.env.NODE_ENV = 'production'
    await build({ configFile: 'vite.config.ts', logLevel: 'silent', mode: 'production', build: { outDir: out, emptyOutDir: true } })
    await build({ configFile: 'vite.config.ts', logLevel: 'silent', mode: 'production', build: { ssr: 'src/site/entry-server.tsx', outDir: ssr, emptyOutDir: true } })
    await prerender(out, ssr)
    process.env.NODE_ENV = env
  }, 180_000)
  afterAll(() => {
    rmSync(out, { recursive: true, force: true })
    rmSync(ssr, { recursive: true, force: true })
  })

  it('ships only the prerendered pages, their JS/CSS/fonts, story images, share images, the 404 page and the favicon', () => {
    expect(checkPublicDist(out)).toEqual([])
    for (const p of ['index.html', '404.html', 'stories/index.html', 'friends/index.html', 'play/index.html', 'about/index.html', 'c/jojo/index.html', 'c/o18/index.html', 'og/home.png']) {
      expect(existsSync(join(out, p)), p).toBe(true)
    }
    expect(existsSync(join(out, '.vite')), 'build manifest removed').toBe(false)
  })

  it('has no downloads tree, kit, source art, revision masters or private exports', () => {
    for (const p of ['downloads', 'reference', 'kit', 'private-exports', 'standard-avatars', 'downloads/jojo-friends-kit.zip', 'reference/revisions/o05-r1.svg']) {
      expect(existsSync(join(out, p)), p).toBe(false)
    }
  })

  it('every page is real HTML with its own title, description and share tags', () => {
    const titles = new Set<string>()
    for (const p of ['index.html', 'stories/index.html', 'stories/filo-picks-a-face/index.html', 'friends/index.html', 'play/index.html', 'c/o18/index.html']) {
      const html = page(p)
      const title = /<title>([^<]+)<\/title>/.exec(html)![1]
      titles.add(title)
      expect(html, p).toMatch(/<div id="root"><a class="skip"/)
      expect(html, p).toMatch(/<meta property="og:title" content="[^"]+">/)
      // not deployed to production here: previews and local builds stay out of search
      expect(html, p).toContain('<meta name="robots" content="noindex">')
      expect(html, p).not.toContain('rel="canonical"')
    }
    expect(titles.size).toBe(6)
    expect(page('stories/filo-picks-a-face/index.html')).toContain('真实的部分只有一件')
  })

  it('the film is never fetched by a page load: no <video> in the HTML, only a poster', () => {
    const html = page('stories/jojo-builds-a-home/index.html')
    expect(html).not.toMatch(/<video|\.mp4/)
    expect(html).toMatch(/assets\/jojo-builds-home-poster-[\w-]+\.webp/)
    expect(page('index.html')).not.toMatch(/\.mp4|<video/)
  })

  it('the 404 page is a real page in the site\'s look, not the app shell', () => {
    const html = page('404.html')
    expect(html).toContain('找不到这个页面')
    expect(html).toContain('这里还没有房间')
    expect(html).not.toContain('id="root"')
    expect(html).not.toMatch(/<script/)
  })

  it('the host serves exact routes only: unknown and retired paths are 404s', () => {
    const ok = ['/', '/stories', '/stories/', '/stories/door-404', '/friends', '/play', '/about', '/c/jojo', '/c/o18']
    for (const p of ok) expect(resolveRequest(out, p).status, p).toBe(200)
    const gone = ['/stories/nope', '/c/zzz', '/c/jojo/extra', '/downloads/jojo-friends-kit.zip', '/downloads/', '/reference/hero-h.png', '/kit', '/kit/index.html', '/private-exports/manifest.json', '/src/site/main.tsx', '/anything']
    for (const p of gone) expect(resolveRequest(out, p).status, p).toBe(404)
    expect(resolveRequest(out, '/spec')).toMatchObject({ status: 308, location: '/about' })
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
      mkdirSync(join(bad, 'stories/x'), { recursive: true })
      writeFileSync(join(bad, 'stories/x/index.html'), '<p>write to someone@example.com</p><a href="https://jojo.house">home</a>')
      writeFileSync(join(bad, 'assets/avatar-abcdefgh.jpg'), 'jpg')
      writeFileSync(join(bad, 'assets/chunk-abc.js'), 'const p="/Users/someone/private-exports/standard-avatars/no01.jpg"')
      mkdirSync(join(bad, 'stories/x/deeper'), { recursive: true })
      writeFileSync(join(bad, 'stories/x/deeper/index.html'), '<p/>')
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
        'stories/x/index.html: contains an email address',
        'stories/x/index.html: contains a domain the site does not own',
        'assets/avatar-abcdefgh.jpg: must not be published',
        'assets/chunk-abc.js: contains path of the private exports',
        'assets/chunk-abc.js: contains local file path',
        'stories/x/deeper/index.html: not on the public allowlist',
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
    expect(pkg.scripts.build).toMatch(/prerender\.ts dist \.ssr/)
    expect(pkg.scripts.build).not.toMatch(/avatar-standard/)
    expect(pkg.license).toBe('UNLICENSED')
  })

  it('source maps stay off', () => {
    expect(readFileSync('vite.config.ts', 'utf8')).toMatch(/sourcemap:\s*false/)
  })

  it('the host has no catch-all rewrite: each route maps to its own prerendered file, so retired URLs 404', () => {
    const rw: Array<{ source: string; destination: string }> = vercel.rewrites
    expect(rw.map((r) => r.source).sort()).toEqual(['/about', '/c/:id', '/friends', '/play', '/stories', '/stories/:id'])
    for (const r of rw) {
      expect(r.destination, r.source).toMatch(/^\/[a-z/:]+\/index\.html$/)
      expect(r.destination, r.source).not.toBe('/index.html')
      expect(r.source, r.source).not.toMatch(/\(|\*|:\w+\*/)
    }
    expect(vercel.redirects).toEqual([{ source: '/spec', destination: '/about', permanent: true }])
  })

  it('the standard-avatar script writes only to private-exports/', () => {
    const src = readFileSync('scripts/avatar-standard.tsx', 'utf8')
    expect(src).toContain("const OUT = 'private-exports/standard-avatars'")
    expect(src).not.toMatch(/['"](public|dist)\//)
  })

  it('the private exporter writes outside public/', () => {
    const src = readFileSync('scripts/export-private-kit.tsx', 'utf8')
    expect(src).toContain("const OUT = 'private-exports'")
    expect(src).not.toMatch(/['"]public\//)
    expect(readFileSync('.gitignore', 'utf8')).toMatch(/^private-exports$/m)
  })
})
