<script setup lang="ts">
import { ref, computed } from 'vue'
import CellModal from '../../components/CellModal.vue'
import CellMembersModal from '../../components/CellMembersModal.vue'
import { adminService } from '../../services/adminService'
import type { Celula, Usuario } from '../../services/adminService'

// Estado para os dados
const loading = ref(false)

// Lista de células
const cells = ref<Celula[]>([])
const cellPagination = ref({
  total: 0,
  pages: 0,
  currentPage: 1,
  perPage: 10
})

// Estado do modal de célula
const showCellModal = ref(false)
const selectedCell = ref<Partial<Celula> | undefined>(undefined)
const isLoadingCell = ref(false)
const showCellMembersModal = ref(false)
const selectedCellForMembers = ref<{ id: number, nome: string } | null>(null)

// Lista de líderes disponíveis
const availableLeaders = ref<Usuario[]>([])

// Estado para filtros de células
const cellFilters = ref({
  searchTerm: ''
})

// Células filtradas
const filteredCells = computed(() => {
  let filtered = [...cells.value]
  
  if (cellFilters.value.searchTerm) {
    const searchTerm = cellFilters.value.searchTerm.toLowerCase()
    filtered = filtered.filter(cell => 
      cell.nome.toLowerCase().includes(searchTerm) ||
      (cell.endereco || '').toLowerCase().includes(searchTerm) ||
      (cell.lider?.nome || '').toLowerCase().includes(searchTerm) ||
      (cell.supervisor?.nome || '').toLowerCase().includes(searchTerm)
    )
  }
  
  return filtered
})

// Mensagens de feedback
const feedbackMessage = ref('')
const feedbackType = ref<'success' | 'error'>('success')

// Confirmação de exclusão
const showDeleteConfirm = ref(false)
const showTextConfirm = ref(false)
const confirmText = ref('')
const entityPendingDelete = ref<'cell' | null>(null)
const entityInfo = ref<{ id: number, name: string } | null>(null)

// Mostrar mensagem de feedback
const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
  feedbackMessage.value = message
  feedbackType.value = type
  setTimeout(() => {
    feedbackMessage.value = ''
  }, 3000)
}

// Carregar líderes disponíveis
const loadAvailableLeaders = async () => {
  try {
    const response = await adminService.listarUsuarios(1, 100, ['LIDER', 'SUPERVISOR'])
    availableLeaders.value = response.usuarios.filter(u => 
      u.status === 'ativo' && 
      (u.cargo === 'LIDER' || u.cargo === 'SUPERVISOR')
    )
  } catch (error) {
    console.error('Erro ao carregar líderes:', error)
    showFeedback('Erro ao carregar líderes disponíveis', 'error')
  }
}

// Carregar células
const loadCells = async (page: number = 1) => {
  try {
    loading.value = true
    
    if (availableLeaders.value.length === 0) {
      await loadAvailableLeaders()
    }
    
    const response = await adminService.listarCelulas(page)
    
    if (!response || typeof response !== 'object') {
      showFeedback('Resposta inválida do servidor', 'error')
      return
    }

    if (!response.celulas || !Array.isArray(response.celulas)) {
      showFeedback('Formato de resposta inválido', 'error')
      return
    }

    cells.value = response.celulas.map((celula: any) => {
      if (!celula.supervisor && (celula.supervisorId || celula.supervisor_id) && availableLeaders.value.length > 0) {
        const supervisorId = celula.supervisor_id || celula.supervisorId
        const supervisor = availableLeaders.value.find(l => l.id === supervisorId)
        if (supervisor) {
          celula.supervisor = supervisor
        }
      }
      return celula
    })

    cellPagination.value = response.pagination
  } catch (error) {
    console.error('Erro ao carregar células:', error)
    showFeedback('Erro ao carregar células', 'error')
  } finally {
    loading.value = false
  }
}

// Abrir modal de membros da célula
const handleVerCelula = (cell: Celula) => {
  selectedCellForMembers.value = { id: cell.id, nome: cell.nome }
  showCellMembersModal.value = true
}

// Abrir modal para criar célula
const handleNovaCelula = async () => {
  try {
    isLoadingCell.value = true
    await loadAvailableLeaders()
    selectedCell.value = undefined
    showCellModal.value = true
  } catch (error) {
    console.error('Erro ao preparar nova célula:', error)
    showFeedback('Erro ao preparar formulário de nova célula', 'error')
  } finally {
    isLoadingCell.value = false
  }
}

