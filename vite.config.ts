import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import JavaScriptObfuscator from 'javascript-obfuscator'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { KEY_B64 } from './crypto-key.js'

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

const TOKEN_SECRET = new TextEncoder().encode(atob(KEY_B64).slice(0, 32))
const TOKEN_LEEWAY_SECONDS = 60

async function importKey(raw: Uint8Array) {
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

async function signToken(headerB64: string, payloadB64: string) {
  const key = await importKey(TOKEN_SECRET)
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  const sig = await crypto.subtle.sign('HMAC', key, data)
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function verifyToken(token: string) {
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [headerB64, payloadB64, signatureB64] = parts

  const expectedSig = await signToken(headerB64, payloadB64)
  if (signatureB64 !== expectedSig) return false

  try {
    const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(payloadJson)
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now - TOKEN_LEEWAY_SECONDS) return false
    if (payload.nbf && payload.nbf > now + TOKEN_LEEWAY_SECONDS) return false
    return true
  } catch {
    return false
  }
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

        const authHeader = (req.headers['authorization'] as string) || ''
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
        const isValid = await verifyToken(token)
        if (!isValid) {
          res.statusCode = 401
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.setHeader('cache-control', 'no-store')
          res.end(JSON.stringify({ message: 'Unauthorized: invalid or expired token' }))
          return
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
          const data = JSON.parse(payload)
          data.categoryimpacts = JSON.parse(JSON.stringify(data.categoryImpacts));
          delete data.categoryImpacts;
          const ndata = JSON.stringify([data]);
          const encrypted = _e(ndata)
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.setHeader('cache-control', 'no-store')
          res.end(JSON.stringify({ encrypted: true, data: encrypted,a:data }))
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
