const API_PREFIX = '/api/'

const CONFIG = {
  UPSTREAM_ORIGIN: 'https://js.345569.xyz',
  UPSTREAM_PATH: '/5gsilmu61dc8eae3',
}

const PATH_MAP = new Map([
  ['/api/web', CONFIG.UPSTREAM_PATH],
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
    return new Response(payload, {
      status: upstreamResponse.status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': upstreamResponse.headers.get('cache-control') || 'max-age=10',
      },
    })
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
