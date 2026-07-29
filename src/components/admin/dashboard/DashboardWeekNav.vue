<script setup lang="ts">
defineProps<{
  label: string
  canGoForward: boolean
}>()

const emit = defineEmits<{
  prev: []
  next: []
}>()
</script>

<template>
  <div class="flex items-center gap-2">
    <button
      type="button"
      class="flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 touch-manipulation"
      aria-label="Semana anterior"
      @click="emit('prev')"
    >
      <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    <span class="min-w-0 flex-1 truncate text-center text-sm font-medium text-neutral-700">
      {{ label }}
    </span>
    <button
      type="button"
      class="flex size-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 touch-manipulation disabled:cursor-not-allowed disabled:opacity-40"
      aria-label="Próxima semana"
      :disabled="!canGoForward"
      @click="emit('next')"
    >
      <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
</template>
