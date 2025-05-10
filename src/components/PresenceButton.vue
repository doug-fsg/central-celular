<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  type: 'culto' | 'celula'
  active?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  active: false,
  disabled: false
})

const emit = defineEmits<{
  (e: 'click'): void
}>()

const buttonClasses = computed(() => {
  const baseClasses = 'inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200'
  const activeClasses = 'bg-blue-500 text-white hover:bg-blue-600'
  const inactiveClasses = 'bg-gray-50 text-gray-700 hover:bg-gray-100'
  const disabledClasses = 'opacity-50 cursor-not-allowed'

  return [
    baseClasses,
    props.active ? activeClasses : inactiveClasses,
    props.disabled ? disabledClasses : ''
  ].join(' ')
})

const icon = computed(() => {
  if (props.type === 'culto') {
    return '✝️'
  }
  return '🏠'
})

const label = computed(() => {
  return props.type === 'culto' ? 'Culto' : 'Célula'
})
</script>

<template>
  <button 
    :class="buttonClasses"
    @click="emit('click')"
    :disabled="disabled"
  >
    <span class="mr-2">{{ icon }}</span>
    {{ label }}
  </button>
</template> 