<script setup lang="ts">
import { computed } from 'vue'
import type { DashboardCuidadoResponse } from '../../services/adminService'
import { DASHBOARD_CUIDADO_COPY } from '../../constants/dashboardCuidado'

const props = defineProps<{
  resumo: DashboardCuidadoResponse['resumo'] | null
  loading: boolean
}>()

const r = 52
const c = 2 * Math.PI * r

const pct = computed(() =>
  props.resumo && props.resumo.totalMembros > 0 ? props.resumo.percentualCobertura : 0,
)

const offset = computed(() => {
  const p = Math.min(100, Math.max(0, pct.value))
  return c * (1 - p / 100)
})

const chipClass = computed(() => {
  const s = props.resumo?.statusSemafaro
  if (s === 'ok') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (s === 'atencao') return 'bg-amber-100 text-amber-900 border-amber-200'
  return 'bg-rose-100 text-rose-900 border-rose-200'
})

const chipLabel = computed(() => {
  const s = props.resumo?.statusSemafaro
  if (s === 'ok') return DASHBOARD_CUIDADO_COPY.semafaroChip.ok
  if (s === 'atencao') return DASHBOARD_CUIDADO_COPY.semafaroChip.atencao
  return DASHBOARD_CUIDADO_COPY.semafaroChip.critico
})
</script>

<template>
  <section aria-live="polite">
    <div v-if="loading && !resumo" class="flex flex-col items-center lg:items-start animate-pulse">
      <div class="w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-full bg-neutral-200 mb-4" />
      <div class="h-4 w-40 bg-neutral-200 rounded mb-2" />
      <div class="h-9 w-24 bg-neutral-200 rounded" />
    </div>

    <div v-else-if="resumo && resumo.totalMembros === 0" class="text-center lg:text-left py-4">
      <p class="text-sm text-neutral-600 max-w-md mx-auto lg:mx-0">
        Ainda não há membros ativos neste recorte — cadastros e células aparecem aqui quando começarem a
        encher.
      </p>
    </div>

    <div v-else-if="resumo" class="flex flex-col items-center lg:items-start">
      <div
        class="relative w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] flex items-center justify-center mb-4 mx-auto lg:mx-0"
      >
        <svg class="rotate-[-90deg] w-[128px] h-[128px] sm:w-[140px] sm:h-[140px]" viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" :r="r" fill="none" class="stroke-neutral-200" stroke-width="10" />
          <circle
            cx="60"
            cy="60"
            :r="r"
            fill="none"
            class="stroke-primary-500 motion-reduce:transition-none transition-[stroke-dashoffset] duration-300"
            stroke-width="10"
            stroke-linecap="round"
            :stroke-dasharray="c"
            :stroke-dashoffset="offset"
          />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <span class="text-3xl sm:text-4xl font-bold text-neutral-900 tabular-nums leading-none">
            {{ resumo.comCuidador }}
          </span>
          <span class="text-sm text-neutral-500 mt-1"> / {{ resumo.totalMembros }} </span>
        </div>
      </div>
      <p class="text-sm text-neutral-600 text-center lg:text-left w-full">{{ DASHBOARD_CUIDADO_COPY.kpiSubtitle }}</p>
      <p class="text-xs text-neutral-500 mt-1 tabular-nums text-center lg:text-left w-full">
        {{ resumo.percentualCobertura }}% cobertura
      </p>
      <span
        class="mt-3 inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold motion-reduce:transition-none transition-colors mx-auto lg:mx-0"
        :class="chipClass"
      >
        {{ chipLabel }}
      </span>
    </div>
  </section>
</template>
