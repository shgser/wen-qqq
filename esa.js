const API_PREFIX = '/api/'
const UPSTREAM_ORIGIN = 'https://js.345569.xyz'
const ALLOWED_PATHS = new Set([
  '/api/5gsilmu61dc8eae3',
])

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

  const upstreamUrl = `${UPSTREAM_ORIGIN}${url.pathname.replace(/^\/api/, '')}${url.search}`
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
  async fetch(request) {
    const url = new URL(request.url)

    if (url.pathname.startsWith(API_PREFIX)) {
      return handleApiRequest(request)
    }

    return fetch(request)
  },
}