// Editar célula
const handleEditarCelula = async (cell: Celula) => {
  try {
    isLoadingCell.value = true
    
    await loadAvailableLeaders()
    
    const celulaDetalhada = await adminService.obterCelula(cell.id)
    
    if (!celulaDetalhada.nome) {
      throw new Error('Dados de célula incompletos')
    }
    
    if (!celulaDetalhada.liderId && celulaDetalhada.lider_id) {
      celulaDetalhada.liderId = celulaDetalhada.lider_id
    } else if (!celulaDetalhada.liderId && celulaDetalhada.lider?.id) {
      celulaDetalhada.liderId = celulaDetalhada.lider.id
    }
    
    if (!celulaDetalhada.supervisor_id && celulaDetalhada.supervisorId) {
      celulaDetalhada.supervisor_id = celulaDetalhada.supervisorId
    } else if (!celulaDetalhada.supervisor_id && celulaDetalhada.supervisor?.id) {
      celulaDetalhada.supervisor_id = celulaDetalhada.supervisor.id
    }
    
    selectedCell.value = celulaDetalhada
    showCellModal.value = true
  } catch (error) {
    console.error('Erro ao carregar detalhes da célula:', error)
    showFeedback('Erro ao carregar detalhes da célula', 'error')
  } finally {
    isLoadingCell.value = false
  }
}

// Salvar célula
const handleSaveCell = async (cellData: Partial<Celula>) => {
  try {
    isLoadingCell.value = true
    
    if (!cellData.liderId) {
      showFeedback('Líder é obrigatório', 'error')
      return
    }

    const dadosParaSalvar: any = {
      nome: cellData.nome,
      endereco: cellData.endereco,
      diaSemana: cellData.diaSemana,
      horario: cellData.horario,
      liderId: cellData.liderId,
    }
    if (cellData.supervisor_id) {
      dadosParaSalvar.supervisor_id = cellData.supervisor_id
    }

    if (selectedCell.value?.id) {
      await adminService.atualizarCelula(selectedCell.value.id, dadosParaSalvar)
      showFeedback('Célula atualizada com sucesso')
    } else {
      await adminService.criarCelula(dadosParaSalvar as Omit<Celula, 'id'>)
      showFeedback('Célula criada com sucesso')
    }
    showCellModal.value = false
    await loadCells(cellPagination.value.currentPage)
  } catch (error: any) {
    console.error('Erro ao salvar célula:', error)
    const mensagemErro = error.errors?.[0]?.message || error.message || 'Erro ao salvar célula'
    showFeedback(mensagemErro, 'error')
  } finally {
    isLoadingCell.value = false
  }
}

// Confirmar exclusão de célula
const handleConfirmDeleteCell = (cell: Celula) => {
  entityPendingDelete.value = 'cell'
  entityInfo.value = { id: cell.id, name: cell.nome }
  confirmText.value = ''
  showDeleteConfirm.value = true
  showTextConfirm.value = true
}

// Executar exclusão de célula após confirmação
const handleDeleteCell = async () => {
  if (!entityInfo.value) return
  try {
    isLoadingCell.value = true
    await adminService.excluirCelula(entityInfo.value.id)
    showFeedback('Célula excluída com sucesso')
    const currentPage = cellPagination.value.currentPage
    await loadCells(currentPage)
    if (cells.value.length === 0 && currentPage > 1) {
      await loadCells(currentPage - 1)
    }
  } catch (error: any) {
    console.error('Erro ao excluir célula:', error)
    const mensagemErro = error.message || 'Erro ao excluir célula'
    showFeedback(mensagemErro, 'error')
  } finally {
    isLoadingCell.value = false
    showDeleteConfirm.value = false
    entityPendingDelete.value = null
    entityInfo.value = null
  }
}

// Mudar página da lista de células
const handleCellPageChange = (page: number) => {
  loadCells(page)
}

// Carregar dados ao montar
loadCells()
</script>

