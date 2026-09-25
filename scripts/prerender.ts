// Prerenders every page of the site to its own HTML file, after `vite build`
// (client, into dist/) and `vite build --ssr` (server entry, into .ssr/):
//
//   dist/index.html, dist/stories/index.html, dist/stories/<id>/index.html,
//   dist/friends/index.html, dist/play/index.html, dist/about/index.html,
//   dist/c/<id>/index.html, dist/404.html (static, no app), dist/og/*.png
//
// Each page gets its own <title>, description and Open Graph tags. Absolute
// URLs (og:url, og:image) use the host the build is deployed to — the Vercel
// preview's own URL on previews, the production URL on production — and are
// left out locally. Nothing here claims a domain the site doesn't have.
//
//   pnpm exec tsx scripts/prerender.ts [dist] [.ssr]
import { Resvg } from '@resvg/resvg-js'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import sharp from 'sharp'
import { AvatarStatic, CHARACTERS, type EmotionId } from '../src/library'
import { centreShift } from '../src/site/avatar-frame'

type Kind = 'home' | 'stories' | 'story' | 'friends' | 'play' | 'character' | 'about' | 'notfound'
interface Rendered { html: string; kind: Kind; meta: { title: string; description: string; image?: string; type: string } }
interface StoryInfo { id: string; cover: { type: 'film'; media: string } | { type: 'scene'; cast: Array<{ id: string; emotion: string }> } }
interface ServerEntry { render: (path: string) => Rendered; prerenderPaths: () => string[]; STORIES: StoryInfo[] }
type Manifest = Record<string, { file: string; imports?: string[]; isEntry?: boolean }>

const PAGE_MODULE: Record<Kind, string> = {
  home: 'src/site/pages/Home.tsx',
  stories: 'src/site/pages/Stories.tsx',
  story: 'src/site/pages/StoryPage.tsx',
  friends: 'src/site/pages/Friends.tsx',
  play: 'src/site/pages/Play.tsx',
  character: 'src/site/pages/CharacterPage.tsx',
  about: 'src/site/pages/About.tsx',
  notfound: 'src/site/pages/NotFound.tsx',
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Where this build will be served from, if we know. */
export function siteOrigin(env: NodeJS.ProcessEnv = process.env) {
  if (env.SITE_ORIGIN) return { origin: env.SITE_ORIGIN.replace(/\/$/, ''), production: env.VERCEL_ENV === 'production' }
  if (env.VERCEL_ENV === 'production' && env.VERCEL_PROJECT_PRODUCTION_URL) return { origin: `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`, production: true }
  const host = env.VERCEL_BRANCH_URL || env.VERCEL_URL
  return { origin: host ? `https://${host}` : '', production: false }
}

function preloads(manifest: Manifest, kind: Kind) {
  const seen = new Set<string>()
  const walk = (key: string) => {
    const m = manifest[key]
    if (!m || seen.has(m.file)) return
    seen.add(m.file)
    for (const i of m.imports ?? []) walk(i)
  }
  walk(PAGE_MODULE[kind])
  const entry = Object.values(manifest).find((m) => m.isEntry)
  if (entry) seen.delete(entry.file)
  return [...seen].map((f) => `<link rel="modulepreload" crossorigin href="/${f}">`).join('\n    ')
}

function head(template: string, r: Rendered, path: string, manifest: Manifest, where: ReturnType<typeof siteOrigin>) {
  const { meta } = r
  const tags = [
    `<meta property="og:site_name" content="Jojo 的小家">`,
    `<meta property="og:type" content="${meta.type}">`,
    `<meta property="og:title" content="${esc(meta.title)}">`,
    `<meta property="og:description" content="${esc(meta.description)}">`,
    `<meta property="og:locale" content="zh_CN">`,
    `<meta name="twitter:card" content="${meta.image ? 'summary_large_image' : 'summary'}">`,
  ]
  if (where.origin) {
    tags.push(`<meta property="og:url" content="${esc(where.origin + path)}">`)
    if (meta.image) tags.push(`<meta property="og:image" content="${esc(where.origin + meta.image)}">`, `<meta property="og:image:width" content="1200">`, `<meta property="og:image:height" content="630">`)
  }
  if (where.production && where.origin) tags.push(`<link rel="canonical" href="${esc(where.origin + path)}">`)
  // previews and local builds are not the real site: keep them out of search
  if (!where.production) tags.push(`<meta name="robots" content="noindex">`)
  const pre = preloads(manifest, r.kind)
  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(meta.description)}" />`)
    .replace('</head>', `    ${tags.join('\n    ')}\n    ${pre}\n  </head>`)
}

/* ---------------- share images (no text: the build host has no CJK fonts) ---------------- */

const OG_W = 1200, OG_H = 630
const h = createElement

/** Characters placed in one React tree, so every SVG id stays unique. */
function actors(list: Array<{ id: string; emotion: EmotionId; x: number; y: number; size: number }>): ReactElement[] {
  return list.map((a, i) => {
    // centred on the character itself, like every static avatar on the site
    const d = centreShift(CHARACTERS[a.id], a.size)
    return h('g', { key: i, transform: `translate(${a.x + (d.x / 100) * a.size} ${a.y + (d.y / 100) * a.size})` }, h(AvatarStatic, { character: a.id, emotion: a.emotion, size: a.size, decorative: true }))
  })
}

function png(tree: ReactElement) {
  const svg = renderToStaticMarkup(tree)
  return new Resvg(svg, { fitTo: { mode: 'width', value: OG_W }, font: { loadSystemFonts: false } }).render().asPng()
}

