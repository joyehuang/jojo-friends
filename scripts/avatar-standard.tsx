// Standard static avatars (1024 px, subject centred) + a centring audit for all
// 26 characters. PRIVATE: writes to private-exports/ (gitignored, never part of
// the site build).
//
//   pnpm avatars            → private-exports/standard-avatars/
//
// "Subject" = what a viewer reads as the character: shell ∪ face plate ∪ signal
// dot, never the drop shadow or the paper. It is measured from the alpha mask
// of the vector master rendered with the shadow off (not from colour
// thresholds), in the shared canvas and — via each character's `fit` — in its
// source image, where the vectors were drawn over the source pixels.
//
// Placement rule, for every character alike:
//   centre  the subject's bounding-box centre sits on the canvas centre (512, 512)
//   size    the subject's farthest pixel from that centre is SAFE_R px away, so a
//           circular crop (QQ / Telegram) never cuts the character and every
//           character fills the circle the same amount
// Nothing is rotated, stretched, mirrored or redrawn; asymmetric designs stay
// asymmetric (the box centre is centred, not the face or the eyes).
import { Resvg } from '@resvg/resvg-js'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { CHARACTER_LIST, designRevision, type Character } from '../src/library'
import { VIEWBOX } from '../src/library/geometry'
import { renderSvg } from '../src/library/render'
import { SAFE_R, SIZE, subjectGeometry } from '../src/site/avatar-frame'
import { measure } from './ref/measure'

const OUT = 'private-exports/standard-avatars'
const C = SIZE / 2
const PAPER = '#f6f3ec'
/** allowed distance between the measured subject centre and the canvas centre */
const TOLERANCE_PX = 1

const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex')
const r2 = (n: number) => Math.round(n * 100) / 100
const tag = (ch: Character) => `no${String(ch.no).padStart(2, '0')}-${ch.id}-${ch.name.en.toLowerCase()}`

interface Box { x0: number; y0: number; x1: number; y1: number }
type Vb = { x: number; y: number; w: number }
interface Tile { ch: Character; illus?: Buffer; illusBox?: Box; vec: Buffer; before?: Buffer; subject: Box; srcBox?: Box; srcSize?: number }

