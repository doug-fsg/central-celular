<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import MemberFrequencyModal from '../../components/MemberFrequencyModal.vue'
import { adminService, type MembroCompleto } from '../../services/adminService'
import relatorioService from '../../services/relatorioService'

// Estado para os dados
const loading = ref(false)

// Lista de membros
const members = ref<MembroCompleto[]>([])
const pagination = ref({
  total: 0,
  pages: 0,
  currentPage: 1,
  perPage: 20
})

// Estado para filtros
const searchTerm = ref('')

// Membros filtrados
const filteredMembers = computed(() => {
  if (!searchTerm.value.trim()) {
    return members.value
  }
  const term = searchTerm.value.toLowerCase().trim()
  return members.value.filter(member => 
    member.nome.toLowerCase().includes(term) ||
    (member.telefone || '').includes(term) ||
    (member.celula?.nome || '').toLowerCase().includes(term) ||
    (member.celula?.lider?.nome || '').toLowerCase().includes(term)
  )
})

// Estado do modal de frequência
const showFrequencyModal = ref(false)
const selectedMember = ref<{ id: number; nome: string; celulaId: number } | null>(null)

// Cache de frequências calculadas
const frequenciaCache = ref<Map<number, { celula: number; culto: number; loading: boolean }>>(new Map())

// Mensagens de feedback
const feedbackMessage = ref('')
const feedbackType = ref<'success' | 'error'>('success')

const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
  feedbackMessage.value = message
  feedbackType.value = type
  setTimeout(() => {
    feedbackMessage.value = ''
  }, 3000)
}

// Calcular frequência de um membro
const calcularFrequencia = async (membroId: number, celulaId: number) => {
  // Verificar cache
  if (frequenciaCache.value.has(membroId)) {
    const cached = frequenciaCache.value.get(membroId)!
    if (!cached.loading) {
      return { celula: cached.celula, culto: cached.culto }
    }
  }

  // Marcar como carregando
  frequenciaCache.value.set(membroId, { celula: 0, culto: 0, loading: true })

  try {
    const data = await relatorioService.obterFrequenciaMembro(membroId, celulaId)
    
    // Calcular % de presença (últimos 4 relatórios)
    let presentesCelula = 0
    let presentesCulto = 0
    const total = Math.min(data.length, 4) // Máximo 4 relatórios

    data.slice(0, 4).forEach(item => {
      if (item.presenteCelula) presentesCelula++
      if (item.presenteCulto) presentesCulto++
    })

    const percentualCelula = total > 0 ? Math.round((presentesCelula / total) * 100) : 0
    const percentualCulto = total > 0 ? Math.round((presentesCulto / total) * 100) : 0

    // Atualizar cache
    frequenciaCache.value.set(membroId, { 
      celula: percentualCelula, 
      culto: percentualCulto, 
      loading: false 
    })

    return { celula: percentualCelula, culto: percentualCulto }
  } catch (error) {
    console.error('Erro ao calcular frequência:', error)
    frequenciaCache.value.set(membroId, { celula: 0, culto: 0, loading: false })
    return { celula: 0, culto: 0 }
  }
}

// Obter frequência do cache ou calcular
const getFrequencia = (membroId: number, celulaId: number) => {
  const cached = frequenciaCache.value.get(membroId)
  if (cached) {
    if (!cached.loading) {
      return cached
    }
    // Já está carregando, retornar estado de loading
    return cached
  }
  // Não está no cache, calcular em background
  calcularFrequencia(membroId, celulaId)
  return { celula: 0, culto: 0, loading: true }
}

// Carregar membros
const loadMembers = async (page: number = 1) => {
  try {
    loading.value = true
    const response = await adminService.listarMembros(page, 20)
    
    if (!response || typeof response !== 'object') {
      showFeedback('Resposta inválida do servidor', 'error')
      return
    }

    if (!response.membros || !Array.isArray(response.membros)) {
      showFeedback('Formato de resposta inválido', 'error')
      return
    }

    members.value = response.membros
    pagination.value = response.pagination

    // Calcular frequências em background para os membros da página atual
    members.value.forEach(member => {
      if (!frequenciaCache.value.has(member.id)) {
        calcularFrequencia(member.id, member.celulaId)
      }
    })
  } catch (error) {
    console.error('Erro ao carregar membros:', error)
    showFeedback('Erro ao carregar membros', 'error')
  } finally {
    loading.value = false
  }
}

