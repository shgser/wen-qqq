const API_PREFIX = '/api/'

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

async function handleRequest(request, env) {
  const url = new URL(request.url)
  
  console.log('Request received:', {
    url: request.url,
    pathname: url.pathname,
  })

  if (url.pathname === '/_test') {
    return jsonResponse({
      message: 'esa.js is working!',
      test: true,
      envKeys: env ? Object.keys(env) : [],
      processEnvKeys: Object.keys(typeof process !== 'undefined' ? process.env || {} : {}),
      hasEnv: !!env,
      hasProcessEnv: typeof process !== 'undefined' && !!process.env,
    })
  }

  if (url.pathname.startsWith(API_PREFIX)) {
    return jsonResponse({
      message: 'API endpoint hit!',
      path: url.pathname,
    })
  }

  return fetch(request)
}

export default {
  fetch(request, env) {
    return handleRequest(request, env)
  },
}
