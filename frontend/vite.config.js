import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/app/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/proxy_api': {
        target: 'https://ap-northeast-1.clawcloudrun.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy_api/, ''),
        secure: false,
      },
      '/api': {
        target: 'http://127.0.0.1:5201',
        changeOrigin: true,
      },
      '/v1': {
        target: 'http://127.0.0.1:5201',
        changeOrigin: true,
      },
    }
  }
})