import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Standalone web build for the React renderer (used by Vercel).
// The Electron desktop app keeps using electron.vite.config.ts.
export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  base: '/H2Ohhh/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src'),
      '@': resolve(__dirname, 'src/renderer/src')
    }
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    target: 'es2020'
  }
})
