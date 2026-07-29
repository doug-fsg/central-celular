<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { subDays } from 'date-fns'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type TooltipItem,
} from 'chart.js'
import api from '../../../services/api'
import {
  DASHBOARD_UNIFIED_COPY,
  type FrequenciaPeriodoKey,
} from '../../../constants/dashboardUnified'

ChartJS.register(CategoryScale, LinearScale, BarController, BarElement, Title, Tooltip, Legend)

interface FrequencyRow {
  data: string
  formatDate: string
  celula: number
  culto: number
  totalCelula: number
  totalCulto: number
}

const props = defineProps<{
  liderId?: number
}>()

const periodo = ref<FrequenciaPeriodoKey>('30')
const loading = ref(false)
const error = ref<string | null>(null)
const rows = ref<FrequencyRow[]>([])

function getRange(days: number) {
  const end = new Date()
  const start = subDays(end, days - 1)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

async function loadData() {
  loading.value = true
  error.value = null
  try {
    const days = Number(periodo.value)
    const { start, end } = getRange(days)
    const params = new URLSearchParams({ dataInicio: start, dataFim: end })
    const response = await api.get(`/relatorios/frequencia-por-data?${params}`)
    rows.value = Array.isArray(response) ? response : []
  } catch {
    error.value = 'Erro ao carregar frequência'
    rows.value = []
  } finally {
    loading.value = false
  }
}

const chartData = computed(() => {
  if (!rows.value.length) return { labels: [], datasets: [] }
  return {
    labels: rows.value.map((r) => r.formatDate),
    datasets: [
      {
        label: 'Célula',
        data: rows.value.map((r) => r.celula),
        backgroundColor: 'rgba(59, 130, 246, 0.75)',
        borderRadius: 4,
      },
      {
        label: 'Culto',
        data: rows.value.map((r) => r.culto),
        backgroundColor: 'rgba(16, 185, 129, 0.75)',
        borderRadius: 4,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: { usePointStyle: true, boxWidth: 8, padding: 16, font: { size: 12 } },
    },
    tooltip: {
      callbacks: {
        label: (ctx: TooltipItem<'bar'>) => {
          const row = rows.value[ctx.dataIndex]
          if (!row) return `${ctx.dataset.label}: ${ctx.parsed.y}`
          const total = ctx.dataset.label === 'Célula' ? row.totalCelula : row.totalCulto
          const pct = total > 0 ? Math.round((ctx.parsed.y / total) * 100) : 0
          return `${ctx.dataset.label}: ${ctx.parsed.y} (${pct}% de ${total})`
        },
      },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
    y: { beginAtZero: true, ticks: { stepSize: 1 } },
  },
}))

watch([periodo, () => props.liderId], loadData, { immediate: true })

function setPeriodo(key: FrequenciaPeriodoKey) {
  periodo.value = key
}
</script>

<template>
  <article class="flex h-full min-h-[320px] flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-sm font-semibold text-neutral-800">
        {{ DASHBOARD_UNIFIED_COPY.sections.frequencia }}
      </h2>
      <div class="flex gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1">
        <button
          v-for="p in DASHBOARD_UNIFIED_COPY.frequenciaPeriodos"
          :key="p.key"
          type="button"
          class="rounded-md px-3 py-1.5 text-xs font-medium touch-manipulation transition-colors"
          :class="
            periodo === p.key
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-600 hover:text-neutral-900'
          "
          @click="setPeriodo(p.key)"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex flex-1 items-center justify-center">
      <div class="size-8 animate-spin rounded-full border-2 border-neutral-200 border-t-primary-600" />
    </div>

    <div v-else-if="error" class="flex flex-1 items-center justify-center text-sm text-rose-600">
      {{ error }}
    </div>

    <div
      v-else-if="!rows.length"
      class="flex flex-1 items-center justify-center text-sm text-neutral-500"
    >
      Nenhum dado no período selecionado
    </div>

    <div v-else class="min-h-[220px] flex-1">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </article>
</template>
