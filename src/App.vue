<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const API_URL = '/api/web'
const INITIAL_VISIBLE_COUNT = 10

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

const indexes = computed(() => data.value?.indexs ?? [])
const categories = computed(() => data.value?.categoryImpacts ?? [])
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
}

function backToList() {
  selectedId.value = null
  expanded.value = false
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function loadData() {
  loading.value = true
  error.value = ''

  try {
    const response = await fetch(API_URL, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
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

    const result = (await response.json()) as ApiResponse

    if (!result?.categoryImpacts?.length) {
      throw new Error('接口返回数据为空')
    }

    data.value = result
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载数据失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadData()
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
        <button class="retry-button" type="button" @click="loadData">重新加载</button>
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
              <span v-if="description">{{ description }}</span>
              <span v-if="timestamp" class="summary-time">更新于 {{ timestamp }}</span>
              <span v-if="data.hiddenOvernight">, 仅供参考</span>
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
        </section>

        <section v-else class="detail-page">
          <header class="detail-header">
            <button class="back-button" type="button" @click="backToList">返回</button>

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
