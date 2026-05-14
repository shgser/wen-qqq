import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const upstreamOrigin = env.VITE_UPSTREAM_ORIGIN
  const upstreamPath = env.VITE_UPSTREAM_PATH

  const PATH_MAP: Record<string, string> = {
    '/api/web1': upstreamPath,
  }

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
