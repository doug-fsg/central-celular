<script setup lang="ts">
import { ref } from 'vue'
import { usePushPrompt } from '../composables/usePushPrompt'
import { usePushNotifications } from '../composables/usePushNotifications'

defineProps<{
  aboveBottomNav?: boolean
}>()

const { visible, scenario, dismiss } = usePushPrompt()
const { enablePush } = usePushNotifications()
const activating = ref(false)

async function onEnable() {
  activating.value = true
  try {
    await enablePush()
  } finally {
    activating.value = false
    dismiss()
  }
}
</script>

<template>
  <Transition name="push-prompt">
    <div
      v-if="visible"
      class="push-prompt"
      :class="{ 'push-prompt--above-nav': aboveBottomNav }"
      role="dialog"
      aria-labelledby="push-prompt-title"
    >
      <div class="push-prompt__body">
        <div class="push-prompt__icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>

        <div class="push-prompt__content">
          <p id="push-prompt-title" class="push-prompt__title">
            Fique por dentro da sua célula
          </p>

          <!-- Web / Android native -->
          <template v-if="scenario === 'web' || scenario === 'android-native'">
            <p class="push-prompt__text">
              Receba lembretes de reunião e avisos importantes do seu líder.
            </p>
            <div class="push-prompt__actions">
              <button
                type="button"
                class="push-prompt__primary"
                :disabled="activating"
                @click="onEnable"
              >
                {{ activating ? 'Ativando…' : 'Ativar notificações' }}
              </button>
              <button type="button" class="push-prompt__secondary" @click="dismiss">
                Agora não
              </button>
            </div>
          </template>

          <!-- iOS browser — precisa instalar PWA -->
          <template v-else-if="scenario === 'ios-install'">
            <p class="push-prompt__text">
              Instale o Aprisco na tela inicial para receber notificações da sua célula.
            </p>
            <div class="push-prompt__actions">
              <button type="button" class="push-prompt__secondary" @click="dismiss">
                Entendi
              </button>
            </div>
          </template>
        </div>

        <button
          type="button"
          class="push-prompt__close"
          aria-label="Fechar"
          @click="dismiss"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.push-prompt {
  position: fixed;
  left: 0.75rem;
  right: 0.75rem;
  z-index: 30;
  bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
  pointer-events: none;
}

.push-prompt--above-nav {
  bottom: calc(4.75rem + env(safe-area-inset-bottom, 0px));
}

.push-prompt__body {
  pointer-events: auto;
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  border-radius: 0.875rem;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.14);
  border: 1px solid rgb(229 231 235);
  padding: 0.875rem 1rem;
  backdrop-filter: blur(8px);
}

.push-prompt__icon {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.625rem;
  background: #eff6ff;
  color: #2563eb;
}

.push-prompt__content {
  flex: 1;
  min-width: 0;
}

.push-prompt__title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111827;
}

.push-prompt__text {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: #4b5563;
}

.push-prompt__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.625rem;
}

.push-prompt__primary,
.push-prompt__secondary {
  border-radius: 0.5rem;
  padding: 0.45rem 0.85rem;
  font-size: 0.8125rem;
  font-weight: 600;
  min-height: 40px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.push-prompt__primary {
  background: #2563eb;
  color: #fff;
  border: none;
}

.push-prompt__primary:hover {
  background: #1d4ed8;
}

.push-prompt__primary:disabled {
  opacity: 0.6;
}

.push-prompt__secondary {
  background: #fff;
  color: #374151;
  border: 1px solid #d1d5db;
}

.push-prompt__secondary:hover {
  background: #f9fafb;
}

.push-prompt__close {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  touch-action: manipulation;
}

.push-prompt__close:hover {
  background: #f3f4f6;
  color: #6b7280;
}

/* Transition */
.push-prompt-enter-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.push-prompt-leave-active {
  transition: all 0.2s ease-in;
}

.push-prompt-enter-from {
  opacity: 0;
  transform: translateY(1rem);
}

.push-prompt-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}
</style>
