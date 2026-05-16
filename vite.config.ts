import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import JavaScriptObfuscator from 'javascript-obfuscator'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const _K = new TextEncoder().encode(atob('ZXNhLXhvci1jaXBoZXItMjAyNA=='))

function _e(text: string) {
  const tb = new TextEncoder().encode(text)
  const iv = new Uint8Array(8)
  for (let i = 0; i < 8; i++) iv[i] = (Math.random() * 256) | 0
  const out = new Uint8Array(8 + tb.length)
  out.set(iv)
  for (let i = 0; i < tb.length; i++) {
    out[8 + i] = tb[i] ^ _K[(i + iv[i % 8]) % _K.length]
  }
  let s = ''
  for (let i = 0; i < out.length; i++) s += String.fromCharCode(out[i])
  return btoa(s)
}

function obfuscatorPlugin(): Plugin {
  return {
    name: 'obfuscator',
    enforce: 'post',
    async writeBundle(options, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && fileName.endsWith('.js')) {
          const filePath = resolve(options.dir!, fileName)
          const code = readFileSync(filePath, 'utf-8')
          const result = JavaScriptObfuscator.obfuscate(code, {
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 0.75,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.4,
            stringArray: true,
            stringArrayRotate: true,
            stringArrayShuffle: true,
            stringArrayThreshold: 0.75,
            stringArrayEncoding: ['base64'],
            splitStrings: true,
            splitStringsChunkLength: 10,
            unicodeEscapeSequence: true,
            identifierNamesGenerator: 'hexadecimal',
          })
          writeFileSync(filePath, result.getObfuscatedCode())
        }
      }
    },
  }
}

function encryptApiPlugin(upstreamOrigin: string, pathMap: Record<string, string>): Plugin {
  return {
    name: 'encrypt-api-response',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next()
        }

        const upstreamPath = pathMap[req.url]
        if (!upstreamPath) {
          res.statusCode = 404
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.setHeader('cache-control', 'no-store')
          res.end(JSON.stringify({ message: 'API route not found', path: req.url }))
          return
        }

        const upstreamUrl = `${upstreamOrigin}${upstreamPath}`
        try {
          const upstreamResponse = await fetch(upstreamUrl, {
            headers: { Accept: 'application/json' },
          })
          const payload = await upstreamResponse.text()
          const encrypted = _e(payload)
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.setHeader('cache-control', 'no-store')
          res.end(JSON.stringify({ encrypted: true, data: encrypted }))
        } catch (error: any) {
          res.statusCode = 502
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.setHeader('cache-control', 'no-store')
          res.end(JSON.stringify({ message: 'Upstream request failed', error: error?.message }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const upstreamOrigin = env.VITE_UPSTREAM_ORIGIN
  const upstreamPath = env.VITE_UPSTREAM_PATH

  const PATH_MAP: Record<string, string> = {
    [atob('L2FwaS9sa2poZ2Zkc2E=')]: upstreamPath,
  }

  return {
    plugins: [vue(), encryptApiPlugin(upstreamOrigin, PATH_MAP), obfuscatorPlugin()],
  }
})
