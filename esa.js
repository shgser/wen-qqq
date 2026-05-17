import { KEY_B64 } from './crypto-key.js'

const API_PREFIX = '/api/'

const CONFIG = {
  UPSTREAM_ORIGIN: 'https://js.345569.xyz',
  UPSTREAM_PATH: '/5gsilmu61dc8eae3',
}

let _aesKey = null

async function getAesKey() {
  if (_aesKey) return _aesKey
  const rawKey = new TextEncoder().encode(atob(KEY_B64))
  const hash = await crypto.subtle.digest('SHA-256', rawKey)
  _aesKey = await crypto.subtle.importKey(
    'raw', hash, { name: 'AES-GCM' }, false, ['encrypt']
  )
  return _aesKey
}

async function _e(text) {
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
    const encrypted = await _e(payload)
    return jsonResponse(
      { encrypted: true, data: encrypted },
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
