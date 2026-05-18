<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { DashboardCuidadoResponse } from '../../services/adminService'
import AppIcon from '../AppIcon.vue'
import { DASHBOARD_CUIDADO_COPY } from '../../constants/dashboardCuidado'
import DashboardCuidadoHero from './DashboardCuidadoHero.vue'
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
const celulas = computed(() => props.data?.celulas ?? [])

const showCelebration = computed(() => {
  const r = resumo.value
  return !!(
    r &&
    r.totalMembros > 0 &&
    r.percentualCobertura === 100 &&
    r.consolidadoresSobrecarregados === 0 &&
    r.statusSemafaro === 'ok'
  )
})
</script>

<template>
  <div class="pb-28 sm:pb-10">
    <div
      v-if="error && !loading"
      class="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <p class="text-sm text-rose-900 flex-1">{{ error }}</p>
      <button
        type="button"
        class="min-h-[48px] px-4 rounded-lg bg-rose-600 text-white font-medium text-sm touch-manipulation"
        @click="emit('retry')"
      >
        Tentar novamente
      </button>
    </div>

    <!-- Desktop: KPI à esquerda, alertas à direita; mobile: empilhado -->
    <div
      class="mb-6 rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden flex flex-col lg:flex-row lg:items-stretch gap-0"
    >
      <div
        class="p-5 sm:p-6 lg:flex-1 lg:min-w-0 lg:border-r border-neutral-100 bg-gradient-to-br from-neutral-50 via-white to-primary-50/30"
      >
        <DashboardCuidadoHero :resumo="resumo" :loading="loading" />
      </div>
      <div
        class="p-5 sm:p-6 lg:flex-1 lg:min-w-0 border-t lg:border-t-0 border-neutral-100 lg:max-h-[min(70vh,560px)] lg:overflow-y-auto"
      >
        <DashboardCuidadoAlertas
          :alertas="alertasPayload"
          :loading="loading"
          :show-celebration="showCelebration"
        />
      </div>
    </div>

    <!-- Atalhos -->
    <div class="grid grid-cols-2 gap-3 mb-6">
      <button
        type="button"
        class="card p-4 text-left rounded-xl border border-neutral-200 active:scale-[0.98] touch-manipulation motion-reduce:transition-none transition-transform shadow-sm hover:border-primary-200"
        @click="router.push({ name: 'admin-cells' })"
      >
        <div class="flex items-center gap-2 mb-2">
          <AppIcon name="grid" size="sm" class="text-primary-600" />
          <span class="text-sm font-semibold text-neutral-900">{{
            DASHBOARD_CUIDADO_COPY.shortcuts.celulas
          }}</span>
        </div>
        <p class="text-xs text-neutral-500">Gerenciar células e líderes</p>
      </button>
      <button
        type="button"
        class="card p-4 text-left rounded-xl border border-neutral-200 active:scale-[0.98] touch-manipulation motion-reduce:transition-none transition-transform shadow-sm hover:border-primary-200"
        @click="router.push({ name: 'admin-members' })"
      >
        <div class="flex items-center gap-2 mb-2">
          <AppIcon name="users" size="sm" class="text-primary-600" />
          <span class="text-sm font-semibold text-neutral-900">{{
            DASHBOARD_CUIDADO_COPY.shortcuts.membros
          }}</span>
        </div>
        <p class="text-xs text-neutral-500">Lista de membros</p>
      </button>
    </div>

    <DashboardCuidadoCelulas :celulas="celulas" :loading="loading" />

    <!-- Sticky mobile CTA -->
    <div
      class="sm:hidden fixed left-0 right-0 z-20 px-4 pointer-events-none"
      style="bottom: calc(4.5rem + env(safe-area-inset-bottom, 0px))"
    >
      <button
        type="button"
        class="pointer-events-auto w-full min-h-[48px] rounded-xl bg-rose-600 text-white font-semibold text-sm shadow-lg active:bg-rose-700 touch-manipulation"
        @click="router.push({ name: 'admin-rede-cuidado' })"
      >
        {{ DASHBOARD_CUIDADO_COPY.ctaSticky }}
      </button>
    </div>

    <div class="hidden sm:flex justify-end mt-6">
      <button
        type="button"
        class="min-h-[44px] px-5 rounded-xl bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 touch-manipulation"
        @click="router.push({ name: 'admin-rede-cuidado' })"
      >
        {{ DASHBOARD_CUIDADO_COPY.ctaSticky }}
      </button>
    </div>
  </div>
</template>
