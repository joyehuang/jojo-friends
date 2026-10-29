import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 信号镇 — the work town. A separate app from the public showcase (it is meant
// to show real agents' work, which the showcase promises never to do), built
// into town/dist and deployed as its own site. See docs/TOWN.md.
const repo = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: fileURLToPath(new URL('./town', import.meta.url)),
  base: '/',
  plugins: [react()],
  cacheDir: fileURLToPath(new URL('./node_modules/.vite-town', import.meta.url)),
  server: { fs: { allow: [repo] } },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1600,
    reportCompressedSize: true,
  },
})
