import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { initAntiDebug } from './anti-debug'

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
