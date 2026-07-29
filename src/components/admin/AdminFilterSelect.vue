<script setup lang="ts">
import { ADMIN_FILTER_SELECT_CLASS } from '../../constants/adminFilters'

const model = defineModel<string>({ default: '' })

defineProps<{
  id?: string
  ariaLabel: string
}>()

const emit = defineEmits<{
  change: []
}>()
</script>

<template>
  <div class="relative">
    <select
      :id="id"
      v-model="model"
      :class="ADMIN_FILTER_SELECT_CLASS"
      :aria-label="ariaLabel"
      @change="emit('change')"
    >
      <slot />
    </select>
    <div class="pointer-events-none absolute inset-y-0 right-2.5 flex items-center" aria-hidden="true">
      <svg class="size-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  </div>
</template>
