<script setup lang="ts">
import { usePwaInstall } from '../composables/usePwaInstall'

defineProps<{
  aboveBottomNav?: boolean
}>()

const { visible, canPrompt, iosSafari, install, dismiss } = usePwaInstall()

async function onInstall() {
  await install()
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="visible"
      class="pwa-install-banner"
      :class="{ 'pwa-install-banner--above-nav': aboveBottomNav }"
      role="dialog"
      aria-labelledby="pwa-install-title"
    >
      <div class="pwa-install-banner__body">
        <p id="pwa-install-title" class="pwa-install-banner__title">
          Instalar o Aprisco
        </p>

        <template v-if="canPrompt">
          <p class="pwa-install-banner__text">
            Adicione o app à tela inicial para acesso rápido.
          </p>
          <div class="pwa-install-banner__actions">
            <button type="button" class="pwa-install-banner__primary" @click="onInstall">
              Instalar
            </button>
            <button type="button" class="pwa-install-banner__secondary" @click="dismiss">
              Agora não
            </button>
          </div>
        </template>

        <template v-else-if="iosSafari">
          <p class="pwa-install-banner__text">
            Para receber o app na tela inicial:
          </p>
          <ol class="pwa-install-banner__steps">
            <li>Toque em <strong>Compartilhar</strong></li>
            <li>Toque em <strong>Adicionar à Tela de Início</strong></li>
          </ol>
          <div class="pwa-install-banner__actions">
            <button type="button" class="pwa-install-banner__secondary" @click="dismiss">
              Agora não
            </button>
          </div>
        </template>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.pwa-install-banner {
  position: fixed;
  left: 0.75rem;
  right: 0.75rem;
  z-index: 30;
  bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
  pointer-events: none;
}

.pwa-install-banner--above-nav {
  bottom: calc(4.75rem + env(safe-area-inset-bottom, 0px));
}

.pwa-install-banner__body {
  pointer-events: auto;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.12);
  border: 1px solid rgb(229 231 235);
  padding: 0.875rem 1rem;
}

.pwa-install-banner__title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #111827;
}

.pwa-install-banner__text {
  margin: 0.35rem 0 0;
  font-size: 0.8125rem;
  color: #4b5563;
}

.pwa-install-banner__steps {
  margin: 0.5rem 0 0;
  padding-left: 1.15rem;
  font-size: 0.8125rem;
  color: #4b5563;
}

.pwa-install-banner__steps li + li {
  margin-top: 0.2rem;
}

.pwa-install-banner__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.pwa-install-banner__primary,
.pwa-install-banner__secondary {
  border-radius: 0.5rem;
  padding: 0.45rem 0.85rem;
  font-size: 0.8125rem;
  font-weight: 600;
  min-height: 40px;
  touch-action: manipulation;
}

.pwa-install-banner__primary {
  background: #7928fa;
  color: #fff;
  border: none;
}

.pwa-install-banner__primary:hover {
  background: #6d21e3;
}

.pwa-install-banner__secondary {
  background: #fff;
  color: #374151;
  border: 1px solid #d1d5db;
}

.pwa-install-banner__secondary:hover {
  background: #f9fafb;
}
</style>
