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
        {{ DASHBOARD_UNIFIED_COPY.sections.participacao }}
      </h2>
      <DashboardWeekNav
        :label="weekLabel"
        :can-go-forward="canGoForward"
        @prev="emit('prevWeek')"
        @next="emit('nextWeek')"
      />
    </div>

    <div v-if="loading" class="grid flex-1 grid-cols-2 gap-3" aria-busy="true">
      <div v-for="i in 2" :key="i" class="h-24 animate-pulse rounded-lg bg-neutral-100" />
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
      <p class="mb-4 text-xs text-neutral-500">
        {{ data.participacao.totalMembros }} {{ DASHBOARD_UNIFIED_COPY.participacao.membros }}
      </p>
      <div class="grid flex-1 grid-cols-2 gap-3">
        <div class="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
          <p class="text-xs font-medium text-neutral-500">
            {{ DASHBOARD_UNIFIED_COPY.participacao.culto }}
          </p>
          <p class="mt-1 text-2xl font-bold tabular-nums text-neutral-900">
            {{ data.participacao.culto.percentual }}%
          </p>
          <p class="mt-1 text-xs tabular-nums text-neutral-500">
            {{ data.participacao.culto.presentes }} / {{ data.participacao.culto.total }}
          </p>
        </div>
        <div class="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
          <p class="text-xs font-medium text-neutral-500">
            {{ DASHBOARD_UNIFIED_COPY.participacao.celula }}
          </p>
          <p class="mt-1 text-2xl font-bold tabular-nums text-neutral-900">
            {{ data.participacao.celula.percentual }}%
          </p>
          <p class="mt-1 text-xs tabular-nums text-neutral-500">
            {{ data.participacao.celula.presentes }} / {{ data.participacao.celula.total }}
          </p>
        </div>
      </div>
    </template>
  </article>
</template>
