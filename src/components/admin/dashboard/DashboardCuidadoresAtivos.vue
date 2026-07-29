<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { DASHBOARD_UNIFIED_COPY } from '../../../constants/dashboardUnified'

defineProps<{
  total: number
  loading: boolean
}>()
</script>

<template>
  <article
    class="flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
    aria-labelledby="cuidadores-heading"
  >
    <h2 id="cuidadores-heading" class="mb-4 text-sm font-semibold text-neutral-800">
      {{ DASHBOARD_UNIFIED_COPY.sections.cuidadores }}
    </h2>

    <div v-if="loading" class="flex flex-1 animate-pulse flex-col justify-center">
      <div class="mb-2 h-10 w-20 rounded bg-neutral-100" />
      <div class="h-4 w-32 rounded bg-neutral-100" />
    </div>

    <div v-else class="flex flex-1 flex-col justify-center">
      <p class="text-4xl font-bold tabular-nums text-neutral-900">{{ total }}</p>
      <p class="mt-2 text-xs text-neutral-500">{{ DASHBOARD_UNIFIED_COPY.cuidadores.hint }}</p>
      <RouterLink
        :to="{ name: 'admin-rede-cuidado' }"
        class="mt-6 inline-flex text-sm font-semibold text-primary-600 hover:text-primary-700"
      >
        {{ DASHBOARD_UNIFIED_COPY.cuidadores.verRede }} →
      </RouterLink>
    </div>
  </article>
</template>
