<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMemberStore } from '../stores/memberStore'
import AppIcon from '../components/AppIcon.vue'
import RedeCuidadoPanel from '../components/RedeCuidadoPanel.vue'

const router = useRouter()
const memberStore = useMemberStore()

onMounted(async () => {
  await memberStore.carregarMembros()
})
</script>

<template>
  <div class="min-h-screen bg-neutral-50">
    <main class="container-layout">
      <div class="flex items-center gap-3 mb-5">
        <button
          type="button"
          @click="router.back()"
          class="p-2 rounded-full bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100 transition-colors"
          aria-label="Voltar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 class="text-xl font-bold text-neutral-800">Rede de Cuidado</h1>
          <p v-if="memberStore.celulaId && !memberStore.loading" class="text-xs text-neutral-500 mt-0.5">
            Sua célula
          </p>
        </div>
      </div>

      <div v-if="memberStore.loading" class="text-center py-12">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500 mx-auto"></div>
        <p class="mt-4 text-sm text-neutral-600">Carregando sua célula...</p>
      </div>

      <RedeCuidadoPanel v-else-if="memberStore.celulaId" :celula-id="memberStore.celulaId" />

      <div v-else class="card p-5 text-center">
        <AppIcon name="warning" size="lg" class="mx-auto text-amber-500 mb-3" />
        <p class="text-sm font-medium text-neutral-800">Não foi possível carregar sua célula</p>
        <p v-if="memberStore.error" class="text-xs text-neutral-600 mt-2">{{ memberStore.error }}</p>
        <p v-else class="text-xs text-neutral-600 mt-2">
          Você precisa ser líder de uma célula ativa ou abrir a rede a partir de <strong>Minha Célula</strong>.
        </p>
        <button
          type="button"
          @click="router.push({ name: 'minha-celula' })"
          class="mt-4 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
        >
          Ir para Minha Célula
        </button>
      </div>
    </main>
  </div>
</template>
