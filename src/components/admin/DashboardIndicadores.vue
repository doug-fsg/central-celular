<script setup lang="ts">
import { ref, watch, computed, defineAsyncComponent, onMounted } from 'vue'
import { adminService, type AdminStats } from '../../services/adminService'
import { DASHBOARD_INDICADORES_COPY } from '../../constants/dashboardCuidado'
import {
  PUBLICO_CELULA_OPTIONS,
  PUBLICO_CELULA_LABELS,
  type PublicoCelula,
} from '../../constants/publicoCelula'
import AppIcon from '../AppIcon.vue'

const FrequencyChart = defineAsyncComponent(() => import('../FrequencyChart.vue'))

const props = defineProps<{
  active: boolean
  leaderFilterId: string
}>()

const periodoSelecionado = ref('semana')
const publicoSelecionado = ref('')
const loadingStats = ref(false)
const chartsLoadedFlag = ref(false)

const stats = ref<AdminStats>({
  resumo: {
    totalCelulas: 0,
    totalSupervisores: 0,
    totalLideres: 0,
    totalMembros: 0,
    mediaFrequencia: 0,
    crescimentoMembros: 0,
    variacaoFrequencia: 0,
  },
  indicadores: {
    relatoriosEnviados: 0,
    consolidadoresAtivos: 0,
    coLideresAtivos: 0,
    novosMembros: 0,
    mediaMembrosPorCelula: 0,
  },
  frequencia: {
    atual: { celula: 0, culto: 0, media: 0 },
    anterior: { celula: 0, culto: 0, media: 0 },
  },
  regioes: [],
  porPublico: [],
  filtros: { liderId: null, publico: null },
})

const publicoCards = computed(() => {
  const order: PublicoCelula[] = ['homens', 'mulheres', 'misto', 'nao_informado']
  return order.map((publico) => {
    const item = stats.value.porPublico?.find((p) => p.publico === publico)
    return {
      publico,
      label: PUBLICO_CELULA_LABELS[publico],
      totalCelulas: item?.totalCelulas ?? 0,
      totalMembros: item?.totalMembros ?? 0,
      relatoriosEnviados: item?.relatoriosEnviados ?? 0,
    }
  })
})

async function carregarStats() {
  if (!props.active) return
  loadingStats.value = true
  try {
    const liderId = props.leaderFilterId ? Number(props.leaderFilterId) : undefined
    stats.value = await adminService.obterEstatisticas(
      periodoSelecionado.value,
      liderId !== undefined && !Number.isNaN(liderId) ? liderId : undefined,
      publicoSelecionado.value || undefined,
    )
    chartsLoadedFlag.value = true
  } catch (e) {
    console.error('Erro ao carregar indicadores:', e)
  } finally {
    loadingStats.value = false
  }
}

watch(
  () => props.active,
  (a) => {
    if (a) void carregarStats()
  },
)

watch(
  () => [periodoSelecionado.value, props.leaderFilterId, publicoSelecionado.value] as const,
  () => {
    if (props.active) void carregarStats()
  },
)

onMounted(() => {
  if (props.active) void carregarStats()
})

function setPeriodo(key: string) {
  if (key === 'semana' || key === 'mes' || key === 'trimestre' || key === 'ano') {
    periodoSelecionado.value = key
  }
}

function setPublico(value: string) {
  publicoSelecionado.value = value
}
</script>

