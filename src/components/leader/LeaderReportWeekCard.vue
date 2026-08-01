<script setup lang="ts">
import { LEADER_DASHBOARD_COPY } from '../../constants/leaderDashboard'
import DashboardWeekNav from '../admin/dashboard/DashboardWeekNav.vue'
import AppIcon from '../AppIcon.vue'
import type { DashboardSemanaResponse } from '../../services/adminService'

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
      <h2 class="text-sm font-semibold text-neutral-800">Seu relatório</h2>
      <DashboardWeekNav
        :label="weekLabel"
        :can-go-forward="canGoForward"
        @prev="emit('prevWeek')"
        @next="emit('nextWeek')"
      />
    </div>

    <div v-if="loading" class="flex flex-1 flex-col gap-3" aria-busy="true">
      <div class="h-16 animate-pulse rounded-lg bg-neutral-100" />
    </div>

    <div v-else-if="error" class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <p class="text-sm text-rose-600">{{ error }}</p>
      <button
        type="button"
        class="min-h-[44px] touch-manipulation rounded-lg bg-rose-600 px-4 text-sm font-medium text-white"
        @click="emit('retry')"
      >
        Tentar novamente
      </button>
    </div>

    <div v-else-if="data" class="flex flex-1 flex-col justify-center">
      <div
        class="flex items-start gap-3 rounded-xl border p-4"
        :class="
          data.relatorios.pendentes > 0
            ? 'border-amber-200 bg-amber-50/60'
            : 'border-emerald-200 bg-emerald-50/60'
        "
      >
        <div
          class="flex size-10 shrink-0 items-center justify-center rounded-full"
          :class="data.relatorios.pendentes > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'"
        >
          <AppIcon :name="data.relatorios.pendentes > 0 ? 'calendar' : 'check'" size="sm" />
        </div>
        <div>
          <p class="text-base font-semibold text-neutral-900">
            {{
              data.relatorios.pendentes > 0
                ? LEADER_DASHBOARD_COPY.relatorio.pendente
                : LEADER_DASHBOARD_COPY.relatorio.enviado
            }}
          </p>
          <p class="mt-1 text-sm text-neutral-600">
            {{
              data.relatorios.pendentes > 0
                ? LEADER_DASHBOARD_COPY.relatorio.hintPendente
                : LEADER_DASHBOARD_COPY.relatorio.hintEnviado
            }}
          </p>
        </div>
      </div>
    </div>
  </article>
</template>
