<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '../../../stores/userStore'
import {
  DASHBOARD_UNIFIED_COPY,
  dashboardTimeGreeting,
} from '../../../constants/dashboardUnified'
import type { Usuario } from '../../../services/adminService'

defineProps<{
  leaderFilterId: string
  leaders: Usuario[]
}>()

const emit = defineEmits<{
  'update:leaderFilterId': [value: string]
}>()

const userStore = useUserStore()

const greeting = computed(() => {
  const nome = userStore.user?.nome?.split(' ')[0] ?? 'Pastor'
  return DASHBOARD_UNIFIED_COPY.greeting(dashboardTimeGreeting(), nome)
})
</script>

<template>
  <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div class="min-w-0 flex-1">
      <h1 class="text-2xl font-bold tracking-tight text-neutral-900 sm:text-[1.75rem]">
        {{ greeting }}
      </h1>
      <p class="mt-1 text-sm text-neutral-500">{{ DASHBOARD_UNIFIED_COPY.pageSubtitle }}</p>
    </div>

    <div class="relative shrink-0 sm:min-w-[180px]">
      <select
        :value="leaderFilterId"
        class="w-full appearance-none rounded-lg border-0 bg-neutral-100/80 py-2 pl-3 pr-8 text-sm text-neutral-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 touch-manipulation"
        @change="emit('update:leaderFilterId', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">{{ DASHBOARD_UNIFIED_COPY.leaderFilter }}</option>
        <option v-for="l in leaders" :key="l.id" :value="String(l.id)">{{ l.nome }}</option>
      </select>
      <div class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400">
        <svg class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  </header>
</template>
