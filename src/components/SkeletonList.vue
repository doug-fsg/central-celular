<script setup lang="ts">
defineProps<{
  rows?: number
  showAvatar?: boolean
}>()
</script>

<template>
  <div class="skeleton-list animate-pulse space-y-3" role="status" aria-label="Carregando">
    <div
      v-for="i in (rows ?? 5)"
      :key="i"
      class="flex items-center gap-3 rounded-xl bg-white border border-neutral-100 p-4"
    >
      <div
        v-if="showAvatar !== false"
        class="h-11 w-11 rounded-full bg-neutral-200 flex-shrink-0"
      />
      <div class="flex-1 space-y-2 min-w-0">
        <div class="h-4 bg-neutral-200 rounded w-2/3" />
        <div class="h-3 bg-neutral-200 rounded w-1/2" />
      </div>
    </div>
    <span class="sr-only">Carregando conteúdo…</span>
  </div>
</template>
