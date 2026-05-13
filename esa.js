const API_PREFIX = '/api/'
const TEST_PATH = '/_test'

function getPathMap(env) {
  const upstreamPath = getUpstreamPath(env)
  return new Map([
    ['/api/web', upstreamPath],
  ])
}

function getAllowedPaths(env) {
  const pathMap = getPathMap(env)
  return new Set(pathMap.keys())
}

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
  // 尝试从 env 或 process.env 获取
  return env?.UPSTREAM_ORIGIN || process.env?.UPSTREAM_ORIGIN
}

function getUpstreamPath(env) {
  // 尝试从 env 或 process.env 获取
  return env?.UPSTREAM_PATH || process.env?.UPSTREAM_PATH
}

function getPathMap(env) {
  const upstreamPath = getUpstreamPath(env)
  return new Map([
    ['/api/web', upstreamPath],
  ])
}

function getAllowedPaths(env) {
  const pathMap = getPathMap(env)
  return new Set(pathMap.keys())
}

async function handleApiRequest(request, env) {
  const url = new URL(request.url)
  const upstreamOrigin = resolveUpstreamOrigin(env)
  const pathMap = getPathMap(env)
  const allowedPaths = getAllowedPaths(env)

  // 调试信息
  console.log('Environment variables:', {
    fromEnv: {
      UPSTREAM_ORIGIN: env?.UPSTREAM_ORIGIN ? 'set' : 'not set',
      UPSTREAM_PATH: env?.UPSTREAM_PATH ? 'set' : 'not set',
      envKeys: env ? Object.keys(env) : [],
    },
    fromProcessEnv: {
      UPSTREAM_ORIGIN: process.env?.UPSTREAM_ORIGIN ? 'set' : 'not set',
      UPSTREAM_PATH: process.env?.UPSTREAM_PATH ? 'set' : 'not set',
      processEnvKeys: Object.keys(process.env || {}),
    },
  })

  if (!upstreamOrigin) {
    return jsonResponse(
      {
        message: 'UPSTREAM_ORIGIN environment variable not configured',
        availableEnvKeys: env ? Object.keys(env) : [],
        processEnvKeys: Object.keys(process.env || {}),
      },
      { status: 500 },
    )
  }

  if (!allowedPaths.has(url.pathname)) {
    return jsonResponse(
      {
        message: 'API route not found',
        path: url.pathname,
      },
      { status: 404 },
    )
  }

  const upstreamPath = pathMap.get(url.pathname) || url.pathname.replace(/^\/api/, '')
  const upstreamUrl = `${upstreamOrigin}${upstreamPath}${url.search}`
  console.log('Request path:', url.pathname, '→ Upstream URL:', upstreamUrl)
  
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    
    console.log('Request received:', {
      url: request.url,
      pathname: url.pathname,
      startsWithApi: url.pathname.startsWith(API_PREFIX),
      API_PREFIX,
    })

    // 测试路由，确认 esa.js 是否被调用
    if (url.pathname === TEST_PATH) {
      return jsonResponse({
        message: 'esa.js is working!',
        env: {
          UPSTREAM_ORIGIN: env?.UPSTREAM_ORIGIN ? 'set' : 'not set',
          UPSTREAM_PATH: env?.UPSTREAM_PATH ? 'set' : 'not set',
          processEnvKeys: Object.keys(process.env || {}),
        },
      })
    }

    if (url.pathname.startsWith(API_PREFIX)) {
      console.log('Handling API request...')
      return handleApiRequest(request, env)
    }

    console.log('Falling back to static assets...')
    return fetch(request)
  },
}