<template>
  <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-neutral-800">Células</h1>
        <p class="mt-1 text-xs sm:text-sm text-neutral-500">Gerencie células do sistema</p>
      </div>
      <button 
        @click="handleNovaCelula"
        :disabled="isLoadingCell"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg v-if="isLoadingCell" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Nova Célula
      </button>
    </div>

    <!-- Filtros -->
    <div class="bg-white shadow-sm rounded-xl border border-gray-100 p-4 sm:p-5 mb-4">
      <!-- Busca -->
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          id="search"
          v-model="cellFilters.searchTerm"
          class="block w-full pl-12 pr-11 py-3 text-sm sm:text-base border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 placeholder:text-gray-400 text-gray-900"
          placeholder="Busque por lider ou endereço..."
        >
        <button
          v-if="cellFilters.searchTerm"
          @click="cellFilters.searchTerm = ''"
          type="button"
          class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 active:text-gray-700 transition-colors touch-manipulation"
          style="-webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);"
          aria-label="Limpar busca"
        >
          <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      <!-- Contador de resultados -->
      <div v-if="cellFilters.searchTerm && filteredCells.length > 0" class="mt-3 text-xs sm:text-sm text-gray-600 flex items-center gap-1.5">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ filteredCells.length }} {{ filteredCells.length === 1 ? 'célula encontrada' : 'células encontradas' }}</span>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <div v-else-if="filteredCells.length === 0" class="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden p-8 sm:p-12">
      <div class="text-center">
        <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
          <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="text-base sm:text-lg font-semibold text-gray-900 mb-2">
          {{ cellFilters.searchTerm ? 'Nenhuma célula encontrada' : 'Nenhuma célula cadastrada' }}
        </h3>
        <p class="text-sm sm:text-base text-gray-500 max-w-sm mx-auto">
          {{ cellFilters.searchTerm 
            ? `Não encontramos células que correspondam a "${cellFilters.searchTerm}". Tente buscar com outros termos.` 
            : 'Comece criando sua primeira célula usando o botão acima.' }}
        </p>
        <button
          v-if="cellFilters.searchTerm"
          @click="cellFilters.searchTerm = ''"
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
          v-for="cell in filteredCells"
          :key="cell.id"
          @click="handleVerCelula(cell)"
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
                <p class="text-sm font-semibold text-gray-900 group-active:text-primary-700 transition-colors truncate">{{ cell.lider?.nome || 'Sem líder' }}</p>
              </div>
              <p class="text-xs font-medium text-gray-700 truncate">{{ cell.nome }}</p>
            </div>
          </div>
          
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-1.5 text-xs text-gray-600">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{{ cell.diaSemana }} • {{ cell.horario }}</span>
            </div>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-700 group-active:bg-primary-200 group-active:text-primary-800 transition-colors">
              {{ cell._count?.membros || 0 }} membros
            </span>
          </div>
          
          <p class="text-xs text-gray-600 truncate mb-2 flex items-center gap-1">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span class="truncate">{{ cell.endereco || 'Sem endereço' }}</span>
          </p>
          
          <div class="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-3 text-xs" @click.stop>
            <button
              @click="handleEditarCelula(cell)"
              class="flex items-center gap-1 text-primary-600 hover:text-primary-700 active:text-primary-800 font-medium transition-colors touch-manipulation"
              style="-webkit-tap-highlight-color: rgba(59, 130, 246, 0.1);"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
            <button
              @click="handleConfirmDeleteCell(cell)"
              class="flex items-center gap-1 text-red-600 hover:text-red-700 active:text-red-800 font-medium transition-colors touch-manipulation"
              style="-webkit-tap-highlight-color: rgba(239, 68, 68, 0.1);"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Excluir
            </button>
          </div>
        </div>
      </div>
      
      <!-- Lista desktop -->
      <div class="hidden sm:block overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Líder
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Célula
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total de Membros
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dia/Horário
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Endereço
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr 
              v-for="cell in filteredCells" 
              :key="cell.id"
              @click="handleVerCelula(cell)"
              class="cursor-pointer transition-all duration-200 hover:bg-blue-50 hover:shadow-sm hover:border-l-4 hover:border-l-primary-500 group"
            >
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 group-hover:text-primary-700 transition-colors">
                {{ cell.lider?.nome || 'Sem líder' }}
                <span class="ml-2 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity inline-block">
                  →
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                {{ cell.nome }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 group-hover:bg-blue-200 transition-colors">
                  {{ cell._count?.membros || 0 }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                {{ cell.diaSemana }} - {{ cell.horario }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                {{ cell.endereco }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium" @click.stop>
                <button 
                  @click="handleEditarCelula(cell)"
                  class="text-primary-600 hover:text-primary-900 mr-3 transition-colors"
                >
                  Editar
                </button>
                <button 
                  @click="handleConfirmDeleteCell(cell)"
                  class="text-red-600 hover:text-red-900 transition-colors"
                >
                  Excluir
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginação -->
      <div v-if="cellPagination.pages > 1" class="mt-4 flex justify-center">
        <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
          <button
            v-for="page in cellPagination.pages"
            :key="page"
            @click="handleCellPageChange(page)"
            :class="[
              'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
              page === cellPagination.currentPage
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

    <!-- Modal de membros da célula -->
    <CellMembersModal
      :is-open="showCellMembersModal"
      :cell-id="selectedCellForMembers?.id || null"
      :cell-name="selectedCellForMembers?.nome"
      @close="showCellMembersModal = false"
    />

    <!-- Modal de confirmação de exclusão -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg px-4 pt-5 pb-4 overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full sm:p-6">
        <div class="sm:flex sm:items-start">
          <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Confirmar Exclusão
            </h3>
            <div class="mt-2 space-y-3">
              <p class="text-sm text-gray-700">
                Você está prestes a excluir a célula <span class="font-semibold">"{{ entityInfo?.name }}"</span>.
                Isso irá apagar todos os membros associados.
              </p>
              <p class="text-sm text-red-600">
                Para continuar, digite <span class="font-mono bg-red-50 px-1 rounded">delete</span> no campo abaixo.
              </p>
              <input
                v-model="confirmText"
                type="text"
                placeholder="Digite delete para confirmar"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            :disabled="confirmText.trim().toLowerCase() !== 'delete'"
            @click="handleDeleteCell()"
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm"
            :class="confirmText.trim().toLowerCase() === 'delete' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-red-400 cursor-not-allowed'"
          >
            Excluir
          </button>
          <button
            type="button"
            @click="showDeleteConfirm = false"
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de célula -->
    <CellModal
      :is-open="showCellModal"
      :cell="selectedCell"
      :available-leaders="availableLeaders"
      :is-loading="isLoadingCell"
      @close="showCellModal = false"
      @save="handleSaveCell"
    />
  </main>
</template>

