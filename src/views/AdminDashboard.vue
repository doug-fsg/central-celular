<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import UserModal from '../components/UserModal.vue'
import CellModal from '../components/CellModal.vue'
import { useUserStore } from '../stores/userStore'
import { adminService } from '../services/adminService'
import type { AdminStats, Usuario } from '../services/adminService'

const userStore = useUserStore()
const activeTab = ref('dashboard') // 'dashboard', 'users' ou 'cells'

// Estado para os dados
const loading = ref(true)
const tipoRelatorio = ref('geral') // 'geral', 'celulas', 'supervisores'
const periodoSelecionado = ref('mes') // 'mes', 'trimestre', 'ano'

// Lista de usuários
const users = ref<Usuario[]>([])
const pagination = ref({
  total: 0,
  pages: 0,
  currentPage: 1,
  perPage: 10
})

// Lista de células
const cells = ref([])
const cellPagination = ref({
  total: 0,
  pages: 0,
  currentPage: 1,
  perPage: 10
})

// Dados dos relatórios
const stats = ref<AdminStats>({
  resumo: {
  totalCelulas: 0,
    totalSupervisores: 0,
    totalLideres: 0,
  totalMembros: 0,
    mediaFrequencia: 0,
    crescimentoMembros: 0,
    variacaoFrequencia: 0
  },
  indicadores: {
    relatoriosEnviados: 0,
    consolidadoresAtivos: 0,
    novosMembros: 0,
    mediaMembrosPorCelula: 0
  },
  frequencia: {
    atual: {
      celula: 0,
      culto: 0,
      media: 0
    },
    anterior: {
      celula: 0,
      culto: 0,
      media: 0
    }
  },
  regioes: []
})

// Estado do modal
const showUserModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const selectedUser = ref<Partial<Usuario> | undefined>(undefined)

// Confirmação de exclusão
const showDeleteConfirm = ref(false)
const userToDelete = ref<Usuario | null>(null)

// Mensagens de feedback
const feedbackMessage = ref('')
const feedbackType = ref<'success' | 'error'>('success')

// Estado do modal de célula
const showCellModal = ref(false)
const selectedCell = ref<Partial<Celula> | undefined>(undefined)
const isLoadingCell = ref(false)

// Lista de líderes disponíveis
const availableLeaders = ref<Usuario[]>([])

// Estado para filtros de células
const cellFilters = ref({
  searchTerm: '',
  supervisorId: ''
})

// Células filtradas
const filteredCells = computed(() => {
  let filtered = [...cells.value]
  
  // Filtrar por termo de busca
  if (cellFilters.value.searchTerm) {
    const searchTerm = cellFilters.value.searchTerm.toLowerCase()
    filtered = filtered.filter(cell => 
      cell.nome.toLowerCase().includes(searchTerm) ||
      cell.endereco.toLowerCase().includes(searchTerm) ||
      cell.lider?.nome.toLowerCase().includes(searchTerm) ||
      cell.supervisor?.nome.toLowerCase().includes(searchTerm)
    )
  }
  
  // Filtrar por supervisor
  if (cellFilters.value.supervisorId) {
    filtered = filtered.filter(cell => 
      cell.supervisorId === parseInt(cellFilters.value.supervisorId) ||
      cell.supervisor_id === parseInt(cellFilters.value.supervisorId)
    )
  }
  
  return filtered
})

// Computed property para supervisores disponíveis
const availableSupervisors = computed(() => {
  return availableLeaders.value
    .filter(user => user.cargo === 'SUPERVISOR' && user.status === 'ativo')
    .sort((a, b) => a.nome.localeCompare(b.nome))
})

// Mostrar mensagem de feedback
const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
  feedbackMessage.value = message
  feedbackType.value = type
  setTimeout(() => {
    feedbackMessage.value = ''
  }, 3000)
}

// Carregamento inicial dos dados
onMounted(async () => {
  try {
    loading.value = true
    
    // Carregar dados do relatório
    stats.value = await adminService.obterEstatisticas(periodoSelecionado.value)
    
    // Carregar lista de usuários
    const response = await adminService.listarUsuarios(1)
    users.value = response.usuarios
    pagination.value = response.pagination
  } catch (error) {
    console.error('Erro ao carregar dados:', error)
  } finally {
    loading.value = false
  }
})

// Atualizar dados quando mudar o período
async function atualizarDados() {
  try {
    loading.value = true
    stats.value = await adminService.obterEstatisticas(periodoSelecionado.value)
  } catch (error) {
    console.error('Erro ao atualizar dados:', error)
  } finally {
    loading.value = false
  }
}

