import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { initAntiDebug } from './anti-debug'

function checkFramed() {
  try {
    if (window.self !== window.top) {
      return true
    }
    if (window.parent && window.parent !== window.self) {
      return true
    }
    if (window.frameElement !== null) {
      return true
    }
  } catch (e) {
    // 跨域访问 frameElement 时会抛错，也说明处于嵌入状态
    return true
  }
  return false
}

function handleFramed() {
  if (document.documentElement) {
    document.documentElement.classList.add('is-framed')
  }
  if (document.body) {
    document.body.innerHTML = ''
  }
  try {
    if (window.top && window.top.location && window.top.location.replace) {
      // 尝试将顶层页面跳转到当前URL，打破嵌入
      window.top.location.replace('https://cznull.github.io/vsbm')
    }
  } catch (e) {
    // 跨域时无法操作 top.location，只能做前端隐藏
  }
  throw new Error('Framed access blocked')
}

if (checkFramed()) {
  // 立即处理
  document.documentElement.classList.add('is-framed')
  setTimeout(handleFramed, 0)
} else {
  // 持续监控（防止运行时被动态嵌入）
  setInterval(() => {
    if (checkFramed()) {
      handleFramed()
    }
  }, 500)
}

// 禁止跳转来源域名黑名单（从以下域名跳转过来的用户会被重定向）
const BLOCKED_REFERER_DOMAINS = [
  "16j.cn",
  // 添加你想拦截的域名，例如：
  // 'unwanted-domain.com',
  // 'spam-site.com',
  // 'www.bad-domain.com',
]

const REDIRECT_URL = 'http://localhost/' // 修改为重定向的目标地址

function checkReferer() {
  const referer = document.referrer
  if (!referer) return true // 没有referer（直接访问）允许通过

  try {
    const refererUrl = new URL(referer)
    const refererHost = refererUrl.hostname

    const isBlocked = BLOCKED_REFERER_DOMAINS.some(domain =>
      refererHost === domain || refererHost.endsWith(`.${domain}`)
    )

    if (isBlocked) {
      window.location.href = REDIRECT_URL
      return false
    }
  } catch {
    // URL解析失败，允许通过
  }

  return true
}

// 如果来源域名在黑名单中，阻止应用加载
if (!checkReferer()) {
  throw new Error('Referer domain blocked')
}

initAntiDebug()

createApp(App).mount('#app')