// Abrir modal de frequência
const handleVerMembro = (member: MembroCompleto) => {
  selectedMember.value = {
    id: member.id,
    nome: member.nome,
    celulaId: member.celulaId
  }
  showFrequencyModal.value = true
}

// Mudar página
const handlePageChange = (page: number) => {
  loadMembers(page)
}

// Carregar dados ao montar
onMounted(() => {
  loadMembers()
})
</script>

<template>
  <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-neutral-800">Membros</h1>
        <p class="mt-1 text-xs sm:text-sm text-neutral-500">Gerencie membros do sistema</p>
      </div>
    </div>

    <!-- Filtros -->
    <div class="bg-white shadow-sm rounded-xl border border-gray-100 p-4 sm:p-5 mb-4">
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          id="search"
          v-model="searchTerm"
          class="block w-full pl-12 pr-11 py-3 text-sm sm:text-base border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 placeholder:text-gray-400 text-gray-900"
          placeholder="Buscar membros por nome, telefone, célula ou líder..."
        >
        <button
          v-if="searchTerm"
          @click="searchTerm = ''"
          type="button"
          class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 active:text-gray-700 transition-colors touch-manipulation"
          aria-label="Limpar busca"
        >
          <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      <!-- Contador de resultados -->
      <div v-if="searchTerm && filteredMembers.length > 0" class="mt-3 text-xs sm:text-sm text-gray-600 flex items-center gap-1.5">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ filteredMembers.length }} {{ filteredMembers.length === 1 ? 'membro encontrado' : 'membros encontrados' }}</span>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <div v-else-if="filteredMembers.length === 0" class="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden p-8 sm:p-12">
      <div class="text-center">
        <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
          <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="text-base sm:text-lg font-semibold text-gray-900 mb-2">
          {{ searchTerm ? 'Nenhum membro encontrado' : 'Nenhum membro cadastrado' }}
        </h3>
        <p class="text-sm sm:text-base text-gray-500 max-w-sm mx-auto">
          {{ searchTerm 
            ? `Não encontramos membros que correspondam a "${searchTerm}". Tente buscar com outros termos.` 
            : 'Comece criando células e adicionando membros a elas.' }}
        </p>
        <button
          v-if="searchTerm"
          @click="searchTerm = ''"
          class="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 active:text-primary-800 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Limpar busca
        </button>
      </div>
    </div>

    <div v-else class="bg-white shadow overflow-hidden sm:rounded-lg">
      <!-- Lista mobile -->
      <div class="sm:hidden space-y-2.5 p-3">
        <div
          v-for="member in filteredMembers"
          :key="member.id"
          @click="handleVerMembro(member)"
          class="relative border border-gray-200 rounded-xl px-4 py-3 shadow-md bg-white cursor-pointer transition-all duration-200 active:scale-[0.98] active:shadow-lg active:bg-blue-50 active:border-primary-300 group touch-manipulation"
          style="-webkit-tap-highlight-color: rgba(59, 130, 246, 0.1);"
        >
          <!-- Indicador visual de clicável -->
          <div class="absolute top-2.5 right-3 flex items-center justify-center w-7 h-7 rounded-full bg-primary-50 group-active:bg-primary-100 transition-colors">
            <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          
          <div class="flex items-start justify-between mb-2 pr-10">
            <div class="flex-1 min-w-0">
              <div class="flex items-center mb-0.5">
                <p class="text-sm font-semibold text-gray-900 group-active:text-primary-700 transition-colors truncate">{{ member.nome }}</p>
              </div>
              <p class="text-xs font-medium text-gray-700 truncate">{{ member.celula?.nome || 'Sem célula' }}</p>
            </div>
          </div>
          
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-1.5 text-xs text-gray-600">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{{ member.celula?.lider?.nome || 'Sem líder' }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500">Célula:</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" :class="getFrequencia(member.id, member.celulaId).loading ? 'bg-gray-100 text-gray-500' : (getFrequencia(member.id, member.celulaId).celula >= 75 ? 'bg-green-100 text-green-700' : getFrequencia(member.id, member.celulaId).celula >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')">
                {{ getFrequencia(member.id, member.celulaId).loading ? '...' : `${getFrequencia(member.id, member.celulaId).celula}%` }}
              </span>
              <span class="text-xs text-gray-500">Culto:</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" :class="getFrequencia(member.id, member.celulaId).loading ? 'bg-gray-100 text-gray-500' : (getFrequencia(member.id, member.celulaId).culto >= 75 ? 'bg-green-100 text-green-700' : getFrequencia(member.id, member.celulaId).culto >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')">
                {{ getFrequencia(member.id, member.celulaId).loading ? '...' : `${getFrequencia(member.id, member.celulaId).culto}%` }}
              </span>
            </div>
          </div>
          
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span v-if="member.ehConsolidador" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              Consolidador
            </span>
            <span v-if="member.ehCoLider" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
              Co-líder
            </span>
            <span v-if="member.ehAnfitriao" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              Anfitrião
            </span>
          </div>
        </div>
      </div>
      
      <!-- Lista desktop -->
      <div class="hidden sm:block overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Célula
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Líder
              </th>
              <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Frequência Célula
              </th>
              <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Frequência Culto
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr 
              v-for="member in filteredMembers" 
              :key="member.id"
              @click="handleVerMembro(member)"
              class="cursor-pointer transition-all duration-200 hover:bg-blue-50 hover:shadow-sm hover:border-l-4 hover:border-l-primary-500 group"
            >
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 group-hover:text-primary-700 transition-colors">
                {{ member.nome }}
                <span class="ml-2 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity inline-block">
                  →
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                {{ member.celula?.nome || '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                {{ member.celula?.lider?.nome || '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="getFrequencia(member.id, member.celulaId).loading ? 'bg-gray-100 text-gray-500' : (getFrequencia(member.id, member.celulaId).celula >= 75 ? 'bg-green-100 text-green-800' : getFrequencia(member.id, member.celulaId).celula >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800')">
                  {{ getFrequencia(member.id, member.celulaId).loading ? '...' : `${getFrequencia(member.id, member.celulaId).celula}%` }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="getFrequencia(member.id, member.celulaId).loading ? 'bg-gray-100 text-gray-500' : (getFrequencia(member.id, member.celulaId).culto >= 75 ? 'bg-green-100 text-green-800' : getFrequencia(member.id, member.celulaId).culto >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800')">
                  {{ getFrequencia(member.id, member.celulaId).loading ? '...' : `${getFrequencia(member.id, member.celulaId).culto}%` }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <div class="flex flex-wrap gap-1">
                  <span v-if="member.ehConsolidador" class="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                    Consolidador
                  </span>
                  <span v-if="member.ehCoLider" class="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                    Co-líder
                  </span>
                  <span v-if="member.ehAnfitriao" class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Anfitrião
                  </span>
                  <span v-if="!member.ativo" class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                    Inativo
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginação -->
      <div v-if="pagination.pages > 1" class="mt-4 flex justify-center">
        <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
          <button
            v-for="page in pagination.pages"
            :key="page"
            @click="handlePageChange(page)"
            :class="[
              'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
              page === pagination.currentPage
                ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
            ]"
          >
            {{ page }}
          </button>
        </nav>
      </div>
    </div>

    <!-- Mensagem de feedback -->
    <div
      v-if="feedbackMessage"
      :class="[
        'fixed top-4 right-4 px-4 py-2 rounded-md z-50',
        feedbackType === 'success' ? 'bg-green-500' : 'bg-red-500',
        'text-white'
      ]"
    >
      {{ feedbackMessage }}
    </div>

    <!-- Modal de frequência do membro -->
    <MemberFrequencyModal
      :is-open="showFrequencyModal"
      :membro-id="selectedMember?.id || null"
      :membro-nome="selectedMember?.nome || ''"
      :celula-id="selectedMember?.celulaId || null"
      @close="showFrequencyModal = false"
    />
  </main>
</template>

