<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { DashboardCuidadoResponse } from '../../services/adminService'
import AppIcon from '../AppIcon.vue'
import { DASHBOARD_CUIDADO_COPY } from '../../constants/dashboardCuidado'
import { hasAlertasPendentes, resolveDashboardLimiares } from '../../utils/dashboardCuidadoUi'
import DashboardCuidadoHero from './DashboardCuidadoHero.vue'
import DashboardCuidadoKpis from './DashboardCuidadoKpis.vue'
import DashboardCuidadoAlertas from './DashboardCuidadoAlertas.vue'
import DashboardCuidadoCelulas from './DashboardCuidadoCelulas.vue'

const props = defineProps<{
  data: DashboardCuidadoResponse | null
  loading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  retry: []
}>()

const router = useRouter()

const resumo = computed(() => props.data?.resumo ?? null)
const alertasPayload = computed(() => props.data?.alertas ?? null)
const totaisAlertas = computed(() => {
  if (props.data?.totaisAlertas) return props.data.totaisAlertas
  const r = props.data?.resumo
  const a = props.data?.alertas
  if (!r || !a) return null
  return {
    membrosSemCuidador: r.semCuidador,
    celulasBaixaCobertura: a.celulasBaixaCobertura.length,
    consolidadoresSobrecarregados: a.consolidadoresSobrecarregados.length,
  }
})
const limiares = computed(() => resolveDashboardLimiares(props.data?.limiares))
const celulas = computed(() => props.data?.celulas ?? [])

const showCelebration = computed(() => {
  const r = resumo.value
  const t = totaisAlertas.value
  return !!(
    r &&
    t &&
    r.totalMembros > 0 &&
    !hasAlertasPendentes(t) &&
    r.statusSemafaro === 'ok'
  )
})
</script>

<template>
  <div class="pb-28 sm:pb-10">
    <div
      v-if="error && !loading"
      class="mb-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center"
    >
      <p class="flex-1 text-sm text-rose-900">{{ error }}</p>
      <button
        type="button"
        class="min-h-[48px] touch-manipulation rounded-lg bg-rose-600 px-4 text-sm font-medium text-white"
        @click="emit('retry')"
      >
        Tentar novamente
      </button>
    </div>

    <DashboardCuidadoKpis
      :resumo="resumo"
      :totais-alertas="totaisAlertas"
      :limiares="limiares"
      :loading="loading"
    />

    <!-- Desktop: KPI à esquerda, alertas à direita; mobile: empilhado -->
    <div
      class="mb-6 flex flex-col gap-0 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm lg:flex-row lg:items-stretch"
    >
      <div
        class="border-neutral-100 bg-gradient-to-br from-neutral-50 via-white to-primary-50/30 p-5 sm:p-6 lg:min-w-0 lg:flex-1 lg:border-r"
      >
        <DashboardCuidadoHero :resumo="resumo" :loading="loading" />
      </div>
      <div
        class="border-t border-neutral-100 p-5 sm:p-6 lg:max-h-[min(70vh,560px)] lg:min-w-0 lg:flex-1 lg:overflow-y-auto lg:border-t-0"
      >
        <DashboardCuidadoAlertas
          :alertas="alertasPayload"
          :totais-alertas="totaisAlertas"
          :limiares="limiares"
          :loading="loading"
          :show-celebration="showCelebration"
        />
      </div>
    </div>

    <!-- Atalhos -->
    <div class="mb-6 grid grid-cols-2 gap-3">
      <button
        type="button"
        class="card touch-manipulation rounded-xl border border-neutral-200 p-4 text-left shadow-sm transition-transform hover:border-primary-200 active:scale-[0.98] motion-reduce:transition-none"
        @click="router.push({ name: 'admin-cells' })"
      >
        <div class="mb-2 flex items-center gap-2">
          <AppIcon name="grid" size="sm" class="text-primary-600" />
          <span class="text-sm font-semibold text-neutral-900">{{
            DASHBOARD_CUIDADO_COPY.shortcuts.celulas
          }}</span>
        </div>
        <p class="text-xs text-neutral-500">Gerenciar células e líderes</p>
      </button>
      <button
        type="button"
        class="card touch-manipulation rounded-xl border border-neutral-200 p-4 text-left shadow-sm transition-transform hover:border-primary-200 active:scale-[0.98] motion-reduce:transition-none"
        @click="router.push({ name: 'admin-rede-cuidado' })"
      >
        <div class="mb-2 flex items-center gap-2">
          <AppIcon name="heart" size="sm" class="text-rose-600" />
          <span class="text-sm font-semibold text-neutral-900">{{
            DASHBOARD_CUIDADO_COPY.ctaSticky
          }}</span>
        </div>
        <p class="text-xs text-neutral-500">Atribuir cuidadores por célula</p>
      </button>
    </div>

    <DashboardCuidadoCelulas :celulas="celulas" :limiares="limiares" :loading="loading" />


    <div class="mt-6 hidden justify-end sm:flex">
      <button
        type="button"
        class="min-h-[44px] touch-manipulation rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white hover:bg-rose-700"
        @click="router.push({ name: 'admin-rede-cuidado' })"
      >
        {{ DASHBOARD_CUIDADO_COPY.ctaSticky }}
      </button>
    </div>
  </div>
</template>
