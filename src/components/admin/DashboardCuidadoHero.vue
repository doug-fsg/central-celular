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
    <div v-if="loading" class="flex animate-pulse flex-col items-center lg:items-start">
      <div class="mb-4 size-[160px] rounded-full bg-neutral-200 sm:size-[200px]" />
      <div class="mb-2 h-4 w-40 rounded bg-neutral-200" />
      <div class="h-9 w-24 rounded bg-neutral-200" />
    </div>

    <div v-else-if="resumo && resumo.totalMembros === 0" class="py-4 text-center lg:text-left">
      <p class="mx-auto max-w-md text-sm text-neutral-600 lg:mx-0">
        Ainda não há membros ativos neste recorte — cadastros e células aparecem aqui quando
        começarem a encher.
      </p>
    </div>

    <div v-else-if="resumo" class="flex flex-col items-center lg:items-start">
      <div
        class="relative mx-auto mb-4 flex size-[160px] items-center justify-center sm:size-[200px] lg:mx-0"
      >
        <svg
          class="size-[128px] rotate-[-90deg] sm:size-[140px]"
          viewBox="0 0 120 120"
          aria-hidden="true"
        >
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
          <span class="text-3xl font-bold leading-none text-neutral-900 tabular-nums sm:text-4xl">
            {{ resumo.comCuidador }}
          </span>
          <span class="mt-1 text-sm text-neutral-500"> / {{ resumo.totalMembros }} </span>
        </div>
      </div>
      <p class="w-full text-center text-sm text-neutral-600 lg:text-left">
        {{ DASHBOARD_CUIDADO_COPY.kpiSubtitle }}
      </p>
      <p class="mt-1 w-full text-center text-xs tabular-nums text-neutral-500 lg:text-left">
        {{ resumo.percentualCobertura }}% cobertura
      </p>
      <span
        class="mx-auto mt-3 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold motion-reduce:transition-none transition-colors lg:mx-0"
        :class="chipClass"
      >
        {{ chipLabel }}
      </span>
    </div>
  </section>
</template>
