import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Library build of the component only (no demo), React left external.
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: 'dist-lib',
    emptyOutDir: true,
    lib: { entry: 'src/library/index.ts', formats: ['es'], fileName: () => 'jojo-friends.js' },
    rollupOptions: { external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime'] },
  },
})