function vectorSvg(ch: Character, vb: Vb, px: number, shadow: boolean) {
  const svg = renderSvg({ character: ch.id, emotion: 'calm', status: 'idle', size: 900, shadow, framing: 'full', xmlDeclaration: false, decorative: true })
  return svg
    .replace(/viewBox="[^"]+"/, `viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.w}"`)
    .replace(/ width="900" height="900"/, ` width="${px}" height="${px}"`)
}

function raster(svg: string, px: number, background?: string) {
  const img = new Resvg(svg, { fitTo: { mode: 'width', value: px }, background, font: { loadSystemFonts: false } }).render()
  return { w: img.width, h: img.height, data: img.pixels, png: () => img.asPng() }
}

/**
 * Sub-pixel bounding box of an alpha mask: an edge column/row that is only
 * partly covered counts for its coverage, so the box is accurate to ~0.1 px.
 */
function alphaBox(data: Uint8Array | Buffer, w: number, h: number): Box & { rMax: (cx: number, cy: number, min?: number) => number } {
  const colMax = new Float64Array(w), rowMax = new Float64Array(h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3]
      if (a > colMax[x]) colMax[x] = a
      if (a > rowMax[y]) rowMax[y] = a
    }
  const first = (m: Float64Array) => m.findIndex((v) => v > 0)
  const last = (m: Float64Array) => m.length - 1 - [...m].reverse().findIndex((v) => v > 0)
  const cx0 = first(colMax), cx1 = last(colMax), ry0 = first(rowMax), ry1 = last(rowMax)
  return {
    x0: cx0 + 1 - colMax[cx0] / 255,
    x1: cx1 + colMax[cx1] / 255,
    y0: ry0 + 1 - rowMax[ry0] / 255,
    y1: ry1 + rowMax[ry1] / 255,
    /** farthest at-least-half-covered pixel corner from (cx, cy) */
    rMax(cx, cy, min = 128) {
      let r = 0
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] < min) continue
          const dx = Math.max(Math.abs(x - cx), Math.abs(x + 1 - cx)), dy = Math.max(Math.abs(y - cy), Math.abs(y + 1 - cy))
          r = Math.max(r, Math.hypot(dx, dy))
        }
      return r
    },
  }
}

const centre = (b: Box) => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 })

/**
 * Subject pixels of an RGB illustration by the repo's identity rule
 * (scripts/ref/identity.tsx): a pixel belongs to the character when its
 * nearest colour is one of the source's flat palette colours rather than the
 * paper or the drop shadow (warm ink at ~10 % over the paper). No saturation
 * threshold, so pale shells and cream plates count like any other colour.
 */
/**
 * Palette colours that can't be confused with paper or drop shadow. A cream
 * plate (e.g. Filo's #f6e9d4) is ~20 levels from the shadow tint, so it is left
 * out of the registration rather than risk counting shadow as character.
 */
export function distinct(pal: number[][], bg: number[]) {
  const shadow = bg.map((v, i) => v * 0.9 + [0x5e, 0x48, 0x28][i] * 0.1)
  const far = (q: number[], r: number[]) => Math.hypot(q[0] - r[0], q[1] - r[1], q[2] - r[2]) > 45
  return pal.filter((q) => far(q, bg) && far(q, shadow))
}

function paletteMask(data: Uint8Array | Buffer, n: number, pal: number[][], bg: number[], stride = 3) {
  const shadow = bg.map((v, i) => v * 0.9 + [0x5e, 0x48, 0x28][i] * 0.1)
  const d2 = (i: number, q: number[]) => (data[i * stride] - q[0]) ** 2 + (data[i * stride + 1] - q[1]) ** 2 + (data[i * stride + 2] - q[2]) ** 2
  // palette clusters that are really paper or shadow are not subject colours
  const own = distinct(pal, bg)
  const m = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const bd = Math.min(40 ** 2, d2(i, bg), d2(i, shadow))
    for (const q of own) if (d2(i, q) < bd) { m[i] = 1; break }
  }
  return m
}

/**
 * Where the character really is in the illustration, relative to the vector
 * master drawn with the same transform: the whole-pixel shift (±8) of the
 * illustration's subject mask that best overlaps the vector's (IoU).
 */
function registration(img: Uint8Array, vec: Uint8Array, w: number, R = 8) {
  let nA = 0, nB = 0
  for (let i = 0; i < img.length; i++) { nA += img[i]; nB += vec[i] }
  const iouAt = (dx: number, dy: number) => {
    let inter = 0
    for (let y = R; y < w - R; y++)
      for (let x = R; x < w - R; x++) if (vec[y * w + x] && img[(y + dy) * w + x + dx]) inter++
    return inter / (nA + nB - inter)
  }
  let best = { dx: 0, dy: 0, iou: -1 }
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const iou = iouAt(dx, dy)
    if (iou > best.iou) best = { dx, dy, iou }
  }
  return { dx: best.dx, dy: best.dy, iou: r2(best.iou * 1000) / 1000, iouAtZero: r2(iouAt(0, 0) * 1000) / 1000 }
}

async function main() {
  rmSync(OUT, { recursive: true, force: true })
  for (const d of ['illustration-jpg', 'vector-jpg', 'vector-png', 'sheets']) mkdirSync(join(OUT, d), { recursive: true })
  const rows: Record<string, unknown>[] = []
  const tiles: Tile[] = []

  for (const ch of CHARACTER_LIST) {
    const design = designRevision(ch)
    // --- 1. subject in the shared canvas (units), measured at 2 px / unit ------
    const full = VIEWBOX.full
    const hi = raster(vectorSvg(ch, full, 1800, false), 1800)
    const hb = alphaBox(hi.data, hi.w, hi.h)
    const u = 900 / 1800
    const subject = { x0: full.x + hb.x0 * u, y0: full.y + hb.y0 * u, x1: full.x + hb.x1 * u, y1: full.y + hb.y1 * u }
    const sc = centre(subject)
    const rUnits = hb.rMax((hb.x0 + hb.x1) / 2, (hb.y0 + hb.y1) / 2) * u
    const geo = subjectGeometry(ch)
    const analyticDelta = Math.max(...(['x0', 'y0', 'x1', 'y1'] as const).map((k) => Math.abs(geo.box[k] - subject[k])))

    // --- 2. how far off-centre it is today --------------------------------------
    const off = (vb: { x: number; y: number; w: number; h: number }) => {
      const dx = sc.x - (vb.x + vb.w / 2), dy = sc.y - (vb.y + vb.h / 2)
      const k = SIZE / vb.w
      return { dxPx1024: r2(dx * k), dyPx1024: r2(dy * k), distPx1024: r2(Math.hypot(dx, dy) * k), off: Math.hypot(dx, dy) * k > TOLERANCE_PX }
    }
    const s = ch.fit.s
    const srcSize = ch.source.size
    const srcSubject = { x0: (subject.x0 - ch.fit.tx) / s, y0: (subject.y0 - ch.fit.ty) / s, x1: (subject.x1 - ch.fit.tx) / s, y1: (subject.y1 - ch.fit.ty) / s }
    const srcC = centre(srcSubject)
    const srcOff = design.fromSource
      ? (() => {
          const dx = srcC.x - srcSize / 2, dy = srcC.y - srcSize / 2, k = SIZE / srcSize
          return { dxPx1024: r2(dx * k), dyPx1024: r2(dy * k), distPx1024: r2(Math.hypot(dx, dy) * k), off: Math.hypot(dx, dy) * k > TOLERANCE_PX }
        })()
      : null

    // --- 3. vector standard (all 26) --------------------------------------------
    const k = SAFE_R / rUnits
    const vb: Vb = { x: sc.x - C / k, y: sc.y - C / k, w: SIZE / k }
    const vShadow = raster(vectorSvg(ch, vb, SIZE, true), SIZE)
    const vBare = raster(vectorSvg(ch, vb, SIZE, false), SIZE)
    const ob = alphaBox(vBare.data, SIZE, SIZE)
    const oc = centre(ob)
    const shadowR = alphaBox(vShadow.data, SIZE, SIZE).rMax(C, C, 8)
    const subjectR = ob.rMax(C, C)
    const pngBuf = await sharp(vShadow.png()).png({ compressionLevel: 9 }).toBuffer()
    const vJpg = await sharp(vShadow.png()).flatten({ background: PAPER }).removeAlpha().toColourspace('srgb')
      .jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true }).toBuffer()
    const vPath = { jpg: `vector-jpg/${tag(ch)}.jpg`, png: `vector-png/${tag(ch)}.png` }
    writeFileSync(join(OUT, vPath.jpg), vJpg)
    writeFileSync(join(OUT, vPath.png), pngBuf)

    // --- 4. illustration standard (source art whose design is still current) ---
    let illus: Record<string, unknown> | null = null
    let illusBuf: Buffer | undefined, beforeBuf: Buffer | undefined, illusBox: Box | undefined
    const srcBuf = readFileSync(ch.source.file)
    if (design.fromSource) {
      const meta = await sharp(srcBuf).metadata()
      if (meta.width !== srcSize || meta.height !== srcSize) throw new Error(`${ch.id}: source is ${meta.width}×${meta.height}, spec says ${srcSize}`)
      // paper colour: median of the outermost 4 px ring
      const { data: sd, info } = await sharp(srcBuf).removeAlpha().raw().toBuffer({ resolveWithObject: true })
      const ring: number[][] = [[], [], []]
      for (let y = 0; y < info.height; y++)
        for (let x = 0; x < info.width; x++) {
          if (x > 3 && y > 3 && x < info.width - 4 && y < info.height - 4) continue
          for (let c = 0; c < 3; c++) ring[c].push(sd[(y * info.width + x) * 3 + c])
        }
      const med = ring.map((v) => v.sort((a, b) => a - b)[v.length >> 1])
      const paper = `#${med.map((v) => v.toString(16).padStart(2, '0')).join('')}`
      // the canvas may reach past the source's edges: extend them by repeating
      // the outermost paper pixels, so there is no seam
      const M = srcSize
      const ext = await sharp(srcBuf).removeAlpha().extend({ top: M, bottom: M, left: M, right: M, extendWith: 'copy' }).png().toBuffer()
      const rSrc = rUnits / s
      const ks = SAFE_R / rSrc
      const m = await measure(ch.source.file)
      const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
      const pal = m.palette.map((q) => rgb(q.color))
      // centre on the vector geometry; then check where the pixels really are and,
      // when the check is trustworthy (IoU ≥ 0.9), centre on the pixels instead
      const bgRgb = rgb(m.bg)
      const usable = distinct(pal, bgRgb)
      let cx = srcC.x, cy = srcC.y
      const renderAt = () => {
        const svb: Vb = { x: cx - C / ks, y: cy - C / ks, w: SIZE / ks }
        const composed = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="${svb.x} ${svb.y} ${svb.w} ${svb.w}">` +
          `<image href="data:image/png;base64,${ext.toString('base64')}" x="${-M}" y="${-M}" width="${srcSize + 2 * M}" height="${srcSize + 2 * M}" preserveAspectRatio="none"/></svg>`
        const out = raster(composed, SIZE, paper)
        const cvb: Vb = { x: svb.x * s + ch.fit.tx, y: svb.y * s + ch.fit.ty, w: svb.w * s }
        const mask = raster(vectorSvg(ch, cvb, SIZE, false), SIZE)
        const vecPaper = raster(vectorSvg(ch, cvb, SIZE, true), SIZE, m.bg)
        const reg = registration(paletteMask(out.data, SIZE * SIZE, usable, bgRgb, 4), paletteMask(vecPaper.data, SIZE * SIZE, usable, bgRgb, 4), SIZE)
        return { out, mask, reg }
      }
      let r = renderAt()
      const first = r.reg
      const trusted = first.iou >= 0.9
      if (trusted && (first.dx || first.dy)) {
        cx += first.dx / ks
        cy += first.dy / ks
        r = renderAt()
      }
      const { out, mask, reg } = r
      illusBuf = await sharp(out.png()).removeAlpha().toColourspace('srgb').jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true }).toBuffer()
      const p = `illustration-jpg/${tag(ch)}.jpg`
      writeFileSync(join(OUT, p), illusBuf)
      const mb = alphaBox(mask.data, SIZE, SIZE)
      const mc = centre(mb)
      // where the character's pixels are = vector box + measured shift
      const err = Math.hypot(mc.x + reg.dx - C, mc.y + reg.dy - C)
      illusBox = { x0: mb.x0 + reg.dx, y0: mb.y0 + reg.dy, x1: mb.x1 + reg.dx, y1: mb.y1 + reg.dy }
      illus = {
        file: p,
        sha256: sha(illusBuf),
        paper,
        scaleFromSource: r2(ks),
        centring: trusted
          ? 'vector geometry mapped into the source, then shifted so the illustration pixels themselves are centred (palette-mask registration, IoU ≥ 0.9)'
          : 'vector geometry only — palette-mask registration was not trustworthy (IoU < 0.9); manual visual review required',
        registrationColours: usable.map((q) => `#${q.map((v) => v.toString(16).padStart(2, '0')).join('')}`),
        geometryVsPixelsShiftPx: [first.dx, first.dy],
        registrationIou: first.iou,
        finalRegistration: { shiftPx: [reg.dx, reg.dy], iou: reg.iou },
        subjectBoxPx: [r2(illusBox.x0), r2(illusBox.y0), r2(illusBox.x1), r2(illusBox.y1)],
        centreErrPx: r2(err),
        subjectMaxRPx: r2(mb.rMax(C - reg.dx, C - reg.dy)),
        pass: trusted && err <= TOLERANCE_PX,
        note: ks > 1.05 ? `upscaled ×${r2(ks)} from the ${srcSize} px source: softer than the vector set` : undefined,
      }
      beforeBuf = await sharp(srcBuf).removeAlpha().resize(256, 256).png().toBuffer()
    }

    tiles.push({ ch, illus: illusBuf, illusBox, vec: vJpg, before: beforeBuf ?? (await sharp(srcBuf).removeAlpha().resize(256, 256).png().toBuffer()), subject: ob, srcBox: srcSubject, srcSize })
    const vCentreErr = Math.hypot(oc.x - C, oc.y - C)
    rows.push({
      id: ch.id,
      no: ch.no,
      name: ch.name,
      design: { revision: design.revision, fromSource: design.fromSource, date: design.date ?? null },
      source: { file: ch.source.file, sizePx: srcSize, sha256: sha(srcBuf), specSha256: ch.source.sha256, matchesSpec: sha(srcBuf) === ch.source.sha256 },
      subject: {
        method: 'alpha mask of the calm vector master, shadow off, 2 px/unit; edge coverage counted (sub-pixel)',
        canvasBox: [r2(subject.x0), r2(subject.y0), r2(subject.x1), r2(subject.y1)],
        canvasCentre: [r2(sc.x), r2(sc.y)],
        maxRadiusUnits: r2(rUnits),
        sourceBoxPx: design.fromSource ? [r2(srcSubject.x0), r2(srcSubject.y0), r2(srcSubject.x1), r2(srcSubject.y1)] : null,
        analyticBoxDeltaUnits: r2(analyticDelta),
      },
      before: {
        libraryFullFraming: off(VIEWBOX.full),
        libraryTightFraming: off(VIEWBOX.tight),
        sourceImage: srcOff ?? 'n/a — source art is the retired design revision 1',
      },
      after: {
        rule: `subject box centre → (${C}, ${C}); farthest subject pixel ${SAFE_R} px from centre`,
        illustration: illus ?? 'not produced — the source art is the retired design revision 1; use the vector file',
        vector: {
          jpg: { file: vPath.jpg, sha256: sha(vJpg) },
          png: { file: vPath.png, sha256: sha(pngBuf), transparent: true },
          scaleUnitsToPx: r2(k),
          subjectBoxPx: [r2(ob.x0), r2(ob.y0), r2(ob.x1), r2(ob.y1)],
          centreErrPx: r2(vCentreErr),
          subjectMaxRPx: r2(subjectR),
          shadowMaxRPx: r2(shadowR),
          shadowInsideCircle: shadowR <= C,
          pass: vCentreErr <= TOLERANCE_PX && subjectR <= C,
        },
      },
    })
    console.log(`${ch.id.padEnd(5)} full ${JSON.stringify(off(VIEWBOX.full))} src ${srcOff ? srcOff.distPx1024 : 'r1'} → vec err ${r2(vCentreErr)} r ${r2(subjectR)} shadowR ${r2(shadowR)}${illus ? ` illus err ${illus.centreErrPx} geo→px ${JSON.stringify(illus.geometryVsPixelsShiftPx)} iou ${illus.registrationIou} final ${JSON.stringify(illus.finalRegistration)} pass ${illus.pass} ×${illus.scaleFromSource}` : ''} Δanalytic ${r2(analyticDelta)}`)
  }

  await sheets(tiles)
  const manifest = {
    title: 'Jojo & Friends — standard static avatars and centring audit',
    generated: new Date().toISOString(),
    private: 'Personal archive for Joye. Not published on the site, not in any public bucket, never copied into dist/.',
    spec: {
      canvas: `${SIZE}×${SIZE}, square`,
      formats: ['JPG: baseline RGB (sRGB), quality 92, 4:4:4, no alpha — for QQ / Telegram', 'PNG: RGBA with transparent background (vector set only)'],
      subject: 'shell ∪ face plate ∪ signal dot of the calm, idle pose; the drop shadow and the paper are never part of it',
      centre: `subject bounding-box centre on (${C}, ${C}), tolerance ≤ ${TOLERANCE_PX} px`,
      size: `farthest subject pixel ${SAFE_R} px from the centre (circle crop radius ${C}: ${C - SAFE_R} px safety margin), same for every character`,
      untouched: 'no rotation, stretching, mirroring, feature moves or redrawing; asymmetric designs stay asymmetric',
      sets: {
        illustration: 'the approved source illustrations (hero-h.png for Jojo, h-family / options-20 for companions), resampled once; not produced for Pocket, Mino and Dotty, whose source art is their retired first design',
        vector: 'rendered from the current vector masters (same shapes the site shows, including the design-revision-2 characters); crisp at any size; slightly flatter than the illustrations (no painterly anti-aliasing)',
      },
      tolerancePx: TOLERANCE_PX,
      safeRadiusPx: SAFE_R,
    },
    characters: rows,
  }
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
  console.log(`\n${rows.length} characters → ${OUT}`)
}