<template>
  <div class="space-y-4 motion-reduce:transition-none tab-fade">
    <p
      class="text-xs leading-relaxed text-neutral-700 border border-neutral-200 bg-neutral-100 rounded-xl px-3 py-2.5"
    >
      {{ DASHBOARD_INDICADORES_COPY.banner }}
    </p>

    <!-- Período + pills -->
    <div class="flex flex-col gap-3">
      <div class="-mx-1 overflow-x-auto flex gap-2 snap-x snap-mandatory pb-1">
        <button
          v-for="periodo in [
            { key: 'semana', label: 'Última Semana', labelMobile: 'Últ. Semana' },
            { key: 'mes', label: 'Mês', labelMobile: 'Mês' },
            { key: 'trimestre', label: 'Trimestre', labelMobile: 'Trim.' },
            { key: 'ano', label: 'Ano', labelMobile: 'Ano' },
          ]"
          :key="periodo.key"
          type="button"
          class="min-h-[40px] px-3 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 snap-start touch-manipulation"
          :class="
            periodoSelecionado === periodo.key
              ? 'bg-primary-500 text-white shadow-sm'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          "
          @click="setPeriodo(periodo.key)"
        >
          <span class="sm:hidden">{{ periodo.labelMobile }}</span>
          <span class="hidden sm:inline">{{ periodo.label }}</span>
        </button>
      </div>

      <div class="-mx-1 overflow-x-auto flex gap-2 snap-x snap-mandatory pb-1">
        <button
          type="button"
          class="min-h-[36px] px-3 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 snap-start touch-manipulation"
          :class="
            !publicoSelecionado
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          "
          @click="setPublico('')"
        >
          Todos os públicos
        </button>
        <button
          v-for="opt in PUBLICO_CELULA_OPTIONS"
          :key="opt.value"
          type="button"
          class="min-h-[36px] px-3 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 snap-start touch-manipulation"
          :class="
            publicoSelecionado === opt.value
              ? 'bg-neutral-800 text-white shadow-sm'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
          "
          @click="setPublico(opt.value)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Resumo por público -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="card in publicoCards"
        :key="card.publico"
        class="card p-4 border-neutral-200 bg-white"
      >
        <p class="text-xs font-medium text-neutral-500 mb-2">{{ card.label }}</p>
        <div class="space-y-1 text-sm">
          <p><span class="font-semibold tabular-nums">{{ card.totalCelulas }}</span> células</p>
          <p><span class="font-semibold tabular-nums">{{ card.totalMembros }}</span> membros</p>
          <p class="text-neutral-600">
            <span class="font-semibold tabular-nums">{{ card.relatoriosEnviados }}</span> relatórios no período
          </p>
        </div>
      </div>
    </div>

    <!-- Cards técnicos (sem totais celula/membro — ficam na aba Cuidado) -->
    <div v-if="loadingStats && !chartsLoadedFlag" class="grid gap-3 sm:grid-cols-3">
      <div v-for="i in 3" :key="i" class="h-28 rounded-xl bg-neutral-100 animate-pulse" />
    </div>

    <div v-else class="grid gap-3 sm:grid-cols-3 mb-4">
      <div class="card p-4 sm:p-5 bg-gradient-to-br from-neutral-50 to-neutral-100 border-neutral-200">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
            <AppIcon name="chart-bar" class="text-white" size="sm" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium text-neutral-600 mb-0.5">Média geral (período)</p>
            <p class="text-xl font-bold tabular-nums">{{ stats.resumo.mediaFrequencia }}%</p>
            <p class="text-[10px] text-neutral-500 mt-1">
              <span :class="stats.resumo.variacaoFrequencia >= 0 ? 'text-green-700' : 'text-red-600'">
                {{ stats.resumo.variacaoFrequencia >= 0 ? '▲' : '▼' }}
                {{ Math.abs(stats.resumo.variacaoFrequencia) }}%
              </span>
              vs período anterior
            </p>
          </div>
        </div>
      </div>

      <div class="card p-4 sm:p-5 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-green-500 shrink-0 flex items-center justify-center">
            <AppIcon name="chart-bar" class="text-white" size="sm" />
          </div>
          <div>
            <p class="text-xs font-medium text-green-800 mb-0.5">Média célula</p>
            <p class="text-xl font-bold text-green-900 tabular-nums">{{ stats.frequencia.atual.celula }}%</p>
            <p class="text-[10px] text-green-700">Período anterior: {{ stats.frequencia.anterior.celula }}%</p>
          </div>
        </div>
      </div>

      <div class="card p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-blue-500 shrink-0 flex items-center justify-center">
            <AppIcon name="chart-bar" class="text-white" size="sm" />
          </div>
          <div>
            <p class="text-xs font-medium text-blue-800 mb-0.5">Média culto</p>
            <p class="text-xl font-bold text-blue-900 tabular-nums">{{ stats.frequencia.atual.culto }}%</p>
            <p class="text-[10px] text-blue-700">Período anterior: {{ stats.frequencia.anterior.culto }}%</p>
          </div>
        </div>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-3">
      <div
        class="card p-4 sm:p-5 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 sm:col-span-3"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-purple-500 shrink-0 flex items-center justify-center">
            <AppIcon name="calendar" class="text-white" size="sm" />
          </div>
          <div>
            <p class="text-xs font-medium text-purple-700">Relatórios enviados (período)</p>
            <p class="text-xl font-bold text-purple-900">{{ stats.indicadores.relatoriosEnviados }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="rounded-xl overflow-hidden border border-neutral-200 bg-white min-h-[12rem] sm:min-h-[16rem]">
      <FrequencyChart :periodo="periodoSelecionado" />
    </div>
  </div>
</template>

<style scoped>
.tab-fade {
  animation: dashFade 180ms ease-out;
}
@keyframes dashFade {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .tab-fade {
    animation: none;
  }
}
.card {
  @apply rounded-lg shadow-sm border bg-white;
}
</style>
