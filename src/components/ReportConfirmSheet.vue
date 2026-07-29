<script setup lang="ts">
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue'

defineProps<{
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
}>()

defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <TransitionRoot appear :show="open" as="template">
    <Dialog as="div" class="relative z-[60]" @close="$emit('cancel')">
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

      <div class="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4">
        <TransitionChild
          as="template"
          enter="duration-250 ease-out"
          enter-from="opacity-0 translate-y-8 sm:translate-y-4 sm:scale-95"
          enter-to="opacity-100 translate-y-0 sm:scale-100"
          leave="duration-200 ease-in"
          leave-from="opacity-100 translate-y-0 sm:scale-100"
          leave-to="opacity-0 translate-y-8 sm:translate-y-4 sm:scale-95"
        >
          <DialogPanel class="bottom-sheet-panel w-full sm:max-w-md">
            <div class="bottom-sheet-handle" aria-hidden="true" />

            <DialogTitle as="h3" class="text-lg font-semibold text-gray-900 text-center">
              {{ title }}
            </DialogTitle>

            <p v-if="description" class="mt-2 text-sm text-gray-600 text-center">
              {{ description }}
            </p>

            <div class="mt-6 flex flex-col gap-3">
              <button
                type="button"
                class="w-full py-3.5 rounded-xl bg-primary-600 text-white font-semibold text-base active:scale-[0.98] transition-transform disabled:opacity-60"
                :disabled="loading"
                @click="$emit('confirm')"
              >
                <span
                  v-if="loading"
                  class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white mr-2 align-middle"
                />
                {{ confirmLabel ?? 'Confirmar' }}
              </button>
              <button
                type="button"
                class="w-full py-3.5 rounded-xl bg-gray-100 text-gray-700 font-medium text-base active:scale-[0.98] transition-transform"
                :disabled="loading"
                @click="$emit('cancel')"
              >
                {{ cancelLabel ?? 'Cancelar' }}
              </button>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
