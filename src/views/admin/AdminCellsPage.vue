<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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
    <div class="bg-white shadow rounded-lg p-4 mb-6">
      <div>
        <!-- Busca -->
        <div>
          <label for="search" class="block text-sm font-medium text-gray-700">Buscar células</label>
          <div class="mt-1 relative rounded-md shadow-sm">
            <input
              type="text"
              id="search"
              v-model="cellFilters.searchTerm"
              class="focus:ring-primary-500 focus:border-primary-500 block w-full pl-3 pr-10 py-2 sm:text-sm border-gray-300 rounded-md"
              placeholder="Buscar por nome, endereço, líder ou supervisor"
            >
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <div v-else-if="filteredCells.length === 0" class="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center text-gray-500">
      {{ cells.length === 0 ? 'Nenhuma célula encontrada' : 'Nenhuma célula corresponde aos filtros aplicados' }}
    </div>

    <div v-else class="bg-white shadow overflow-hidden sm:rounded-lg">
      <!-- Lista mobile -->
      <div class="sm:hidden space-y-3 p-4">
        <div
          v-for="cell in filteredCells"
          :key="cell.id"
          @click="handleVerCelula(cell)"
          class="border border-gray-200 rounded-lg p-4 shadow-sm cursor-pointer transition-all duration-200 active:bg-blue-50 active:shadow-md active:border-l-4 active:border-l-primary-500 group"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex-1">
              <div class="flex items-center">
                <p class="text-sm font-semibold text-gray-900 group-active:text-primary-700 transition-colors">{{ cell.lider?.nome || 'Sem líder' }}</p>
                <span class="ml-2 text-primary-500 opacity-0 group-active:opacity-100 transition-opacity">→</span>
              </div>
              <p class="text-xs text-gray-500 mt-1">{{ cell.nome }}</p>
            </div>
            <span class="text-xs text-gray-500 ml-2">
              {{ cell.diaSemana }} • {{ cell.horario }}
            </span>
          </div>
          <div class="flex items-center justify-between mb-2">
            <p class="text-sm text-gray-500">
              Total de Membros:
            </p>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 group-active:bg-blue-200 transition-colors">
              {{ cell._count?.membros || 0 }}
            </span>
          </div>
          <p class="text-sm text-gray-500 truncate">
            {{ cell.endereco || 'Sem endereço' }}
          </p>
          <div class="mt-3 flex flex-wrap gap-3 text-sm" @click.stop>
            <button
              @click="handleEditarCelula(cell)"
              class="text-primary-600 hover:text-primary-900 active:text-primary-700 transition-colors"
            >
              Editar
            </button>
            <button
              @click="handleConfirmDeleteCell(cell)"
              class="text-red-600 hover:text-red-900 active:text-red-700 transition-colors"
            >
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

