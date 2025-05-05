<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Navbar from '../components/Navbar.vue'
import { useUserStore } from '../stores/userStore'

const userStore = useUserStore()

// Estado para os dados
const loading = ref(true)
const celulas = ref([])
const lideres = ref([])

// Simulação de carregamento de dados
onMounted(async () => {
  // Simulação de API - substituir por chamada real depois
  setTimeout(() => {
    celulas.value = [
      { id: 1, nome: 'Célula Esperança', lider: 'João Silva', membros: 12, crescimento: 2 },
      { id: 2, nome: 'Célula Vida Nova', lider: 'Maria Souza', membros: 8, crescimento: 1 },
      { id: 3, nome: 'Célula Renascer', lider: 'Pedro Oliveira', membros: 15, crescimento: 3 },
      { id: 4, nome: 'Célula Águias', lider: 'Ana Costa', membros: 10, crescimento: -1 },
      { id: 5, nome: 'Célula Luz', lider: 'Carlos Santos', membros: 7, crescimento: 0 }
    ]

    lideres.value = [
      { id: 1, nome: 'João Silva', celulas: 1, desempenho: 'ótimo', ultimoRelatorio: '12/04/2023' },
      { id: 2, nome: 'Maria Souza', celulas: 1, desempenho: 'bom', ultimoRelatorio: '10/04/2023' },
      { id: 3, nome: 'Pedro Oliveira', celulas: 1, desempenho: 'excelente', ultimoRelatorio: '15/04/2023' },
      { id: 4, nome: 'Ana Costa', celulas: 1, desempenho: 'regular', ultimoRelatorio: '05/04/2023' },
      { id: 5, nome: 'Carlos Santos', celulas: 1, desempenho: 'bom', ultimoRelatorio: '08/04/2023' }
    ]

    loading.value = false
  }, 800)
})

// Função para determinar a cor do indicador de crescimento
function getGrowthColor(value: number) {
  if (value > 0) return 'text-green-600'
  if (value < 0) return 'text-red-600'
  return 'text-gray-600'
}

// Função para determinar o ícone do indicador de crescimento
function getGrowthIcon(value: number) {
  if (value > 0) return '↑'
  if (value < 0) return '↓'
  return '→'
}

// Função para determinar a cor do indicador de desempenho
function getPerformanceColor(value: string) {
  if (value === 'excelente' || value === 'ótimo') return 'bg-green-100 text-green-800'
  if (value === 'bom') return 'bg-blue-100 text-blue-800'
  if (value === 'regular') return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}
</script>

<template>
  <div>
    <Navbar />
    
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 sm:px-0">
        <h1 class="text-2xl font-bold text-gray-900">
          Painel do Supervisor
        </h1>
        <p class="mt-1 text-sm text-gray-600">
          Gerencie e acompanhe suas células e líderes
        </p>
      </div>
      
      <!-- Células da Região -->
      <div class="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
        <div class="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Células da Sua Região
            </h3>
            <p class="mt-1 max-w-2xl text-sm text-gray-500">
              Acompanhe o desempenho das células sob sua supervisão
            </p>
          </div>
          <button class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
            Nova Célula
          </button>
        </div>
        
        <div class="border-t border-gray-200">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Líder
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Membros
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Crescimento
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody v-if="!loading" class="bg-white divide-y divide-gray-200">
                <tr v-for="celula in celulas" :key="celula.id">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="font-medium text-gray-900">{{ celula.nome }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">{{ celula.lider }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ celula.membros }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div :class="getGrowthColor(celula.crescimento)" class="text-sm">
                      {{ getGrowthIcon(celula.crescimento) }} {{ celula.crescimento > 0 ? '+' : '' }}{{ celula.crescimento }}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <a href="#" class="text-primary-600 hover:text-primary-900 mr-3">Detalhes</a>
                    <a href="#" class="text-primary-600 hover:text-primary-900">Relatórios</a>
                  </td>
                </tr>
              </tbody>
              <tbody v-else class="bg-white divide-y divide-gray-200">
                <tr v-for="i in 5" :key="i">
                  <td colspan="5" class="px-6 py-4 whitespace-nowrap">
                    <div class="animate-pulse flex space-x-4">
                      <div class="flex-1 space-y-4 py-1">
                        <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <!-- Líderes da Região -->
      <div class="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
        <div class="px-4 py-5 sm:px-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900">
            Líderes da Sua Região
          </h3>
          <p class="mt-1 max-w-2xl text-sm text-gray-500">
            Acompanhe o desempenho dos seus líderes
          </p>
        </div>
        
        <div class="border-t border-gray-200">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Células
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Desempenho
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último Relatório
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody v-if="!loading" class="bg-white divide-y divide-gray-200">
                <tr v-for="lider in lideres" :key="lider.id">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="font-medium text-gray-900">{{ lider.nome }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ lider.celulas }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span :class="getPerformanceColor(lider.desempenho)" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                      {{ lider.desempenho }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ lider.ultimoRelatorio }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <a href="#" class="text-primary-600 hover:text-primary-900 mr-3">Detalhes</a>
                    <a href="#" class="text-primary-600 hover:text-primary-900">Mensagem</a>
                  </td>
                </tr>
              </tbody>
              <tbody v-else class="bg-white divide-y divide-gray-200">
                <tr v-for="i in 5" :key="i">
                  <td colspan="5" class="px-6 py-4 whitespace-nowrap">
                    <div class="animate-pulse flex space-x-4">
                      <div class="flex-1 space-y-4 py-1">
                        <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  </div>
</template> 