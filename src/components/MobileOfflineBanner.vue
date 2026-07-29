<script setup lang="ts">
import { useNetworkStatus } from '../composables/useNetworkStatus'
import { usePlatform } from '../composables/usePlatform'

const { isOnline } = useNetworkStatus()
const { mobileShell } = usePlatform()
</script>

<template>
  <Transition name="fade">
    <div
      v-if="!isOnline"
      class="mobile-offline-banner"
      :class="{ 'mobile-offline-banner--shell': mobileShell }"
      role="alert"
    >
      <span class="mobile-offline-banner__dot" aria-hidden="true" />
      Sem conexão — algumas ações podem falhar até a internet voltar.
    </div>
  </Transition>
</template>
