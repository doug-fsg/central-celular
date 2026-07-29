<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '../AppIcon.vue'
import type { AdminFilterChip } from '../../constants/adminFilters'

const search = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    sectionLabel: string
    inputId: string
    placeholder: string
    loading?: boolean
    chips?: AdminFilterChip[]
  }>(),
  {
    loading: false,
    chips: () => [],
  },
)

const emit = defineEmits<{
  'remove-chip': [key: string]
  'clear-all': []
}>()

const hasSearchTerm = computed(() => search.value.trim() !== '')
const hasActiveFilters = computed(() => props.chips.length > 0)
</script>

<template>
  <section
    :aria-label="sectionLabel"
    class="mb-4 overflow-hidden rounded-xl border border-neutral-200/90 bg-white shadow-sm"
  >
    <div class="flex flex-col lg:flex-row lg:items-stretch">
      <div
        class="relative flex min-w-0 flex-1 items-center border-b border-neutral-100 lg:border-b-0 lg:border-r lg:border-neutral-100"
        :aria-busy="loading && hasSearchTerm"
      >
        <AppIcon
          name="search"
          size="sm"
          class="pointer-events-none absolute left-3.5 text-neutral-400"
          aria-hidden="true"
        />
        <input
          :id="inputId"
          v-model="search"
          type="search"
          autocomplete="off"
          spellcheck="false"
          enterkeyhint="search"
          class="h-11 w-full min-w-0 border-0 bg-transparent pl-10 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0"
          :placeholder="placeholder"
        >
        <div class="absolute inset-y-0 right-0 flex items-center pr-3">
          <span
            v-if="loading && hasSearchTerm"
            class="size-4 animate-spin rounded-full border-2 border-neutral-200 border-t-primary-600 motion-reduce:animate-none"
            aria-hidden="true"
          />
          <button
            v-else-if="hasSearchTerm"
            type="button"
            class="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Limpar busca"
            @click="search = ''"
          >
            <AppIcon name="close" size="sm" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        v-if="$slots.filters"
        class="flex flex-wrap items-center gap-2 px-3 py-2.5 lg:shrink-0"
      >
        <slot name="filters" />
      </div>
    </div>

    <div
      v-if="hasActiveFilters"
      class="flex flex-wrap items-center gap-2 border-t border-neutral-100 bg-neutral-50/70 px-3 py-2"
    >
      <span class="text-xs font-medium text-neutral-500">Filtros ativos:</span>
      <button
        v-for="chip in chips"
        :key="chip.key"
        type="button"
        class="inline-flex max-w-[14rem] cursor-pointer items-center gap-1 rounded-full border border-neutral-200 bg-white py-1 pl-2.5 pr-1.5 text-xs font-medium text-neutral-700 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        :aria-label="`Remover filtro ${chip.label}`"
        @click="emit('remove-chip', chip.key)"
      >
        <span class="truncate">{{ chip.label }}</span>
        <AppIcon name="close" size="xs" class="shrink-0 text-neutral-400" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="ml-auto cursor-pointer text-xs font-medium text-primary-600 transition-colors hover:text-primary-700 focus:outline-none focus-visible:underline"
        @click="emit('clear-all')"
      >
        Limpar tudo
      </button>
    </div>
  </section>
</template>
