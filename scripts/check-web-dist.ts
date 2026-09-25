/**
 * Public-artifact check for the web package. The runtime ships to browsers, so
 * it must carry Jojo alone: no other character's id, name or outline, no
 * react-dom/server, no source maps. The static (build-time) entry may carry
 * only the allow-listed friends' finished SVGs.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import { CHARACTER_LIST } from '../src/library'

export function checkWebDist(dir: string, allowFriends: string[]) {
  const failures: string[] = []
  const files = readdirSync(dir)
  if (files.some((f) => f.endsWith('.map'))) failures.push('source map present')
  const read = (f: string) => readFileSync(resolve(dir, f), 'utf8')
  const runtime = read('runtime.js')
  const stat = read('static.js')
  for (const [name, src] of [['runtime.js', runtime], ['static.js', stat]] as const) {
    if (/sourceMappingURL/.test(src)) failures.push(`${name}: sourceMappingURL`)
  }
  if (/react-dom\/server|renderToStaticMarkup|renderToString/.test(runtime)) failures.push('runtime.js references react-dom/server')
  if (/react-dom/.test(runtime)) failures.push('runtime.js imports react-dom')
  const others = CHARACTER_LIST.filter((c) => c.id !== 'jojo')
  const hits: Record<string, string[]> = {}
  for (const c of others) {
    const needles = [`"${c.id}"`, `'${c.id}'`, `data-character="${c.id}"`, c.name.en, c.name.zh, c.persona.en, c.persona.zh]
    if (c.shell.d.length > 40) needles.push(c.shell.d.slice(0, 40))
    const inRuntime = needles.filter((n) => n && runtime.includes(n))
    const allowed = allowFriends.includes(c.id)
    const inStatic = allowed ? [] : needles.filter((n) => n && stat.includes(n))
    if (inRuntime.length) hits[`runtime:${c.id}`] = inRuntime
    if (inStatic.length) hits[`static:${c.id}`] = inStatic
  }
  if (Object.keys(hits).length) failures.push(`other characters found: ${JSON.stringify(hits)}`)
  if (failures.length) throw new Error('[check-web-dist] ' + failures.join('; '))
  const size = (s: string) => ({ raw: Buffer.byteLength(s), gzip: gzipSync(s, { level: 9 }).length })
  return {
    checked: { otherCharacters: others.length, allowFriends, sourceMaps: 0 },
    sizes: { runtime: size(runtime), static: size(stat) },
  }
}

if (process.argv[1]?.endsWith('check-web-dist.ts')) {
  const dir = resolve(process.argv[2] ?? 'dist-web')
  if (!existsSync(dir)) throw new Error(`${dir} missing`)
  console.log(JSON.stringify(checkWebDist(dir, JSON.parse(readFileSync(resolve(dir, 'package.json'), 'utf8')).jojoWeb.friends), null, 2))
}
