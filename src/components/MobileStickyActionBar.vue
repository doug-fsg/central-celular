<script setup lang="ts">
defineProps<{
  label: string
  disabled?: boolean
  loading?: boolean
  hint?: string
  progressLabel?: string
  progressPercent?: number
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <div class="mobile-sticky-action-bar" role="region" aria-label="Ações principais">
    <div v-if="progressLabel || progressPercent !== undefined" class="mobile-sticky-action-bar__progress">
      <div class="flex items-center justify-between text-xs text-gray-600 mb-1.5">
        <span>{{ progressLabel }}</span>
        <span v-if="progressPercent !== undefined">{{ progressPercent }}%</span>
      </div>
      <div class="h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          class="h-full rounded-full bg-primary-500 transition-all duration-300"
          :style="{ width: `${Math.min(100, Math.max(0, progressPercent ?? 0))}%` }"
        />
      </div>
    </div>

    <p v-if="hint" class="text-xs text-center text-gray-500 mb-2">{{ hint }}</p>

    <button
      type="button"
      class="mobile-sticky-action-bar__button"
      :disabled="disabled || loading"
      @click="$emit('click')"
    >
      <span
        v-if="loading"
        class="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white mr-2"
        aria-hidden="true"
      />
      {{ label }}
    </button>
  </div>
</template>
