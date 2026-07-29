<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Usuario } from '../../../services/adminService'
import { useDashboardUnified } from '../../../composables/useDashboardUnified'
import { DASHBOARD_UNIFIED_COPY } from '../../../constants/dashboardUnified'
import DashboardUnifiedHeader from './DashboardUnifiedHeader.vue'
import DashboardCoberturaGeral from './DashboardCoberturaGeral.vue'
import DashboardMiniStatGrid from './DashboardMiniStatGrid.vue'
import DashboardFrequenciaChart from './DashboardFrequenciaChart.vue'
import DashboardParticipacaoSemana from './DashboardParticipacaoSemana.vue'
import DashboardRelatoriosSemana from './DashboardRelatoriosSemana.vue'
import DashboardCelulasTable from './DashboardCelulasTable.vue'
import DashboardCuidadoresAtivos from './DashboardCuidadoresAtivos.vue'

const props = defineProps<{
  leaderFilterId: string
  leaders: Usuario[]
}>()

const emit = defineEmits<{
  'update:leaderFilterId': [value: string]
}>()

const router = useRouter()

const {
  cuidadoLoading,
  participacaoLoading,
  relatoriosLoading,
  cuidadoError,
  participacaoError,
  relatoriosError,
  limiares,
  celulas,
  resumo,
  totaisAlertas,
  listas,
  participacaoData,
  relatoriosData,
  participacaoWeek,
  relatoriosWeek,
  refreshCuidado,
  refreshParticipacao,
  refreshRelatorios,
} = useDashboardUnified(computed(() => props.leaderFilterId))

const liderIdNum = computed(() => {
  const n = Number(props.leaderFilterId)
  return props.leaderFilterId && !Number.isNaN(n) ? n : undefined
})

const consolidadoresAtivos = computed(
  () => resumo.value?.consolidadoresAtivos ?? 0,
)

function goRedeCuidado() {
  router.push({ name: 'admin-rede-cuidado' })
}
</script>

<template>
  <div class="pb-28 sm:pb-10">
    <DashboardUnifiedHeader
      :leader-filter-id="leaderFilterId"
      :leaders="leaders"
      @update:leader-filter-id="emit('update:leaderFilterId', $event)"
    />

    <div
      v-if="cuidadoError && !cuidadoLoading"
      class="mb-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center"
    >
      <p class="flex-1 text-sm text-rose-900">{{ cuidadoError }}</p>
      <button
        type="button"
        class="min-h-[48px] touch-manipulation rounded-lg bg-rose-600 px-4 text-sm font-medium text-white"
        @click="refreshCuidado"
      >
        Tentar novamente
      </button>
    </div>

    <!-- Row 1: cobertura + mini-cards + frequência -->
    <div class="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)_minmax(0,1.15fr)]">
      <DashboardCoberturaGeral
        :resumo="resumo"
        :limiares="limiares"
        :loading="cuidadoLoading"
      />
      <DashboardMiniStatGrid
        :resumo="resumo"
        :totais-alertas="totaisAlertas"
        :listas="listas"
        :loading="cuidadoLoading"
      />
      <DashboardFrequenciaChart :lider-id="liderIdNum" />
    </div>

    <!-- Row 2 -->
    <div class="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <DashboardParticipacaoSemana
        :data="participacaoData"
        :week-label="participacaoWeek.weekLabel.value"
        :can-go-forward="participacaoWeek.canGoForward.value"
        :loading="participacaoLoading"
        :error="participacaoError"
        @prev-week="participacaoWeek.prevWeek"
        @next-week="participacaoWeek.nextWeek"
        @retry="refreshParticipacao"
      />
      <DashboardRelatoriosSemana
        :data="relatoriosData"
        :week-label="relatoriosWeek.weekLabel.value"
        :can-go-forward="relatoriosWeek.canGoForward.value"
        :loading="relatoriosLoading"
        :error="relatoriosError"
        @prev-week="relatoriosWeek.prevWeek"
        @next-week="relatoriosWeek.nextWeek"
        @retry="refreshRelatorios"
      />
    </div>

    <!-- Row 3 -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <DashboardCelulasTable
        :celulas="celulas"
        :limiares="limiares"
        :loading="cuidadoLoading"
      />
      <DashboardCuidadoresAtivos :total="consolidadoresAtivos" :loading="cuidadoLoading" />
    </div>

    <!-- Mobile sticky CTA -->
    <div
      class="pointer-events-none fixed left-0 right-0 z-20 px-4 sm:hidden"
      style="bottom: calc(4.5rem + env(safe-area-inset-bottom, 0px))"
    >
      <button
        type="button"
        class="pointer-events-auto min-h-[48px] w-full touch-manipulation rounded-xl bg-primary-600 text-sm font-semibold text-white shadow-lg active:bg-primary-700"
        @click="goRedeCuidado"
      >
        {{ DASHBOARD_UNIFIED_COPY.ctaRede }}
      </button>
    </div>
  </div>
</template>
