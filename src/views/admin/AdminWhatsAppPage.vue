<script setup lang="ts">
import { ref, onMounted } from 'vue'
import WhatsAppConnections from '../../components/WhatsAppConnections.vue'

const whatsappRef = ref<any>(null)

onMounted(() => {
  // Verificar conexões do WhatsApp quando a página for carregada
  setTimeout(() => {
    if (whatsappRef.value && typeof whatsappRef.value.checkActiveConnection === 'function') {
      whatsappRef.value.checkActiveConnection()
    }
  }, 100)
})
</script>

<template>
  <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
    <div class="mb-6">
      <h1 class="text-xl sm:text-2xl font-bold text-neutral-800">Conexões WhatsApp</h1>
      <p class="mt-1 text-xs sm:text-sm text-neutral-500">Gerencie conexões WhatsApp do sistema</p>
    </div>
    <WhatsAppConnections ref="whatsappRef" />
  </main>
</template>

