import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

const PATH_MAP: Record<string, string> = {
  '/api/web': '/5gsilmu61dc8eae3',
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const upstreamOrigin = env.VITE_UPSTREAM_ORIGIN || 'https://js.345569.xyz'

  return {
    plugins: [vue()],
    server: {
      proxy: {
        '/api': {
          target: upstreamOrigin,
          changeOrigin: true,
          rewrite: (path) => PATH_MAP[path] || path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
