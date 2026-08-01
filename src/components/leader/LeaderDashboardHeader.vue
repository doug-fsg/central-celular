<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '../../stores/userStore'
import { LEADER_DASHBOARD_COPY, dashboardTimeGreeting } from '../../constants/leaderDashboard'

const userStore = useUserStore()

const greeting = computed(() => {
  const nome = userStore.user?.nome?.split(' ')[0] ?? 'Líder'
  return LEADER_DASHBOARD_COPY.greeting(dashboardTimeGreeting(), nome)
})
</script>

<template>
  <header class="mb-6 flex flex-col gap-1">
    <h1 class="text-2xl font-bold tracking-tight text-neutral-900 sm:text-[1.75rem]">
      {{ greeting }}
    </h1>
    <p class="text-sm text-neutral-500">{{ LEADER_DASHBOARD_COPY.pageSubtitle }}</p>
  </header>
</template>