// Abrir modal para criar usuário
const handleNovoUsuario = () => {
  modalMode.value = 'create'
  selectedUser.value = undefined
  showUserModal.value = true
}

// Abrir modal para editar usuário
const handleEditarUsuario = (user: Usuario) => {
  modalMode.value = 'edit'
  selectedUser.value = user
  showUserModal.value = true
}

// Confirmar exclusão de usuário
const handleConfirmDelete = (user: Usuario) => {
  userToDelete.value = user
  showDeleteConfirm.value = true
}

// Excluir usuário
const handleDeleteUser = async () => {
  if (!userToDelete.value) return

  try {
    await adminService.excluirUsuario(userToDelete.value.id)
    showFeedback('Usuário excluído com sucesso')
    // Recarregar lista de usuários
    await handlePageChange(pagination.value.currentPage)
  } catch (error) {
    console.error('Erro ao excluir usuário:', error)
    showFeedback('Erro ao excluir usuário', 'error')
  } finally {
    showDeleteConfirm.value = false
    userToDelete.value = null
  }
}

// Salvar usuário (criar/editar)
const handleSaveUser = async (userData: Partial<Usuario> & { senha?: string }) => {
  try {
    if (modalMode.value === 'create') {
      await adminService.criarUsuario(userData as any)
      showFeedback('Usuário criado com sucesso')
    } else {
      await adminService.atualizarUsuario(userData.id!, userData)
      showFeedback('Usuário atualizado com sucesso')
    }
    
    // Recarregar lista de usuários
    await handlePageChange(pagination.value.currentPage)
    showUserModal.value = false
  } catch (error) {
    console.error('Erro ao salvar usuário:', error)
    showFeedback('Erro ao salvar usuário', 'error')
  }
}

// Ativar/desativar usuário
const toggleUserStatus = async (userId: number, novoStatus: boolean) => {
  try {
    const usuarioAtualizado = await adminService.toggleStatusUsuario(userId, novoStatus)
    // Atualizar usuário na lista
    const index = users.value.findIndex(u => u.id === userId)
    if (index !== -1) {
      users.value[index] = usuarioAtualizado
    }
  } catch (error) {
    console.error('Erro ao alterar status do usuário:', error)
  }
}

// Mudar página da lista de usuários
const handlePageChange = async (page: number) => {
  try {
    loading.value = true
    const response = await adminService.listarUsuarios(page)
    users.value = response.usuarios
    pagination.value = response.pagination
  } catch (error) {
    console.error('Erro ao carregar usuários:', error)
  } finally {
    loading.value = false
  }
}

// Watch para mudanças no período selecionado
watch(periodoSelecionado, () => {
  atualizarDados()
})

