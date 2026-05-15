let criticalData: any = null
let criticalFunctions: Map<string, Function> = new Map()

export function protectCriticalData(data: any) {
  criticalData = data
}

export function registerCriticalFunction(name: string, fn: Function) {
  criticalFunctions.set(name, fn)
}

function destroyCriticalData() {
  criticalData = null
  criticalFunctions.clear()
}

function blockLogic() {
  while (true) {
    try {
      (function(){}).constructor('debugger')()
    } catch (e) {}
  }
}

function detectDevToolsByTime() {
  const start = performance.now()
  debugger
  const end = performance.now()
  return end - start > 100
}

function detectDevToolsByConsole() {
  let detected = false
  const div = document.createElement('div')
  Object.defineProperty(div, 'id', {
    get: function() {
      detected = true
      return 'devtools-detected'
    }
  })
  console.log(div)
  console.clear()
  return detected
}

function detectDevToolsByToString() {
  let detected = false
  const originalToString = Function.prototype.toString
  Function.prototype.toString = function() {
    if (this === console.log) {
      detected = true
    }
    return originalToString.apply(this, arguments as any)
  }
  console.log('')
  Function.prototype.toString = originalToString
  return detected
}

function isDevToolsOpen() {
  return detectDevToolsByTime() || detectDevToolsByConsole() || detectDevToolsByToString()
}

function infiniteDebugger() {
  setInterval(function() {
    (function(){}).constructor('debugger')()
  }, 100)
}

function randomDebugger() {
  setInterval(function() {
    if (Math.random() > 0.5) {
      (function(){}).constructor('debugger')()
    }
  }, Math.random() * 1000 + 500)
}

function hookConsole() {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
    table: console.table,
    dir: console.dir
  }

  const blockedKeywords = ['api', 'data', 'token', 'password', 'secret', 'key', 'config', 'critical']

  console.log = function(...args) {
    const str = JSON.stringify(args)
    for (const keyword of blockedKeywords) {
      if (str.toLowerCase().includes(keyword.toLowerCase())) {
        return
      }
    }
    originalConsole.log.apply(console, args)
  }

  console.warn = function(...args) {
    const str = JSON.stringify(args)
    for (const keyword of blockedKeywords) {
      if (str.toLowerCase().includes(keyword.toLowerCase())) {
        return
      }
    }
    originalConsole.warn.apply(console, args)
  }

  console.error = function(...args) {
    const str = JSON.stringify(args)
    for (const keyword of blockedKeywords) {
      if (str.toLowerCase().includes(keyword.toLowerCase())) {
        return
      }
    }
    originalConsole.error.apply(console, args)
  }

  console.info = function(...args) {
    const str = JSON.stringify(args)
    for (const keyword of blockedKeywords) {
      if (str.toLowerCase().includes(keyword.toLowerCase())) {
        return
      }
    }
    originalConsole.info.apply(console, args)
  }

  console.table = function(...args) {
    return
  }

  console.dir = function(...args) {
    return
  }
}

function hideCallStack() {
  const originalError = Error
  window.Error = function(...args) {
    const err = new originalError(...args)
    Object.defineProperty(err, 'stack', {
      get: function() {
        return 'Stack trace hidden for security reasons'
      }
    })
    return err
  } as any
  window.Error.prototype = originalError.prototype
}

function disableF12() {
  document.addEventListener('keydown', function(e) {
    if (e.key === 'F12') {
      e.preventDefault()
      e.stopPropagation()
      destroyCriticalData()
      blockLogic()
      return false
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault()
      e.stopPropagation()
      destroyCriticalData()
      blockLogic()
      return false
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault()
      e.stopPropagation()
      destroyCriticalData()
      blockLogic()
      return false
    }
    if (e.ctrlKey && e.key === 'U') {
      e.preventDefault()
      e.stopPropagation()
      return false
    }
    if (e.ctrlKey && e.key === 'S') {
      e.preventDefault()
      e.stopPropagation()
      return false
    }
  })
}

function disableRightClick() {
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault()
    e.stopPropagation()
    return false
  })
}

function startMonitoring() {
  setInterval(function() {
    if (isDevToolsOpen()) {
      destroyCriticalData()
      blockLogic()
    }
  }, 1000)
}

export function initAntiDebug() {
  hookConsole()
  hideCallStack()
  disableF12()
  disableRightClick()
  infiniteDebugger()
  randomDebugger()
  startMonitoring()
}
