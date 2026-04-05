<script setup lang="ts">
defineProps<{
  lines?: number
  showAvatar?: boolean
}>()
</script>

<template>
  <div class="animate-pulse">
    <div class="bg-white rounded-xl shadow-soft p-5 space-y-3">
      <div v-if="showAvatar" class="flex items-center space-x-3">
        <div class="rounded-full bg-neutral-200 h-9 w-9 flex-shrink-0"></div>
        <div class="flex-1 space-y-2">
          <div class="h-3 bg-neutral-200 rounded w-1/2"></div>
          <div class="h-3 bg-neutral-200 rounded w-1/3"></div>
        </div>
      </div>
      <div v-else class="h-4 bg-neutral-200 rounded w-1/3"></div>
      <div v-for="i in (lines ?? 3)" :key="i" class="h-3 bg-neutral-200 rounded" :class="i % 2 === 0 ? 'w-4/5' : 'w-full'"></div>
    </div>
  </div>
</template>
