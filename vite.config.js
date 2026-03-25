import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ai': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/workout': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/diet': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/fitness': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
