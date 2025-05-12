<script setup lang="ts">
import { TransitionRoot } from '@headlessui/vue'
import { computed, onMounted, ref } from 'vue'

const props = defineProps<{
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  show: boolean
}>()

const emit = defineEmits(['close'])

const isVisible = ref(props.show)

const bgColor = computed(() => {
  switch (props.type) {
    case 'success':
      return 'bg-green-500'
    case 'error':
      return 'bg-red-500'
    case 'warning':
      return 'bg-yellow-500'
    case 'info':
      return 'bg-blue-500'
    default:
      return 'bg-gray-500'
  }
})

onMounted(() => {
  if (props.duration) {
    setTimeout(() => {
      isVisible.value = false
      emit('close')
    }, props.duration)
  }
})
</script>

<template>
  <TransitionRoot
    enter="transform ease-out duration-300 transition"
    enter-from="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
    enter-to="translate-y-0 opacity-100 sm:translate-x-0"
    leave="transition ease-in duration-100"
    leave-from="opacity-100"
    leave-to="opacity-0"
    :show="show"
  >
    <div
      class="fixed top-4 right-4 z-50 max-w-sm w-full shadow-lg rounded-lg pointer-events-auto"
      :class="bgColor"
    >
      <div class="p-4">
        <div class="flex items-start">
          <div class="ml-3 w-0 flex-1">
            <p class="text-sm font-medium text-white">
              {{ message }}
            </p>
          </div>
          <div class="ml-4 flex-shrink-0 flex">
            <button
              class="inline-flex text-white hover:text-gray-200 focus:outline-none focus:text-gray-200"
              @click="$emit('close')"
            >
              <span class="sr-only">Fechar</span>
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </TransitionRoot>
</template> 