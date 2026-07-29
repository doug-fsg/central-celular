<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import ConfettiGenerator from 'confetti-js'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let confetti: ConfettiGenerator | null = null
let canvasId = ''

function startConfetti() {
  if (!canvasRef.value || confetti) return
  canvasId = `success-confetti-${Date.now()}`
  canvasRef.value.id = canvasId
  confetti = new ConfettiGenerator({
    target: canvasId,
    max: 120,
    size: 2,
    animate: true,
    props: ['circle', 'square', 'triangle', 'line'],
    colors: [[165, 104, 246], [230, 61, 135], [0, 199, 228], [253, 214, 126]],
    clock: 25,
    rotate: true,
    respawn: true,
  })
  confetti.render()
}

function stopConfetti() {
  confetti?.clear()
  confetti = null
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      requestAnimationFrame(startConfetti)
    } else {
      stopConfetti()
    }
  },
  { immediate: true }
)

onUnmounted(stopConfetti)
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="success-title"
      >
        <canvas
          ref="canvasRef"
          class="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        />

        <div class="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
          <div class="text-5xl mb-3" aria-hidden="true">🎉</div>
          <h2 id="success-title" class="text-xl font-bold text-gray-900">Relatório enviado!</h2>
          <p class="mt-2 text-sm text-gray-600">Obrigado por manter seus relatórios em dia.</p>
          <button
            type="button"
            class="mt-6 w-full rounded-xl bg-primary-600 py-3 font-semibold text-white active:scale-[0.98] transition-transform"
            @click="emit('close')"
          >
            Fechar
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
