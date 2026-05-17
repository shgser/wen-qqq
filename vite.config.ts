import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import JavaScriptObfuscator from 'javascript-obfuscator'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { KEY_B64 } from './crypto-key.js'

const KEY_MODULE_ID = 'virtual:aes-key'
const RESOLVED_KEY_ID = '\0' + KEY_MODULE_ID

function keyInlinePlugin(): Plugin {
  return {
    name: 'aes-key-inline',
    resolveId(id) {
      if (id === KEY_MODULE_ID) return RESOLVED_KEY_ID
    },
    load(id) {
      if (id !== RESOLVED_KEY_ID) return null
      return `export const KEY_B64 = "${KEY_B64}"`
    },
  }
}

let _aesKey: CryptoKey | null = null

async function getAesKey(): Promise<CryptoKey> {
  if (_aesKey) return _aesKey
  const rawKey = new TextEncoder().encode(atob(KEY_B64))
  const hash = await crypto.subtle.digest('SHA-256', rawKey)
  _aesKey = await crypto.subtle.importKey(
    'raw', hash, { name: 'AES-GCM' }, false, ['encrypt']
  )
  return _aesKey
}

async function _e(text: string): Promise<string> {
  const key = await getAesKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(text)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)
  let s = ''
  for (let i = 0; i < combined.length; i++) s += String.fromCharCode(combined[i])
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
          const encrypted = await _e(payload)
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
    plugins: [vue(), keyInlinePlugin(), encryptApiPlugin(upstreamOrigin, PATH_MAP), obfuscatorPlugin()],
  }
})
