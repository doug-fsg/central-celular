<script setup lang="ts">
import type { DashboardSemanaResponse } from '../../../services/adminService'
import { DASHBOARD_UNIFIED_COPY } from '../../../constants/dashboardUnified'
import DashboardWeekNav from './DashboardWeekNav.vue'

defineProps<{
  data: DashboardSemanaResponse | null
  weekLabel: string
  canGoForward: boolean
  loading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  prevWeek: []
  nextWeek: []
  retry: []
}>()
</script>

<template>
  <article class="flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
    <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 class="text-sm font-semibold text-neutral-800">
        {{ DASHBOARD_UNIFIED_COPY.sections.relatorios }}
      </h2>
      <DashboardWeekNav
        :label="weekLabel"
        :can-go-forward="canGoForward"
        @prev="emit('prevWeek')"
        @next="emit('nextWeek')"
      />
    </div>

    <div v-if="loading" class="flex flex-1 flex-col gap-3" aria-busy="true">
      <div class="h-16 animate-pulse rounded-lg bg-neutral-100" />
      <div class="h-10 animate-pulse rounded-lg bg-neutral-100" />
    </div>

    <div v-else-if="error" class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <p class="text-sm text-rose-600">{{ error }}</p>
      <button
        type="button"
        class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white"
        @click="emit('retry')"
      >
        Tentar novamente
      </button>
    </div>

    <template v-else-if="data">
      <div class="flex flex-1 flex-col justify-center">
        <p class="text-3xl font-bold tabular-nums text-neutral-900">
          {{ data.relatorios.lideresPreencheram }}
          <span class="text-lg font-medium text-neutral-500">
            {{ DASHBOARD_UNIFIED_COPY.relatorios.de }} {{ data.relatorios.lideresTotal }}
          </span>
        </p>
        <p class="mt-1 text-sm text-neutral-600">
          {{ DASHBOARD_UNIFIED_COPY.relatorios.preencheram }}
          ({{ data.relatorios.percentualAdesao }}%)
        </p>
        <p
          class="mt-3 text-sm tabular-nums"
          :class="data.relatorios.pendentes > 0 ? 'text-amber-700' : 'text-neutral-500'"
        >
          {{ data.relatorios.pendentes }} {{ DASHBOARD_UNIFIED_COPY.relatorios.pendentes }}
        </p>
      </div>
    </template>
  </article>
</template>
