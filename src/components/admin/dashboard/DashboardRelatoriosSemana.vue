<script setup lang="ts">
import { ref } from 'vue'
import type { DashboardSemanaResponse } from '../../../services/adminService'
import { DASHBOARD_UNIFIED_COPY } from '../../../constants/dashboardUnified'
import DashboardWeekNav from './DashboardWeekNav.vue'
import DashboardSemanaDetailModal from './DashboardSemanaDetailModal.vue'

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

const detailOpen = ref(false)

function openDetail() {
  detailOpen.value = true
}

function closeDetail() {
  detailOpen.value = false
}
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

    <button
      v-else-if="data"
      type="button"
      class="relative flex flex-1 flex-col justify-center rounded-lg text-left transition-colors hover:bg-neutral-50 touch-manipulation"
      @click="openDetail"
    >
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
      <span
        class="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm"
        aria-hidden="true"
      >
        <svg class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </button>

    <DashboardSemanaDetailModal
      :open="detailOpen"
      variant="relatorios"
      :title="DASHBOARD_UNIFIED_COPY.semanaDetail.relatoriosTitle"
      icon="calendar"
      icon-wrap="bg-emerald-100 text-emerald-600"
      :relatorio-preencheram="data?.relatorios.listas?.preencheram"
      :relatorio-pendentes="data?.relatorios.listas?.pendentes"
      @close="closeDetail"
    />
  </article>
</template>
