<script setup lang="ts">
import { computed } from 'vue'
import type { DashboardCuidadoResponse } from '../../../services/adminService'
import { DASHBOARD_UNIFIED_COPY } from '../../../constants/dashboardUnified'
import AppIcon from '../../AppIcon.vue'
import { coverageBarClass, resolveDashboardLimiares } from '../../../utils/dashboardCuidadoUi'

const props = defineProps<{
  resumo: DashboardCuidadoResponse['resumo'] | null
  limiares: DashboardCuidadoResponse['limiares'] | null
  loading: boolean
}>()

const limiaresResolved = computed(() => resolveDashboardLimiares(props.limiares))

const pct = computed(() =>
  props.resumo && props.resumo.totalMembros > 0 ? props.resumo.percentualCobertura : 0,
)

const coberturaLabel = computed(() => {
  if (!props.resumo) return ''
  return DASHBOARD_UNIFIED_COPY.coberturaPct(props.resumo.percentualCobertura)
})

const barClass = computed(() => coverageBarClass(pct.value, limiaresResolved.value))
</script>

<template>
  <article class="flex h-full flex-col rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm">
    <div class="mb-6 flex items-center gap-2.5">
      <div
        class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600"
      >
        <AppIcon name="users" size="sm" />
      </div>
      <h2 class="text-sm font-semibold text-neutral-800">
        {{ DASHBOARD_UNIFIED_COPY.sections.coberturaGeral }}
      </h2>
    </div>

    <div v-if="loading" class="flex flex-1 animate-pulse flex-col justify-center gap-4">
      <div class="h-12 w-28 rounded-lg bg-neutral-100" />
      <div class="h-4 w-full max-w-[220px] rounded bg-neutral-100" />
      <div class="h-3 w-full rounded-full bg-neutral-100" />
    </div>

    <div
      v-else-if="resumo && resumo.totalMembros === 0"
      class="flex flex-1 items-center justify-center py-8 text-center"
    >
      <p class="text-sm text-neutral-600">Nenhum membro ativo neste recorte.</p>
    </div>

    <div v-else-if="resumo" class="flex flex-1 flex-col justify-center">
      <p class="text-[2.75rem] font-bold leading-none tabular-nums tracking-tight text-neutral-900">
        {{ resumo.totalMembros }}
      </p>
      <p class="mt-3 text-sm text-neutral-500">{{ coberturaLabel }}</p>
      <div class="mt-5 h-3 w-full overflow-hidden rounded-full bg-neutral-100">
        <div
          class="h-full rounded-full motion-reduce:transition-none transition-all duration-500"
          :class="barClass"
          :style="{ width: `${Math.min(100, pct)}%` }"
        />
      </div>
    </div>
  </article>
</template>
