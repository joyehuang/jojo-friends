import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Absolute base: character pages live at real paths (/c/<id>), so assets must
// resolve from the site root on refresh.
export default defineConfig({
  base: '/',
  plugins: [react()],
  cacheDir: 'node_modules/.vite',
  build: { outDir: 'dist', assetsDir: 'assets', sourcemap: false, reportCompressedSize: true, manifest: true },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
})
