import { KEY_B64 } from './crypto-key.js'

const API_PREFIX = '/api/'

const CONFIG = {
  UPSTREAM_ORIGIN: 'https://js.345569.xyz',
  UPSTREAM_PATH: '/5gsilmu61dc8eae3',
}

const _K = new TextEncoder().encode(atob(KEY_B64))

function _e(text) {
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

async function importKey(raw) {
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

async function signToken(headerB64, payloadB64) {
  const key = await importKey(TOKEN_SECRET)
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  const sig = await crypto.subtle.sign('HMAC', key, data)
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function verifyToken(token) {
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

const PATH_MAP = new Map([
  [atob('L2FwaS9sa2poZ2Zkc2E='), CONFIG.UPSTREAM_PATH],
])
const ALLOWED_PATHS = new Set(PATH_MAP.keys())

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
  })
}

async function handleApiRequest(request) {
  const url = new URL(request.url)

  if (!ALLOWED_PATHS.has(url.pathname)) {
    return jsonResponse(
      {
        message: 'API route not found',
        path: url.pathname,
      },
      { status: 404 },
    )
  }

  const authHeader = request.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const isValid = await verifyToken(token)
  if (!isValid) {
    return jsonResponse(
      { message: 'Unauthorized: invalid or expired token' },
      { status: 401 },
    )
  }

  const upstreamPath = PATH_MAP.get(url.pathname)
  const upstreamUrl = `${CONFIG.UPSTREAM_ORIGIN}${upstreamPath}${url.search}`

  console.log('Proxying to:', upstreamUrl)

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        Accept: 'application/json',
      },
    })

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text()
      return new Response(errorText || 'Upstream request failed', {
        status: upstreamResponse.status,
        headers: {
          'content-type': upstreamResponse.headers.get('content-type') || 'text/plain; charset=utf-8',
          'cache-control': 'no-store',
        },
      })
    }

    const payload = await upstreamResponse.text()
    const data = JSON.parse(payload)
    data.success ='1'
    const ndata  = JSON.stringify(data)
    const encrypted = _e(ndata)
    // const encrypted = _e(payload)
    return jsonResponse(
      { encrypted: true, data: encrypted+'a' },
      {
        status: upstreamResponse.status,
        headers: {
          'cache-control': upstreamResponse.headers.get('cache-control') || 'max-age=10',
        },
      },
    )
  } catch (error) {
    console.error('Upstream fetch error:', error)
    return jsonResponse(
      {
        message: 'Upstream request failed',
        error: error.message,
      },
      { status: 502 },
    )
  }
}

async function handleRequest(request) {
  const url = new URL(request.url)
  
  console.log('Request received:', {
    url: request.url,
    pathname: url.pathname,
  })

  if (url.pathname === '/_test') {
    return jsonResponse({
      message: 'esa.js is working!',
      config: {
        hasUpstreamOrigin: !!CONFIG.UPSTREAM_ORIGIN,
        hasUpstreamPath: !!CONFIG.UPSTREAM_PATH,
      },
    })
  }

  if (url.pathname.startsWith(API_PREFIX)) {
    return handleApiRequest(request)
  }

  return fetch(request)
}

export default {
  fetch(request) {
    return handleRequest(request)
  },
}
