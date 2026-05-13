import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const PATH_MAP: Record<string, string> = {
  '/api/web': '/5gsilmu61dc8eae3',
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'https://js.345569.xyz',
        changeOrigin: true,
        rewrite: (path) => PATH_MAP[path] || path.replace(/^\/api/, ''),
      },
    },
  },
})
