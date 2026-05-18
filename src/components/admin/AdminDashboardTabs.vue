<script setup lang="ts">
import { computed } from 'vue'
import { DASHBOARD_CUIDADO_COPY } from '../../constants/dashboardCuidado'

type TabKey = 'cuidado' | 'indicadores'

const tabActiveClass =
  'bg-primary-500 text-white border-primary-600 shadow-sm'
const tabInactiveClass =
  'bg-neutral-100 text-neutral-700 border-transparent hover:bg-neutral-200'

const props = defineProps<{
  modelValue: TabKey
  semCuidadorBadge: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TabKey]
}>()

const badgeText = computed(() => {
  const n = props.semCuidadorBadge
  if (n <= 0) return ''
  return n > 99 ? '99+' : String(n)
})

function selectTab(t: TabKey) {
  emit('update:modelValue', t)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    selectTab('indicadores')
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    selectTab('cuidado')
  }
}
</script>

<template>
  <div
    class="grid grid-cols-2 gap-2 w-full mb-4"
    role="tablist"
    aria-label="Painel admin"
    @keydown="onKeydown"
  >
    <button
      type="button"
      role="tab"
      id="tab-cuidado"
      :aria-selected="modelValue === 'cuidado'"
      :tabindex="modelValue === 'cuidado' ? 0 : -1"
      class="relative min-h-[48px] rounded-lg text-sm font-medium touch-manipulation motion-reduce:transition-none transition-colors px-2 flex items-center justify-center gap-1.5 border"
      :class="modelValue === 'cuidado' ? tabActiveClass : tabInactiveClass"
      @click="selectTab('cuidado')"
    >
      <span class="text-center leading-tight px-0.5">{{ DASHBOARD_CUIDADO_COPY.tabLabel }}</span>
      <span
        v-if="badgeText"
        class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-primary-700 text-[10px] font-bold flex items-center justify-center border border-primary-200"
        aria-live="polite"
      >
        {{ badgeText }}
      </span>
    </button>

    <button
      type="button"
      role="tab"
      id="tab-indicadores"
      :aria-selected="modelValue === 'indicadores'"
      :tabindex="modelValue === 'indicadores' ? 0 : -1"
      class="relative min-h-[48px] rounded-lg text-sm font-medium touch-manipulation motion-reduce:transition-none transition-colors px-2 flex items-center justify-center border"
      :class="modelValue === 'indicadores' ? tabActiveClass : tabInactiveClass"
      @click="selectTab('indicadores')"
    >
      Indicadores
    </button>
  </div>
</template>