/** Contact sheets: clean ones, and review ones with centre axes, subject box and circles (internal only). */
async function sheets(tiles: Tile[]) {
  const T = 256, cols = 6, rowsN = Math.ceil(tiles.length / cols), gap = 12, label = 30
  const W = cols * T + (cols + 1) * gap, H = rowsN * (T + label) + (rowsN + 1) * gap
  const f = T / SIZE
  const overlay = (b: Box | null, safe: boolean, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}">
    <line x1="${T / 2}" y1="0" x2="${T / 2}" y2="${T}" stroke="#fe3a1a" stroke-width="1"/>
    <line x1="0" y1="${T / 2}" x2="${T}" y2="${T / 2}" stroke="#fe3a1a" stroke-width="1"/>
    <circle cx="${T / 2}" cy="${T / 2}" r="${T / 2 - 0.5}" fill="none" stroke="#2d3272" stroke-opacity=".45" stroke-width="1"/>
    ${safe ? `<circle cx="${T / 2}" cy="${T / 2}" r="${SAFE_R * f}" fill="none" stroke="#2d3272" stroke-opacity=".35" stroke-dasharray="3 3"/>` : ''}
    ${b ? `<rect x="${b.x0 * f}" y="${b.y0 * f}" width="${(b.x1 - b.x0) * f}" height="${(b.y1 - b.y0) * f}" fill="none" stroke="#0a8f6a" stroke-width="1"/>
    <circle cx="${((b.x0 + b.x1) / 2) * f}" cy="${((b.y0 + b.y1) / 2) * f}" r="3" fill="#0a8f6a"/>` : ''}${extra}</svg>`
  const make = async (name: string, pick: (t: (typeof tiles)[number]) => Buffer | undefined, review: 'after' | 'after-illus' | 'before' | false) => {
    const comps: Parameters<ReturnType<typeof sharp>['composite']>[0] = []
    for (const [i, t] of tiles.entries()) {
      const x = gap + (i % cols) * (T + gap), y = gap + Math.floor(i / cols) * (T + label + gap)
      const img = pick(t)
      const text = `No.${String(t.ch.no).padStart(2, '0')} ${t.ch.name.en} ${t.ch.name.zh}${img ? '' : ' — (r1 art retired)'}`
      comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${label}"><text x="2" y="20" font-family="PingFang SC, Helvetica" font-size="15" fill="#2d3272">${text}</text></svg>`), left: x, top: y + T })
      if (!img) continue
      comps.push({ input: await sharp(img).resize(T, T).png().toBuffer(), left: x, top: y })
      if (review === 'after') comps.push({ input: Buffer.from(overlay(t.subject, true)), left: x, top: y })
      if (review === 'after-illus' && t.illusBox) comps.push({ input: Buffer.from(overlay(t.illusBox, true)), left: x, top: y })
      if (review === 'before' && t.srcBox && t.srcSize) {
        const k = SIZE / t.srcSize
        const b = { x0: t.srcBox.x0 * k, y0: t.srcBox.y0 * k, x1: t.srcBox.x1 * k, y1: t.srcBox.y1 * k }
        comps.push({ input: Buffer.from(overlay(b, false)), left: x, top: y })
      }
    }
    await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } }).composite(comps).jpeg({ quality: 88 }).toFile(join(OUT, 'sheets', name))
  }
  await make('illustration.jpg', (t) => t.illus, false)
  await make('vector.jpg', (t) => t.vec, false)
  await make('review-illustration-axes.jpg', (t) => t.illus, 'after-illus')
  await make('review-vector-axes.jpg', (t) => t.vec, 'after')
  await make('review-before-source-axes.jpg', (t) => (designRevision(t.ch).fromSource ? t.before : undefined), 'before')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
