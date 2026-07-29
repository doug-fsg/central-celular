<script setup lang="ts">
defineProps<{
  count?: number
}>()
</script>

<template>
  <div
    class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 animate-pulse"
    role="status"
    aria-label="Carregando estatísticas"
  >
    <div
      v-for="i in (count ?? 4)"
      :key="i"
      class="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5 space-y-3"
    >
      <div class="h-3 bg-neutral-200 rounded w-1/2" />
      <div class="h-8 bg-neutral-200 rounded w-1/3" />
    </div>
    <span class="sr-only">Carregando estatísticas…</span>
  </div>
</template>
