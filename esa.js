const API_PREFIX = '/api/'
const PATH_MAP = new Map([
  ['/api/web', '/5gsilmu61dc8eae3'],
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

function resolveUpstreamOrigin(env) {
  return env?.UPSTREAM_ORIGIN
}

async function handleApiRequest(request, env) {
  const url = new URL(request.url)
  const upstreamOrigin = resolveUpstreamOrigin(env)

  if (!ALLOWED_PATHS.has(url.pathname)) {
    return jsonResponse(
      {
        message: 'API route not found',
        path: url.pathname,
      },
      { status: 404 },
    )
  }

  const upstreamPath = PATH_MAP.get(url.pathname) || url.pathname.replace(/^\/api/, '')
  const upstreamUrl = `${upstreamOrigin}${upstreamPath}${url.search}`
  console.log('Request path:', url.pathname, '→ Upstream URL:', upstreamUrl)
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
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname.startsWith(API_PREFIX)) {
      return handleApiRequest(request, env)
    }

    return fetch(request)
  },
}
