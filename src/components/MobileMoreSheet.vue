<script setup lang="ts">
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue'
import AppIcon from './AppIcon.vue'
import type { BottomNavItem } from '../composables/useBottomNav'

defineProps<{
  open: boolean
  items: BottomNavItem[]
}>()

const emit = defineEmits<{
  navigate: [routeName: string]
  close: []
}>()

function select(routeName: string) {
  emit('navigate', routeName)
  emit('close')
}
</script>

<template>
  <TransitionRoot appear :show="open" as="template">
    <Dialog as="div" class="relative z-[55]" @close="emit('close')">
      <TransitionChild
        as="template"
        enter="duration-200 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-150 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden="true" />
      </TransitionChild>

      <div class="fixed inset-0 flex items-end justify-center">
        <TransitionChild
          as="template"
          enter="duration-250 ease-out"
          enter-from="opacity-0 translate-y-8"
          enter-to="opacity-100 translate-y-0"
          leave="duration-200 ease-in"
          leave-from="opacity-100 translate-y-0"
          leave-to="opacity-0 translate-y-8"
        >
          <DialogPanel class="bottom-sheet-panel w-full max-w-lg">
            <div class="bottom-sheet-handle" aria-hidden="true" />
            <DialogTitle as="h3" class="text-lg font-semibold text-gray-900 text-center mb-4">
              Mais opções
            </DialogTitle>

            <ul class="space-y-1">
              <li v-for="item in items" :key="item.name">
                <button
                  type="button"
                  class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left text-gray-800 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  style="min-height: 48px; touch-action: manipulation;"
                  @click="select(item.name)"
                >
                  <AppIcon :name="item.icon" size="md" class="text-primary-600" />
                  <span class="font-medium">{{ item.label }}</span>
                </button>
              </li>
            </ul>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
