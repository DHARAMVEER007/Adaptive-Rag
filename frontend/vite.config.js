import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Dev-only proxy mirroring the production nginx rules so the relative
    // /api and /auth paths in the frontend work without nginx:
    //   nginx: /api/  -> backend:8000/      (strips /api)
    //   nginx: /auth/ -> mock-auth:8080/api/ (rewrites /auth -> /api)
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth/, '/api'),
      },
    },
  },
})
