/** Rasterise an SVG string in the browser. Resolves null if the format can't be encoded here. */
export async function rasterise(svg: string, type: 'image/png' | 'image/webp', px = 1024): Promise<Blob | null> {
  const sized = svg.replace(/ width="\d+" height="\d+"/, ` width="${px}" height="${px}"`)
  const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((ok, fail) => {
      img.onload = () => ok()
      img.onerror = () => fail(new Error('svg failed to load'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = px
    canvas.height = px
    canvas.getContext('2d')!.drawImage(img, 0, 0, px, px)
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, type, 0.92))
    return blob && blob.type === type ? blob : null
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function saveBlob(data: Blob | string, filename: string, type = 'image/svg+xml') {
  const blob = typeof data === 'string' ? new Blob([data], { type }) : data
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** Paths of the prebuilt files (scripts/export-site-assets.tsx → public/downloads). */
export const prebuilt = {
  master: (id: string) => `/downloads/${id}/${id}.svg`,
  png: (id: string) => `/downloads/${id}/${id}-512.png`,
  webp: (id: string) => `/downloads/${id}/${id}-512.webp`,
  kit: (id: string) => `/downloads/${id}/${id}-kit.zip`,
  family: '/downloads/jojo-friends-kit.zip',
  sheet: (id: string) => `/downloads/${id}/${id}-emotions.svg`,
}
