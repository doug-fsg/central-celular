<script setup lang="ts">
import type { Usuario } from '../../services/adminService'

defineProps<{
  modelValue: string
  leaders: Usuario[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="w-full mb-4">
    <label class="block text-xs text-neutral-600 mb-2 font-medium">Líder</label>
    <div class="flex items-center gap-2 min-w-0">
      <div class="relative min-w-0 flex-1">
        <select
          :value="modelValue"
          class="w-full min-h-[48px] min-w-0 px-3 py-2.5 pr-9 text-base sm:text-sm border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-neutral-700 appearance-none cursor-pointer touch-manipulation"
          @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">Todos os líderes</option>
          <option v-for="l in leaders" :key="l.id" :value="String(l.id)">{{ l.nome }}</option>
        </select>
        <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg class="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      <button
        v-if="modelValue"
        type="button"
        class="flex-shrink-0 min-h-[48px] min-w-[48px] rounded-xl border border-neutral-200 text-neutral-500 hover:bg-neutral-50 active:bg-neutral-100 touch-manipulation"
        aria-label="Limpar filtro de líder"
        @click="emit('update:modelValue', '')"
      >
        <svg class="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>
