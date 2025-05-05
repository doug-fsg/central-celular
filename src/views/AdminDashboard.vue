<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Navbar from '../components/Navbar.vue'
import { useUserStore } from '../stores/userStore'

const userStore = useUserStore()

// Estado para os dados
const loading = ref(true)
const stats = ref({
  totalCelulas: 0,
  totalMembros: 0,
  mediaCrescimento: 0,
  celulasAtivas: 0
})

// Simulação de carregamento de dados
onMounted(async () => {
  // Simulação de API - substituir por chamada real depois
  setTimeout(() => {
    stats.value = {
      totalCelulas: 24,
      totalMembros: 187,
      mediaCrescimento: 5.2,
      celulasAtivas: 22
    }
    loading.value = false
  }, 800)
})
</script>

<template>
  <div>
    <Navbar />
    
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 sm:px-0">
        <h1 class="text-2xl font-bold text-gray-900">
          Painel Administrativo
        </h1>
        <p class="mt-1 text-sm text-gray-600">
          Visão geral de toda a estrutura de células
        </p>
      </div>
      
      <!-- Estatísticas -->
      <div class="mt-6">
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <!-- Carregando -->
          <div v-if="loading" v-for="i in 4" :key="i" class="bg-white overflow-hidden shadow rounded-lg p-5">
            <div class="animate-pulse flex space-x-4">
              <div class="flex-1 space-y-4 py-1">
                <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                <div class="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
          
          <!-- Dados carregados -->
          <template v-else>
            <!-- Total de células -->
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0 bg-primary-100 rounded-md p-3">
                    <svg class="h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <div class="text-sm font-medium text-gray-500 truncate">
                      Total de Células
                    </div>
                    <div class="mt-1 text-3xl font-semibold text-gray-900">
                      {{ stats.totalCelulas }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Células ativas -->
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0 bg-green-100 rounded-md p-3">
                    <svg class="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <div class="text-sm font-medium text-gray-500 truncate">
                      Células Ativas
                    </div>
                    <div class="mt-1 text-3xl font-semibold text-gray-900">
                      {{ stats.celulasAtivas }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Total de membros -->
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0 bg-blue-100 rounded-md p-3">
                    <svg class="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <div class="text-sm font-medium text-gray-500 truncate">
                      Total de Membros
                    </div>
                    <div class="mt-1 text-3xl font-semibold text-gray-900">
                      {{ stats.totalMembros }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Média de crescimento -->
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="px-4 py-5 sm:p-6">
                <div class="flex items-center">
                  <div class="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                    <svg class="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <div class="text-sm font-medium text-gray-500 truncate">
                      Crescimento Médio
                    </div>
                    <div class="mt-1 text-3xl font-semibold text-gray-900">
                      {{ stats.mediaCrescimento }}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
      
      <!-- Ações administrativas -->
      <div class="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
        <div class="px-4 py-5 sm:px-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900">
            Ações Administrativas
          </h3>
          <p class="mt-1 max-w-2xl text-sm text-gray-500">
            Gerencie usuários, células e configurações
          </p>
        </div>
        <div class="border-t border-gray-200">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
            <div class="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200">
              <h4 class="text-lg font-medium text-gray-900 mb-2">Gerenciar Usuários</h4>
              <p class="text-sm text-gray-500 mb-4">Adicione, edite ou desative usuários no sistema</p>
              <button class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Acessar
              </button>
            </div>
            
            <div class="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200">
              <h4 class="text-lg font-medium text-gray-900 mb-2">Gerenciar Células</h4>
              <p class="text-sm text-gray-500 mb-4">Criar novas células ou organizar a estrutura existente</p>
              <button class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Acessar
              </button>
            </div>
            
            <div class="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow duration-200">
              <h4 class="text-lg font-medium text-gray-900 mb-2">Relatórios Gerais</h4>
              <p class="text-sm text-gray-500 mb-4">Visualize estatísticas e relatórios de toda a igreja</p>
              <button class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Acessar
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template> 