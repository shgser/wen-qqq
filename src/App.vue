<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import qrcodeImage from './assets/qrcode_for_gh_a62d44f1585c_258.jpg'
import { protectCriticalData, registerCriticalFunction } from './anti-debug'
import wasmBase64 from 'virtual:wasm-inline'

const AL = atob('L2FwaS9sa2poZ2Zkc2E=')
const INITIAL_VISIBLE_COUNT = 10

const TOKEN_SECRET = new TextEncoder().encode(atob('TVhLaExYaHZjdDFqelhCcVNYSXRLakF5TkE9PQ==').slice(0, 32))

async function importKey(raw: Uint8Array) {
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
}

async function generateToken(): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = { iat: now, exp: now + 300, nbf: now - 5 }
  const headerB64 = btoa(JSON.stringify(header)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  const key = await importKey(TOKEN_SECRET)
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  const sig = await crypto.subtle.sign('HMAC', key, data)
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${headerB64}.${payloadB64}.${signatureB64}`
}

interface WasmExports {
  init(): void
  decrypt(len: number): number
  getInputPtr(): number
  getOutputPtr(): number
  memory: WebAssembly.Memory
}

let wasmExports: WasmExports | null = null

async function initWasm() {
  const binary = atob(wasmBase64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const { instance } = await WebAssembly.instantiate(bytes.buffer)
  const exports = instance.exports as unknown as WasmExports
  exports.init()
  wasmExports = exports
}

function wasmDecrypt(b64: string): string {
  const raw = atob(b64)
  const inputBytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) inputBytes[i] = raw.charCodeAt(i)

  const exp = wasmExports!
  const memView = new Uint8Array(exp.memory.buffer)
  const inputPtr = exp.getInputPtr()
  const outputPtr = exp.getOutputPtr()

  memView.set(inputBytes, inputPtr)
  const decLen = exp.decrypt(inputBytes.length)
  const decrypted = new TextDecoder().decode(memView.slice(outputPtr, outputPtr + decLen))
  return decrypted
}

interface ApiIndex {
  inxnm: string
  rise_fall_per: string
}

interface ApiCategory {
  id: number
  name: string
  stocks: string[]
  estimatedImpact: number
  time: string
}

interface ApiResponse {
  success: string
  categoryImpacts: ApiCategory[]
  indexs: ApiIndex[]
  timestamp: string
  description: string
  hiddenOvernight: boolean
}

interface StockItem {
  name: string
  weight: number
  change: number
}

const data = ref<ApiResponse | null>(null)
const loading = ref(true)
const error = ref('')
const selectedId = ref<number | null>(null)
const expanded = ref(false)
let timerId: ReturnType<typeof setInterval> | null = null

const indexes = computed(() => data.value?.indexs ?? [])
const categories = computed(() => data.value?.categoryImpacts ?? [])
const hiddenOvernight = computed(() => data.value?.hiddenOvernight ?? false)
const description = computed(() => data.value?.description?.trim() ?? '')
const timestamp = computed(() => data.value?.timestamp?.trim() ?? '')

const sessionLabel = computed(() => {
  const match = timestamp.value.match(/\((.*?)\)/)
  return match?.[1] ?? ''
})

const selectedCategory = computed(() => {
  return categories.value.find((item) => item.id === selectedId.value) ?? null
})

const parsedStocks = computed<StockItem[]>(() => {
  return (selectedCategory.value?.stocks ?? [])
    .map((entry) => {
      const [name = '', weight = '0', change = '0'] = entry.split('@')
      return {
        name: name.trim(),
        weight: toNumber(weight),
        change: toNumber(change),
      }
    })
    .filter((item) => item.name)
})

const visibleStocks = computed(() => {
  return expanded.value
    ? parsedStocks.value
    : parsedStocks.value.slice(0, INITIAL_VISIBLE_COUNT)
})

const detailNote = computed(() => {
  if (!description.value) {
    return `共 ${parsedStocks.value.length} 支`
  }

  return `${description.value}，共 ${parsedStocks.value.length} 支`
})

function toNumber(value: string | number) {
  const numeric = Number(String(value).replace('%', '').trim())
  return Number.isFinite(numeric) ? numeric : 0
}

function toneClass(value: string | number) {
  const numeric = toNumber(value)

  if (numeric > 0) {
    return 'is-up'
  }

  if (numeric < 0) {
    return 'is-down'
  }

  return 'is-flat'
}

function formatPercent(value: string | number, digits = 2) {
  if (typeof value === 'string') {
    return value.includes('%') ? value : `${value}%`
  }

  return `${value.toFixed(digits)}%`
}

function openDetail(categoryId: number) {
  selectedId.value = categoryId
  expanded.value = false
  window.scrollTo({ top: 0, behavior: 'smooth' })
  
  history.pushState({ selectedId: categoryId }, '', `#detail-${categoryId}`)
}

function backToList() {
  selectedId.value = null
  expanded.value = false
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function loadData(showLoading = false) {
  if (showLoading) {
    loading.value = true
  }
  error.value = ''

  try {
    const token = await generateToken()
    const response = await fetch(AL, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`接口请求失败：${response.status}`)
    }

    const contentType = response.headers.get('content-type') ?? ''

    if (!contentType.includes('application/json')) {
      const rawText = await response.text()
      const preview = rawText.trim().slice(0, 60)
      throw new Error(`接口未返回 JSON，当前返回：${preview || '空内容'}`)
    }

    const raw = (await response.json()) as any

    let result: ApiResponse
    if (raw?.encrypted && typeof raw.data === 'string') {
      const decrypted = wasmDecrypt(raw.data.substring(0, raw.data.length - 1))
      result = JSON.parse(decrypted) as ApiResponse
    } else {
      result = raw as ApiResponse
    }

    if (!result?.categoryImpacts?.length) {
      throw new Error('接口返回数据为空')
    }
    data.value = result
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载数据失败'
  } finally {
    if (showLoading) {
      loading.value = false
    }
  }
}

