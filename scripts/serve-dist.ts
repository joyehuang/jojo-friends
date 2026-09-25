// Serves dist/ the way the host does: vercel.json redirects and exact
// rewrites, real files only, and 404.html (status 404) for anything else —
// no SPA fallback, so a missing route shows up locally as a real 404.
//   pnpm exec tsx scripts/serve-dist.ts [port]
import { existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
  redirects: Array<{ source: string; destination: string }>
  rewrites: Array<{ source: string; destination: string }>
}
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json',
}

/** "/c/:id" → matcher that returns the params, or null. */
export function matcher(source: string) {
  const keys: string[] = []
  const re = new RegExp('^' + source.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '/?$')
  return (path: string) => {
    const m = re.exec(path)
    return m ? Object.fromEntries(keys.map((k, i) => [k, m[i + 1]])) : null
  }
}
const fill = (dest: string, p: Record<string, string>) => dest.replace(/:(\w+)/g, (_, k) => p[k])

function file(dist: string, path: string) {
  const f = normalize(join(dist, decodeURIComponent(path)))
  if (!f.startsWith(normalize(dist))) return null
  if (existsSync(f) && statSync(f).isFile()) return f
  return null
}

/** What the host answers for a path: a redirect, a file, or the 404 page. */
export function resolveRequest(dist: string, path: string): { status: 200 | 308 | 404; file?: string; location?: string } {
  for (const r of vercel.redirects) {
    const p = matcher(r.source)(path)
    if (p) return { status: 308, location: fill(r.destination, p) }
  }
  let f = file(dist, path) ?? (path === '/' ? file(dist, '/index.html') : null)
  if (!f) for (const r of vercel.rewrites) {
    const p = matcher(r.source)(path)
    if (p && (f = file(dist, fill(r.destination, p)))) break
  }
  return f ? { status: 200, file: f } : { status: 404, file: join(dist, '404.html') }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] ?? 4317)
  createServer((req, res) => {
    const r = resolveRequest('dist', new URL(req.url ?? '/', 'http://x').pathname)
    if (r.status === 308) return res.writeHead(308, { location: r.location }).end()
    res.writeHead(r.status, { 'content-type': TYPES[extname(r.file!)] ?? 'application/octet-stream' }).end(readFileSync(r.file!))
  }).listen(port, '127.0.0.1', () => console.log(`dist on http://127.0.0.1:${port} (host routing, no SPA fallback)`))
}
