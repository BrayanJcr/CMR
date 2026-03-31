import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND = 'http://localhost:5216'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/hub-chat': { target: BACKEND, changeOrigin: true, ws: true },
      '/hub-qr':   { target: BACKEND, changeOrigin: true, ws: true }
    }
  }
})