// Carregar líderes disponíveis
const loadAvailableLeaders = async () => {
  try {
    // Buscar líderes e supervisores
    const response = await adminService.listarUsuarios(1, 100, ['LIDER', 'SUPERVISOR'])
    // Filtrar apenas usuários ativos e com cargo correto
    availableLeaders.value = response.usuarios.filter(u => 
      u.status === 'ativo' && 
      (u.cargo === 'LIDER' || u.cargo === 'SUPERVISOR')
    )
    console.log('Líderes disponíveis carregados:', availableLeaders.value)
  } catch (error) {
    console.error('Erro ao carregar líderes:', error)
    showFeedback('Erro ao carregar líderes disponíveis', 'error')
  }
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

// Carregar células
const loadCells = async (page: number = 1) => {
  console.log('[AdminDashboard] Iniciando carregamento de células:', { page })
  try {
    loading.value = true
    
    // Primeiro carregamos os líderes disponíveis se ainda não foram carregados
    if (availableLeaders.value.length === 0) {
      await loadAvailableLeaders()
    }
    
    const response = await adminService.listarCelulas(page)
    
    if (!response || typeof response !== 'object') {
      console.error('[AdminDashboard] Resposta inválida:', response)
      showFeedback('Resposta inválida do servidor', 'error')
      return
    }

    if (!response.celulas || !Array.isArray(response.celulas)) {
      console.error('[AdminDashboard] Células não encontradas na resposta:', response)
      showFeedback('Formato de resposta inválido', 'error')
      return
    }

    cells.value = response.celulas.map((celula: any) => {
      // Se não tiver o objeto supervisor mas tiver o ID, vamos buscar o supervisor nos líderes disponíveis
      if (!celula.supervisor && (celula.supervisorId || celula.supervisor_id) && availableLeaders.value.length > 0) {
        const supervisorId = celula.supervisorId || celula.supervisor_id
        const supervisor = availableLeaders.value.find(l => l.id === supervisorId)
        if (supervisor) {
          celula.supervisor = supervisor
        }
      }
      return celula
    })

    cellPagination.value = response.pagination
  } catch (error) {
    console.error('[AdminDashboard] Erro ao carregar células:', error)
    showFeedback('Erro ao carregar células', 'error')
  } finally {
    loading.value = false
  }
}

// Editar célula
const handleEditarCelula = async (cell: Celula) => {
  try {
    isLoadingCell.value = true
    
    // Primeiro carregamos os líderes disponíveis
    await loadAvailableLeaders()
    
    // Depois obtemos os detalhes da célula
    const celulaDetalhada = await adminService.obterCelula(cell.id)
    
    // Verificamos se os dados estão completos
    if (!celulaDetalhada.nome) {
      console.error('Dados de célula incompletos:', celulaDetalhada)
      throw new Error('Dados de célula incompletos')
    }
    
    // Garantimos que temos liderId ou lider_id
    if (!celulaDetalhada.liderId && celulaDetalhada.lider_id) {
      celulaDetalhada.liderId = celulaDetalhada.lider_id
    } else if (!celulaDetalhada.liderId && celulaDetalhada.lider?.id) {
      celulaDetalhada.liderId = celulaDetalhada.lider.id
    }
    
    // Garantimos que temos supervisor_id
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
    
    // Garantir que temos todos os dados necessários
    if (!cellData.liderId) {
      showFeedback('Líder é obrigatório', 'error')
      return
    }

    if (!cellData.supervisorId) {
      showFeedback('Supervisor é obrigatório', 'error')
      return
    }

    const dadosParaSalvar = {
      nome: cellData.nome,
      endereco: cellData.endereco,
      diaSemana: cellData.diaSemana,
      horario: cellData.horario,
      liderId: cellData.liderId,
      supervisor_id: cellData.supervisorId
    }

    console.log('Dados para salvar:', dadosParaSalvar)

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
const handleConfirmDeleteCell = async (cell: Celula) => {
  try {
    if (!confirm(`Tem certeza que deseja excluir a célula "${cell.nome}"?`)) {
      return
    }
    
    isLoadingCell.value = true
    await adminService.excluirCelula(cell.id)
    showFeedback('Célula excluída com sucesso')
    await loadCells(cellPagination.value.currentPage)
  } catch (error) {
    console.error('Erro ao excluir célula:', error)
    showFeedback('Erro ao excluir célula', 'error')
  } finally {
    isLoadingCell.value = false
  }
}

// Mudar página da lista de células
const handleCellPageChange = (page: number) => {
  loadCells(page)
}

// Carregar células ao montar o componente e quando mudar a tab
watch(activeTab, (newTab) => {
  if (newTab === 'cells') {
    loadCells()
  }
})
</script>

<template>
  <div>
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 sm:px-0">
        <!-- Tabs -->
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex space-x-8">
            <button
              @click="activeTab = 'dashboard'"
              :class="[
                activeTab === 'dashboard'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
              ]"
            >
              Dashboard
            </button>
            <button
              @click="activeTab = 'users'"
              :class="[
                activeTab === 'users'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
              ]"
            >
              Usuários
            </button>
            <button
              @click="activeTab = 'cells'"
              :class="[
                activeTab === 'cells'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm'
              ]"
            >
              Células
            </button>
          </nav>
        </div>
      </div>
      
      <!-- Loading -->
      <div v-if="loading" class="mt-6">
            <div class="animate-pulse flex space-x-4">
              <div class="flex-1 space-y-4 py-1">
                <div class="h-4 bg-gray-200 rounded w-3/4"></div>
            <div class="space-y-2">
              <div class="h-4 bg-gray-200 rounded"></div>
              <div class="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
              </div>

      <!-- Conteúdo -->
      <div v-else class="mt-6">
        <!-- Dashboard -->
        <div v-if="activeTab === 'dashboard'" class="space-y-6">
          <!-- Seletor de período -->
          <div class="flex justify-between items-center">
            <div class="flex space-x-4">
              <select
                v-model="periodoSelecionado"
                class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="mes">Este mês</option>
                <option value="trimestre">Este trimestre</option>
                <option value="ano">Este ano</option>
              </select>
            </div>
          </div>
          
          <!-- Cards de resumo -->
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <!-- Total de células -->
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="p-5">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">
                      Total de Células
                      </dt>
                      <dd class="flex items-baseline">
                        <div class="text-2xl font-semibold text-gray-900">
                          {{ stats.resumo.totalCelulas }}
                    </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Total de membros -->
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="p-5">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                    </svg>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">
                        Total de Membros
                      </dt>
                      <dd class="flex items-baseline">
                        <div class="text-2xl font-semibold text-gray-900">
                          {{ stats.resumo.totalMembros }}
                    </div>
                        <div 
                          :class="[
                            stats.resumo.crescimentoMembros > 0 ? 'text-green-600' : 'text-red-600',
                            'ml-2 flex items-baseline text-sm font-semibold'
                          ]"
                        >
                          <span class="ml-1">
                            {{ stats.resumo.crescimentoMembros > 0 ? '▲' : '▼' }}
                            {{ Math.abs(stats.resumo.crescimentoMembros) }}%
                          </span>
                    </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Média de frequência -->
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="p-5">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">
                        Média de Frequência
                      </dt>
                      <dd class="flex items-baseline">
                        <div class="text-2xl font-semibold text-gray-900">
                          {{ stats.resumo.mediaFrequencia }}%
                    </div>
                        <div 
                          :class="[
                            stats.resumo.variacaoFrequencia > 0 ? 'text-green-600' : 'text-red-600',
                            'ml-2 flex items-baseline text-sm font-semibold'
                          ]"
                        >
                          <span class="ml-1">
                            {{ stats.resumo.variacaoFrequencia > 0 ? '▲' : '▼' }}
                            {{ Math.abs(stats.resumo.variacaoFrequencia) }}%
                          </span>
                    </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Novos membros -->
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="p-5">
                <div class="flex items-center">
                  <div class="flex-shrink-0">
                    <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                    </svg>
                  </div>
                  <div class="ml-5 w-0 flex-1">
                    <dl>
                      <dt class="text-sm font-medium text-gray-500 truncate">
                        Novos Membros
                      </dt>
                      <dd class="flex items-baseline">
                        <div class="text-2xl font-semibold text-gray-900">
                          {{ stats.indicadores.novosMembros }}
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Indicadores adicionais -->
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="p-5">
                <h3 class="text-lg leading-6 font-medium text-gray-900">Relatórios Enviados</h3>
                <div class="mt-2 text-3xl font-semibold text-gray-900">
                  {{ stats.indicadores.relatoriosEnviados }}
                </div>
              </div>
            </div>

            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="p-5">
                <h3 class="text-lg leading-6 font-medium text-gray-900">Consolidadores Ativos</h3>
                <div class="mt-2 text-3xl font-semibold text-gray-900">
                  {{ stats.indicadores.consolidadoresAtivos }}
                </div>
              </div>
            </div>

            <div class="bg-white overflow-hidden shadow rounded-lg">
              <div class="p-5">
                <h3 class="text-lg leading-6 font-medium text-gray-900">Média de Membros/Célula</h3>
                <div class="mt-2 text-3xl font-semibold text-gray-900">
                  {{ stats.indicadores.mediaMembrosPorCelula }}
                </div>
              </div>
            </div>
          </div>

          <!-- Dados por região -->
          <div class="bg-white shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <h3 class="text-lg leading-6 font-medium text-gray-900">
                Distribuição por Região
              </h3>
              <div class="mt-4">
                <div class="flex flex-col">
                  <div class="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div class="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                      <div class="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                        <table class="min-w-full divide-y divide-gray-200">
                          <thead class="bg-gray-50">
                            <tr>
                              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Região
                              </th>
                              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total de Células
                              </th>
                              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total de Membros
                              </th>
                              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Média de Membros
                              </th>
                            </tr>
                          </thead>
                          <tbody class="bg-white divide-y divide-gray-200">
                            <tr v-for="regiao in stats.regioes" :key="regiao.id">
                              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {{ regiao.nome }}
                              </td>
                              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {{ regiao.totalCelulas }}
                              </td>
                              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {{ regiao.totalMembros }}
                              </td>
                              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {{ regiao.mediaMembros }}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>
      
        <!-- Lista de usuários -->
        <div v-if="activeTab === 'users'">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-lg font-medium text-gray-900">Lista de Usuários</h2>
            <button 
              @click="handleNovoUsuario"
              class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
            >
              Novo Usuário
              </button>
            </div>
            
          <div class="bg-white shadow overflow-hidden sm:rounded-lg">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cargo
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="user in users" :key="user.id">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {{ user.nome }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ user.email }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ user.cargo }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span 
                      :class="[
                        user.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
                        'px-2 inline-flex text-xs leading-5 font-semibold rounded-full'
                      ]"
                    >
                      {{ user.status }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      @click="handleEditarUsuario(user)"
                      class="text-primary-600 hover:text-primary-900 mr-3"
                    >
                      Editar
                    </button>
                    <button 
                      @click="handleConfirmDelete(user)"
                      class="text-red-600 hover:text-red-900 mr-3"
                    >
                      Excluir
                    </button>
                    <button 
                      :class="[
                        user.status === 'ativo' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                      ]"
                      @click="toggleUserStatus(user.id, user.status === 'ativo' ? false : true)"
                    >
                      {{ user.status === 'ativo' ? 'Desativar' : 'Ativar' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Paginação -->
            <div class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div class="flex-1 flex justify-between sm:hidden">
                <button
                  :disabled="pagination.currentPage === 1"
                  @click="handlePageChange(pagination.currentPage - 1)"
                  class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Anterior
                </button>
                <button
                  :disabled="pagination.currentPage === pagination.pages"
                  @click="handlePageChange(pagination.currentPage + 1)"
                  class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Próxima
              </button>
            </div>
              <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p class="text-sm text-gray-700">
                    Mostrando
                    <span class="font-medium">{{ ((pagination.currentPage - 1) * pagination.perPage) + 1 }}</span>
                    até
                    <span class="font-medium">{{ Math.min(pagination.currentPage * pagination.perPage, pagination.total) }}</span>
                    de
                    <span class="font-medium">{{ pagination.total }}</span>
                    resultados
                  </p>
                </div>
                <div>
                  <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      :disabled="pagination.currentPage === 1"
                      @click="handlePageChange(pagination.currentPage - 1)"
                      class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      <span class="sr-only">Anterior</span>
                      <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </button>
                    <button
                      v-for="page in pagination.pages"
                      :key="page"
                      @click="handlePageChange(page)"
                      :class="[
                        page === pagination.currentPage
                          ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50',
                        'relative inline-flex items-center px-4 py-2 border text-sm font-medium'
                      ]"
                    >
                      {{ page }}
                    </button>
                    <button
                      :disabled="pagination.currentPage === pagination.pages"
                      @click="handlePageChange(pagination.currentPage + 1)"
                      class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      <span class="sr-only">Próxima</span>
                      <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                      </svg>
              </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Lista de células -->
        <div v-if="activeTab === 'cells'">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-lg font-medium text-gray-900">Lista de Células</h2>
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
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <!-- Filtro por Supervisor -->
              <div>
                <label for="supervisor-filter" class="block text-sm font-medium text-gray-700">Filtrar por Supervisor</label>
                <select
                  id="supervisor-filter"
                  v-model="cellFilters.supervisorId"
                  class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                >
                  <option value="">Todos os supervisores</option>
                  <option v-for="supervisor in availableSupervisors" :key="supervisor.id" :value="supervisor.id">
                    {{ supervisor.nome }}
                  </option>
                </select>
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
                    Supervisor
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
                <tr v-for="cell in filteredCells" :key="cell.id">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {{ cell.nome }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ cell.lider?.nome }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ cell.supervisor?.nome }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ cell.diaSemana }} - {{ cell.horario }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ cell.endereco }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      @click="handleEditarCelula(cell)"
                      class="text-primary-600 hover:text-primary-900 mr-3"
                    >
                      Editar
                    </button>
                    <button 
                      @click="handleConfirmDeleteCell(cell)"
                      class="text-red-600 hover:text-red-900"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>

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
        </div>
      </div>
    </main>

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

    <!-- Modal de usuário -->
    <UserModal
      :is-open="showUserModal"
      :mode="modalMode"
      :user="selectedUser"
      @close="showUserModal = false"
      @save="handleSaveUser"
    />

    <!-- Modal de confirmação de exclusão -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg px-4 pt-5 pb-4 overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full sm:p-6">
        <div class="sm:flex sm:items-start">
          <div class="mt-3 text-center sm:mt-0 sm:text-left">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Confirmar Exclusão
            </h3>
            <div class="mt-2">
              <p class="text-sm text-gray-500">
                Tem certeza que deseja excluir o usuário "{{ userToDelete?.nome }}"? Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>
        </div>
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            @click="handleDeleteUser"
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
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
  </div>
</template> 