watch(data, (newData) => {
  if (newData) {
    protectCriticalData(newData)
  }
})

onMounted(async () => {
  registerCriticalFunction('loadData', loadData)
  registerCriticalFunction('openDetail', openDetail)
  registerCriticalFunction('backToList', backToList)
  
  await initWasm()
  void loadData(true)
  
  // 监听浏览器后退事件
  window.addEventListener('popstate', (event) => {
    if (event.state && event.state.selectedId) {
      selectedId.value = event.state.selectedId
    } else {
      selectedId.value = null
    }
  })

  // 启动定时刷新：每分钟的第10秒和第20秒刷新数据
  timerId = setInterval(() => {
    const seconds = new Date().getSeconds()
    if (seconds === 10 || seconds === 20) {
      void loadData(false)
    }
  }, 1000)
})

onUnmounted(() => {
  if (timerId !== null) {
    clearInterval(timerId)
    timerId = null
  }
})
</script>

<template>
  <div class="app-shell">
    <main class="phone-page">
      <section v-if="loading" class="state-card">
        <p class="state-title">加载中...</p>
        <p class="state-text">正在拉取基金影响数据</p>
      </section>

      <section v-else-if="error" class="state-card">
        <p class="state-title">数据加载失败</p>
        <p class="state-text">{{ error }}</p>
        <button class="retry-button" type="button" @click="loadData(true)">重新加载</button>
      </section>

      <template v-else-if="data">
        <section v-if="!selectedCategory" class="list-page">
          <header class="summary-panel">
            <div class="summary-grid">
              <article
                v-for="item in indexes"
                :key="item.inxnm"
                class="summary-card"
              >
                <p class="summary-name">{{ item.inxnm }}</p>
                <p class="summary-value" :class="toneClass(item.rise_fall_per)">
                  {{ formatPercent(item.rise_fall_per) }}
                </p>
              </article>
            </div>

            <p class="summary-note">
              <span v-if="description">基于年报、季报持仓计算</span>
              <span v-if="timestamp" class="summary-time">更新于 {{ timestamp }}</span>
              <span>, 仅供参考</span>
            </p>
          </header>

          <section class="fund-list">
            <button
              v-for="item in categories"
              :key="item.id"
              class="fund-row"
              type="button"
              @click="openDetail(item.id)"
            >
              <span class="fund-left">
                <span class="fund-name">{{ item.name }}</span>
                <span v-if="sessionLabel" class="session-badge">{{ sessionLabel }}</span>
              </span>
              <span class="fund-impact" :class="toneClass(item.estimatedImpact)">
                {{ formatPercent(item.estimatedImpact) }}
              </span>
            </button>
          </section>
          
          <section class="qrcode-section">
            <div class="qrcode-wrapper">
              <img :src="qrcodeImage" class="qrcode-image" alt="二维码" />
              <a v-show="!hiddenOvernight" href="http://web1.345569.xyz/" rel="noopener noreferrer" class="visit-link">美股24h</a>
            </div>
            <p class="qrcode-text">扫码关注公众号</p>
          </section>
        </section>

        <section v-else class="detail-page">
          <header class="detail-header">
            <div class="detail-heading">
              <h1 class="detail-title">{{ selectedCategory.name }}</h1>
              <p class="detail-impact" :class="toneClass(selectedCategory.estimatedImpact)">
                估值: {{ formatPercent(selectedCategory.estimatedImpact) }}
              </p>
            </div>
          </header>

          <section class="holdings-card">
            <div class="table-head">
              <span>名称</span>
              <span>占比</span>
              <span>涨跌幅</span>
            </div>

            <div
              v-for="stock in visibleStocks"
              :key="`${stock.name}-${stock.weight}`"
              class="table-row"
            >
              <span class="stock-name">{{ stock.name }}</span>
              <span class="stock-weight">{{ formatPercent(stock.weight) }}</span>
              <span class="stock-change" :class="toneClass(stock.change)">
                {{ formatPercent(stock.change) }}
              </span>
            </div>

            <button
              v-if="parsedStocks.length > INITIAL_VISIBLE_COUNT"
              class="expand-button"
              type="button"
              @click="expanded = !expanded"
            >
              {{ expanded ? '收起全部数据' : '展开全部数据' }}
            </button>
          </section>

          <p class="detail-note">{{ detailNote }}</p>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.qrcode-section {
  padding: 2rem 10px;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
}

.qrcode-wrapper {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.qrcode-image {
  width: 140px;
  height: 140px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.visit-link {
  color: #667eea;
  text-decoration: none;
  font-size: 1rem;
  font-weight: 500;
  transition: color 0.2s ease;
}

.visit-link:hover {
  color: #764ba2;
  text-decoration: underline;
}

.qrcode-text {
  width: 100%;
  margin: 0;
  font-size: 0.875rem;
  color: #666;
  text-align: left;
}
</style>