function houseOg() {
  // the same house as the home page, drawn larger
  const k = 1.1, ox = 300, oy = 60
  const t = `translate(${ox} ${oy}) scale(${k})`
  const line = { fill: 'none', stroke: '#2d3272', strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return png(
    h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: OG_W, height: OG_H, viewBox: `0 0 ${OG_W} ${OG_H}` },
      h('rect', { width: OG_W, height: OG_H, fill: '#f6f3ec' }),
      h('g', { transform: t },
        h('path', { d: 'M100 452 V218 L300 74 L500 218 V452', ...line, fill: '#fbf9f3' }),
        h('path', { d: 'M300 74 V44', ...line }),
        h('circle', { cx: 300, cy: 36, r: 9, fill: '#fe6a4a' }),
        h('path', { d: 'M150 452 V304 Q150 266 188 266 H272 Q310 266 310 304 V452', ...line, fill: '#eee8da' }),
        h('rect', { x: 352, y: 276, width: 112, height: 94, rx: 22, ...line, fill: '#cff0e6' }),
        h('path', { d: 'M24 452 H576', ...line }),
      ),
      ...actors([
        { id: 'jojo', emotion: 'happy', x: ox + 118 * k, y: oy + 236 * k, size: 224 },
        { id: 'o18', emotion: 'calm', x: ox + 352 * k, y: oy + 262 * k, size: 118 },
      ]),
    ),
  )
}

function sceneOg(cast: Array<{ id: string; emotion: string }>) {
  const size = cast.length > 1 ? 420 : 520
  const gap = cast.length > 1 ? 40 : 0
  const total = cast.length * size + (cast.length - 1) * gap
  const x0 = (OG_W - total) / 2
  return png(
    h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: OG_W, height: OG_H, viewBox: `0 0 ${OG_W} ${OG_H}` },
      h('rect', { width: OG_W, height: OG_H, fill: '#f6f3ec' }),
      h('rect', { x: 0, y: OG_H - 150, width: OG_W, height: 150, fill: '#cff0e6' }),
      ...actors(cast.map((c, i) => ({ id: c.id, emotion: c.emotion as EmotionId, x: x0 + i * (size + gap), y: (OG_H - size) / 2 + 10, size }))),
    ),
  )
}

async function shareImages(dist: string, STORIES: StoryInfo[]) {
  mkdirSync(join(dist, 'og'), { recursive: true })
  writeFileSync(join(dist, 'og/home.png'), await sharp(houseOg()).png({ compressionLevel: 9, palette: true }).toBuffer())
  for (const s of STORIES) {
    const file = join(dist, `og/${s.id}.png`)
    if (s.cover.type === 'film') {
      const poster = `src/site/media/${s.cover.media}-poster.webp`
      await sharp(poster).resize(OG_W, OG_H, { fit: 'cover' }).png({ compressionLevel: 9, palette: true }).toFile(file)
    } else writeFileSync(file, await sharp(sceneOg(s.cover.cast)).png({ compressionLevel: 9, palette: true }).toBuffer())
  }
}

/* ---------------- 404: the site's own look, but a static page (no app shell) ---------------- */

function notFoundPage(template: string, r: Rendered) {
  const body = r.html
  return template
    .replace(/<script type="module"[^>]*><\/script>/g, '')
    .replace(/<link rel="modulepreload"[^>]*>/g, '')
    .replace(/<title>[\s\S]*?<\/title>/, '<title>找不到这个页面 · Jojo 的小家</title>')
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, '<meta name="description" content="这里还没有房间。" />\n    <meta name="robots" content="noindex" />')
    .replace(/<div id="root"><\/div>/, `<div class="static-404">${body}</div>`)
    .replace(/<noscript>[\s\S]*?<\/noscript>/, '')
    .replace('<h1 class="page-title">这里还没有房间</h1>', '<h1 class="page-title">这里还没有房间</h1><p class="nf-sr">找不到这个页面</p>')
}

export async function prerender(dist = 'dist', ssrDir = '.ssr') {
  const template = readFileSync(join(dist, 'index.html'), 'utf8')
  const manifestFile = join(dist, '.vite/manifest.json')
  const manifest: Manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : {}
  const entry = resolve(ssrDir, 'entry-server.js')
  const server = (await import(pathToFileURL(entry).href)) as ServerEntry
  const where = siteOrigin()
  const written: string[] = []
  for (const path of server.prerenderPaths()) {
    const r = server.render(path)
    if (r.kind === 'notfound') throw new Error(`prerender: ${path} rendered as not found`)
    const html = head(template, r, path, manifest, where).replace('<div id="root"></div>', `<div id="root">${r.html}</div>`)
    const file = path === '/' ? join(dist, 'index.html') : join(dist, path.slice(1), 'index.html')
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, html)
    written.push(file)
  }
  const nf = server.render('/__404__')
  writeFileSync(join(dist, '404.html'), notFoundPage(head(template, nf, '/404', {}, { origin: '', production: false }), nf))
  await shareImages(dist, server.STORIES)
  rmSync(join(dist, '.vite'), { recursive: true, force: true })
  rmSync(ssrDir, { recursive: true, force: true })
  return { pages: written.length, origin: where.origin || '(none: local build)', production: where.production }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  prerender(process.argv[2], process.argv[3]).then((r) => console.log(`prerendered ${r.pages} pages + 404 + share images · origin ${r.origin}${r.production ? ' (production)' : ''}`))
}
