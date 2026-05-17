import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import JavaScriptObfuscator from 'javascript-obfuscator'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { webcrypto } from 'node:crypto'
import { KEY_B64 } from './crypto-key.js'

const { subtle } = webcrypto

const VIRTUAL_MODULE_ID = 'virtual:wasm-inline'
const RESOLVED_ID = '\0' + VIRTUAL_MODULE_ID

function wasmInlinePlugin(): Plugin {
  return {
    name: 'wasm-inline',
    resolveId(id) {
      if (id === VIRTUAL_MODULE_ID) return RESOLVED_ID
    },
    load(id) {
      if (id !== RESOLVED_ID) return null
      const wasmPath = resolve(process.cwd(), 'wasm/decrypt.wasm')
      if (!existsSync(wasmPath)) {
        throw new Error('decrypt.wasm not found. Run "npm run build:wasm" first.')
      }
      const buf = readFileSync(wasmPath)
      const b64 = buf.toString('base64')
      return `export default "${b64}"`
    },
  }
}

const _K = new TextEncoder().encode(atob(KEY_B64))

const aesKeyPromise = (async () => {
  const hash = await subtle.digest('SHA-256', _K)
  return subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt'])
})()

async function _e(text: string) {
  const aesKey = await aesKeyPromise
  const iv = webcrypto.getRandomValues(new Uint8Array(12))
  const encrypted = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new TextEncoder().encode(text),
  )
  const result = new Uint8Array(12 + encrypted.byteLength)
  result.set(iv, 0)
  result.set(new Uint8Array(encrypted), 12)
  let s = ''
  for (let i = 0; i < result.length; i++) s += String.fromCharCode(result[i])
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
    plugins: [vue(), wasmInlinePlugin(), encryptApiPlugin(upstreamOrigin, PATH_MAP), obfuscatorPlugin()],
  }
})
