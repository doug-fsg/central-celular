<script setup lang="ts">
import type { SortDirection } from '../../utils/tableSort'

defineProps<{
  label: string
  sortKey: string
  activeKey: string | null
  direction: SortDirection
}>()

const emit = defineEmits<{
  sort: [key: string]
}>()
</script>

<template>
  <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
    <button
      type="button"
      class="group inline-flex items-center gap-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      :class="activeKey === sortKey ? 'text-primary-700' : 'text-gray-500 hover:text-gray-800'"
      :title="activeKey === sortKey ? 'Clique para inverter; clique de novo para remover ordenação' : 'Ordenar coluna'"
      @click="emit('sort', sortKey)"
    >
      <span>{{ label }}</span>
      <span class="inline-flex flex-col -space-y-1" aria-hidden="true">
        <svg
          class="h-2.5 w-2.5"
          :class="activeKey === sortKey && direction === 'asc' ? 'text-primary-600' : 'text-gray-300 group-hover:text-gray-400'"
          viewBox="0 0 10 6"
          fill="currentColor"
        >
          <path d="M5 0L9.33 5H0.67L5 0Z" />
        </svg>
        <svg
          class="h-2.5 w-2.5"
          :class="activeKey === sortKey && direction === 'desc' ? 'text-primary-600' : 'text-gray-300 group-hover:text-gray-400'"
          viewBox="0 0 10 6"
          fill="currentColor"
        >
          <path d="M5 6L0.67 1H9.33L5 6Z" />
        </svg>
      </span>
      <span v-if="activeKey === sortKey" class="sr-only">
        ordenado {{ direction === 'asc' ? 'crescente' : 'decrescente' }}
      </span>
    </button>
  </th>
</template>
