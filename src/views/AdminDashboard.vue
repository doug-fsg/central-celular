<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import UserModal from '../components/UserModal.vue'
import CellModal from '../components/CellModal.vue'
import { adminService } from '../services/adminService'
import type { AdminStats, Usuario, Celula } from '../services/adminService'
import relatorioService from '../services/relatorioService'
// Removido gráfico de barras (vue-chartjs / chart.js)
import WhatsAppConnections from '../components/WhatsAppConnections.vue'
import CellMembersModal from '../components/CellMembersModal.vue'
import { ssoLinkService } from '../services/ssoLinkService'
import FrequencyChart from '../components/FrequencyChart.vue'
import AppIcon from '../components/AppIcon.vue'
import {
  ensureUserInLeaderList,
  filterUsersForCellLeaderSelect,
  normalizeCreatedUsuario,
} from '../utils/cellLeaders'
import { normalizeCelulaFromApi } from '../utils/celula'

const activeTab = ref('dashboard') // 'dashboard', 'users', 'cells' ou 'whatsapp'
const whatsappRef = ref<any>(null)

// Estado para os dados
const loading = ref(true)
// const tipoRelatorio = ref('geral') // 'geral', 'celulas', 'supervisores'
const periodoSelecionado = ref('semana') // 'semana', 'mes', 'trimestre', 'ano'

// Lista de usuários
const users = ref<Usuario[]>([])
const usersAll = ref<Usuario[]>([])
const loadingAllUsers = ref(false)
const pagination = ref({
  total: 0,
  pages: 0,
  currentPage: 1,
  perPage: 10
})

  // Filtros da lista de usuários
  const userSearchTerm = ref('')
  const userRoleFilter = ref('')
  const isFilteringUsers = computed(() => userSearchTerm.value.trim() !== '' || userRoleFilter.value.trim() !== '')
  const filteredUsers = computed(() => {
    const term = userSearchTerm.value.toLowerCase().trim()
    const source = isFilteringUsers.value ? usersAll.value : users.value
    return source.filter(u => {
      const matchesTerm = !term ||
        u.nome.toLowerCase().includes(term) ||
        (u.whatsapp || '').toLowerCase().includes(term) ||
        (u.cargo || '').toLowerCase().includes(term)
      const matchesRole = !userRoleFilter.value || (u.cargo || '').toUpperCase() === userRoleFilter.value
      return matchesTerm && matchesRole
    })
  })

  // Carregar todas as páginas de usuários quando filtrar
  const loadAllUsers = async () => {
    try {
      loadingAllUsers.value = true
      const first = await adminService.listarUsuarios(1, 100)
      let all: Usuario[] = first.usuarios
      const totalPages = first.pagination.pages
      for (let p = 2; p <= totalPages; p++) {
        const resp = await adminService.listarUsuarios(p, 100)
        all = all.concat(resp.usuarios)
      }
      usersAll.value = all
    } catch (error) {
      console.error('Erro ao carregar todas as páginas de usuários:', error)
    } finally {
      loadingAllUsers.value = false
    }
  }

  watch([userSearchTerm, userRoleFilter], async ([term, role]) => {
    if ((term && term.trim() !== '') || (role && role.trim() !== '')) {
      if (usersAll.value.length === 0 && !loadingAllUsers.value) {
        await loadAllUsers()
      }
    }
  })

// Lista de células
const cells = ref<Celula[]>([])
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
    coLideresAtivos: 0,
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
const showCellMembersModal = ref(false)
const selectedCellForMembers = ref<{ id: number, nome: string } | null>(null)

// Lista de líderes disponíveis
const availableLeaders = ref<Usuario[]>([])
const leaderFilterId = ref<string>('')

function closeCellModal() {
  showCellModal.value = false
  selectedCell.value = undefined
}
const leaderSearchTerm = ref('')
const showLeaderDropdown = ref(false)

// Líderes filtrados para busca
const filteredLeaders = computed(() => {
  if (!leaderSearchTerm.value.trim()) {
    return availableLeaders.value.filter((u: Usuario) => u.cargo === 'LIDER')
  }
  const term = leaderSearchTerm.value.toLowerCase().trim()
  return availableLeaders.value.filter((u: Usuario) => 
    u.cargo === 'LIDER' && 
    (u.nome.toLowerCase().includes(term) || (u.whatsapp || '').includes(term))
  )
})

const selectedLeaderName = computed(() => {
  if (!leaderFilterId.value) return ''
  const leader = availableLeaders.value.find((u: Usuario) => String(u.id) === leaderFilterId.value)
  return leader?.nome || ''
})

// Série consolidada por data para cálculo de médias do período
const chartLabels = ref<string[]>([])
const chartSeriesCelula = ref<number[]>([])
const chartSeriesCulto = ref<number[]>([])

// Médias do período - só considerar na média os dias que tiveram eventos/relatórios
const mediaCelulaPeriodo = computed(() => {
  if (!chartSeriesCelula.value.length) return 0
  
  // Para calcular a média real, precisamos considerar apenas os dias que tiveram dados
  // Se não há contagem de presentes, significa que não houve evento naquele dia
  let sum = 0
  let diasComEventos = 0
  
  chartSeriesCelula.value.forEach(percentual => {
    // Só incluir na média se houve um evento (mesmo que 0% de presença)
    sum += percentual
    diasComEventos++
  })
  
  return diasComEventos > 0 ? Math.round(sum / diasComEventos) : 0
})

const mediaCultoPeriodo = computed(() => {
  if (!chartSeriesCulto.value.length) return 0
  
  // Para calcular a média real, precisamos considerar apenas os dias que tiveram dados
  let sum = 0
  let diasComEventos = 0
  
  chartSeriesCulto.value.forEach(percentual => {
    // Só incluir na média se houve um evento (mesmo que 0% de presença)
    sum += percentual
    diasComEventos++
  })
  
  return diasComEventos > 0 ? Math.round(sum / diasComEventos) : 0
})

// Removidos: chartOptions e barData (gráfico não é mais exibido)

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
      (cell.endereco || '').toLowerCase().includes(searchTerm) ||
      (cell.lider?.nome || '').toLowerCase().includes(searchTerm) ||
      (cell.supervisor?.nome || '').toLowerCase().includes(searchTerm)
    )
  }
  
  // Filtrar por supervisor
  if (cellFilters.value.supervisorId) {
    filtered = filtered.filter(cell => 
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

// Fechar dropdown ao clicar fora
let isOpening = false
const handleClickOutside = (event: MouseEvent) => {
  if (isOpening) {
    isOpening = false
    return
  }
  const target = event.target as HTMLElement
  if (!target.closest('.leader-dropdown-container') && showLeaderDropdown.value) {
    showLeaderDropdown.value = false
  }
}

const openLeaderDropdown = () => {
  isOpening = true
  showLeaderDropdown.value = true
  setTimeout(() => {
    isOpening = false
  }, 50)
}

// Carregamento inicial dos dados
onMounted(async () => {
  try {
    loading.value = true
    
    // Carregar dados do relatório
    const liderId = leaderFilterId.value ? Number(leaderFilterId.value) : undefined
    stats.value = await adminService.obterEstatisticas(periodoSelecionado.value, liderId)
    
    // Carregar lista de usuários
    const response = await adminService.listarUsuarios(1)
    users.value = response.usuarios
    pagination.value = response.pagination
    await loadAvailableLeaders()
    await loadCharts()
    
    // Adicionar listener para fechar dropdown ao clicar fora (com pequeno delay para evitar conflito no primeiro clique)
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 100)
  } catch (error) {
    console.error('Erro ao carregar dados:', error)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Atualizar dados quando mudar o período ou líder
async function atualizarDados() {
  try {
    loading.value = true
    const liderId = leaderFilterId.value ? Number(leaderFilterId.value) : undefined
    stats.value = await adminService.obterEstatisticas(periodoSelecionado.value, liderId)
    await loadCharts() // Recarregar gráficos quando o período mudar
  } catch (error) {
    console.error('Erro ao atualizar dados:', error)
  } finally {
    loading.value = false
  }
}
// Abrir modal de membros da célula
const handleVerCelula = (cell: Celula) => {
  selectedCellForMembers.value = { id: cell.id, nome: cell.nome }
  showCellMembersModal.value = true
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
const showTextConfirm = ref(false)
const confirmText = ref('')
const entityPendingDelete = ref<'user' | 'cell' | null>(null)
const entityInfo = ref<{ id: number, name: string } | null>(null)

const handleConfirmDelete = (user: Usuario) => {
  userToDelete.value = user
  entityPendingDelete.value = 'user'
  entityInfo.value = { id: user.id, name: user.nome }
  confirmText.value = ''
  showDeleteConfirm.value = true
  showTextConfirm.value = true
}

// Excluir usuário
const handleDeleteUser = async () => {
  if (!userToDelete.value) return

  try {
    await adminService.excluirUsuario(userToDelete.value.id)
    showFeedback('Usuário excluído com sucesso')
    // Recarregar lista de usuários
    await handlePageChange(pagination.value.currentPage)
    entityPendingDelete.value = null
  } catch (error) {
    console.error('Erro ao excluir usuário:', error)
    showFeedback('Erro ao excluir usuário', 'error')
  } finally {
    showDeleteConfirm.value = false
    userToDelete.value = null
  }
}

// Salvar usuário (criar/editar)
const handleSaveUser = async (userData: Partial<Usuario> & { criarCelulaApos?: boolean }) => {
  try {
    if (modalMode.value === 'create') {
      const novoUsuario = await adminService.criarUsuario(userData as any)
      showFeedback('Usuário criado com sucesso. Um código de acesso será enviado para o WhatsApp informado.')
      // Se for líder e a opção estiver marcada, abrir modal de nova célula pré-selecionando o líder
      if (userData.cargo === 'LIDER' && userData.criarCelulaApos) {
        await loadAvailableLeaders()
        const lider = normalizeCreatedUsuario(novoUsuario as Usuario & { ativo?: boolean })
        availableLeaders.value = ensureUserInLeaderList(availableLeaders.value, lider)
        const leaderName = lider.nome || 'Líder'
        selectedCell.value = {
          liderId: lider.id,
          lider: { id: lider.id, nome: lider.nome, whatsapp: lider.whatsapp, cargo: lider.cargo, ativo: lider.ativo, status: lider.status },
          nome: `Célula - ${leaderName.split(' ')[0]}`,
        }
        showUserModal.value = false
        showCellModal.value = true
      }
    } else {
      const atualizado = await adminService.atualizarUsuario(userData.id!, userData)
      // Atualizar listas locais imediatamente para evitar necessidade de F5
      const idx = users.value.findIndex(u => u.id === atualizado.id)
      if (idx !== -1) {
        users.value[idx] = atualizado
      }
      const idxAll = usersAll.value.findIndex(u => u.id === atualizado.id)
      if (idxAll !== -1) {
        usersAll.value[idxAll] = atualizado
      }
      showFeedback('Usuário atualizado com sucesso')
    }
    
    // Recarregar lista de usuários
    await handlePageChange(pagination.value.currentPage)
    // Se estiver filtrando, garantir que a lista completa também esteja sincronizada
    if (isFilteringUsers.value) {
      await loadAllUsers()
    }
    if (!(userData.cargo === 'LIDER' && userData.criarCelulaApos)) {
      showUserModal.value = false
    }
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

// Watch para mudanças no filtro de líder
watch(leaderFilterId, () => {
  atualizarDados() // Recarregar estatísticas e gráficos quando o filtro de líder mudar
})

// Carregar líderes disponíveis
const loadAvailableLeaders = async () => {
  try {
    // Buscar líderes e supervisores
    const response = await adminService.listarUsuarios(1, 100, ['LIDER', 'SUPERVISOR'])
    availableLeaders.value = filterUsersForCellLeaderSelect(response.usuarios)
    console.log('Líderes disponíveis carregados:', availableLeaders.value)
  } catch (error) {
    console.error('Erro ao carregar líderes:', error)
    showFeedback('Erro ao carregar líderes disponíveis', 'error')
  }
}
// Utilitários de período
function getPeriodRange(periodo: string) {
  const now = new Date()
  let start: Date
  let end: Date
  
  if (periodo === 'semana') {
    // Última semana (segunda a domingo)
    const semanaPassada = subWeeks(now, 1)
    start = startOfWeek(semanaPassada, { weekStartsOn: 1 }) // Segunda-feira
    end = endOfWeek(semanaPassada, { weekStartsOn: 1 }) // Domingo
  } else if (periodo === 'trimestre') {
    start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  } else if (periodo === 'ano') {
    start = new Date(now.getFullYear(), 0, 1)
    end = new Date(now.getFullYear(), 11, 31)
  } else {
    // mes
    start = new Date(now.getFullYear(), now.getMonth(), 1)
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  }
  return { start, end }
}

async function fetchAllCells(): Promise<Celula[]> {
  const first = await adminService.listarCelulas(1, 100)
  let all = first.celulas || []
  const totalPages = first.pagination?.pages || 1
  for (let p = 2; p <= totalPages; p++) {
    const resp = await adminService.listarCelulas(p, 100)
    all = all.concat(resp.celulas || [])
  }
  return all
}

// Consolida dados apenas para médias dos cards
async function loadCharts() {
  try {
    chartLabels.value = []
    chartSeriesCelula.value = []
    chartSeriesCulto.value = []

    const { start, end } = getPeriodRange(periodoSelecionado.value)
    const startStr = start.toISOString().slice(0, 10)
    const endStr = end.toISOString().slice(0, 10)

    const allCells = await fetchAllCells()
    const filteredCells = leaderFilterId.value
      ? allCells.filter(c => String(c.liderId || c.lider_id) === leaderFilterId.value)
      : allCells

    // Map por dataInicio => { celula: {pres,tot}, culto: {pres,tot} }
    const agg = new Map<string, { cel: { pres: number; tot: number }; cul: { pres: number; tot: number } }>()

    // Para cada célula, buscar relatórios de célula e culto e agregar
    for (const cell of filteredCells) {
      // Buscar relatórios sem filtrar por evento e usar contagens por tipo
      const rels = await relatorioService.listarRelatorios({ celulaId: cell.id, dataInicio: startStr, dataFim: endStr })
      for (const r of rels) {
        const key = String(r.dataInicio).slice(0, 10)
        if (!agg.has(key)) agg.set(key, { cel: { pres: 0, tot: 0 }, cul: { pres: 0, tot: 0 } })
        const entry = agg.get(key)!

        const presentesCel = (r as any).presentesCelula ?? 0
        const totalCel = (r as any).totalCelula ?? 0
        const presentesCul = (r as any).presentesCulto ?? 0
        const totalCul = (r as any).totalCulto ?? 0

        entry.cel.pres += presentesCel
        entry.cel.tot += totalCel
        entry.cul.pres += presentesCul
        entry.cul.tot += totalCul
      }
    }

    // Ordenar por data e montar séries percentuais
    const sortedKeys = Array.from(agg.keys()).sort()
    chartLabels.value = sortedKeys.map(k => k.slice(8, 10) + '/' + k.slice(5, 7))
    chartSeriesCelula.value = sortedKeys.map(k => {
      const e = agg.get(k)!
      return e.cel.tot > 0 ? Math.round((e.cel.pres / e.cel.tot) * 100) : 0
    })
    chartSeriesCulto.value = sortedKeys.map(k => {
      const e = agg.get(k)!
      return e.cul.tot > 0 ? Math.round((e.cul.pres / e.cul.tot) * 100) : 0
    })

  } catch (err) {
    console.error('[Dashboard] Erro ao carregar gráficos:', err)
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

  // Supervisor agora é opcional

  const dadosParaSalvar: any = {
    nome: cellData.nome,
    publico: cellData.publico,
    endereco: cellData.endereco,
    diaSemana: cellData.diaSemana,
    horario: cellData.horario,
    liderId: cellData.liderId,
  }
    if (cellData.supervisor_id) {
      dadosParaSalvar.supervisor_id = cellData.supervisor_id
  }

    console.log('Dados para salvar:', dadosParaSalvar)

    if (selectedCell.value?.id) {
      const atualizada = normalizeCelulaFromApi(
        await adminService.atualizarCelula(selectedCell.value.id, dadosParaSalvar),
      )
      selectedCell.value = { ...selectedCell.value, ...atualizada }
      showFeedback('Célula atualizada com sucesso')
      await loadCells(cellPagination.value.currentPage)
    } else {
      const novaCelula = normalizeCelulaFromApi(
        await adminService.criarCelula(dadosParaSalvar as Omit<Celula, 'id'>),
      )
      if (!novaCelula.id) {
        showFeedback('Célula criada, mas não foi possível carregar o painel de membros.', 'error')
        closeCellModal()
        await loadCells(cellPagination.value.currentPage)
        return
      }
      selectedCell.value = novaCelula
      showFeedback('Célula criada. Agora você pode adicionar os membros.')
      await loadCells(cellPagination.value.currentPage)
    }
  } catch (error: any) {
    console.error('Erro ao salvar célula:', error)
    const mensagemErro = error.errors?.[0]?.message || error.message || 'Erro ao salvar célula'
    showFeedback(mensagemErro, 'error')
  } finally {
    isLoadingCell.value = false
  }
}

// Confirmar exclusão de célula (abre modal com confirmação por texto)
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
    // Recarregar células na página atual ou voltar para página 1 se a página atual ficou vazia
    const currentPage = cellPagination.value.currentPage
    await loadCells(currentPage)
    // Se não há mais células na página atual e não é a primeira página, voltar para página anterior
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

// Carregar células ao montar o componente e quando mudar a tab
watch(activeTab, (newTab) => {
  if (newTab === 'cells') {
    loadCells()
  } else if (newTab === 'whatsapp') {
    // Verificar conexões do WhatsApp quando a aba for selecionada
    setTimeout(() => {
      if (whatsappRef.value && typeof whatsappRef.value.checkActiveConnection === 'function') {
        whatsappRef.value.checkActiveConnection()
      }
    }, 100) // Pequeno timeout para garantir que o componente está montado
  }
})

// Estado para envio de link SSO
const sendingLink = ref(false)
const userSendingLink = ref<number | null>(null)
const showConfirmSendLink = ref(false)
const userIdToSendLink = ref<number | null>(null)

const confirmSendSsoLink = (userId: number) => {
  userIdToSendLink.value = userId
  showConfirmSendLink.value = true
}

// Enviar link SSO para um líder
const handleSendSsoLink = async () => {
  try {
    sendingLink.value = true
    userSendingLink.value = userIdToSendLink.value
    
    const result = await ssoLinkService.gerarEnviarLink(userIdToSendLink.value as number)
    
    if (result.success) {
      showFeedback('Link enviado com sucesso para o líder')
    } else {
      showFeedback('Erro ao enviar link: ' + result.message, 'error')
    }
  } catch (error) {
    console.error('Erro ao enviar link SSO:', error)
    showFeedback('Erro ao enviar link SSO', 'error')
  } finally {
    sendingLink.value = false
    showConfirmSendLink.value = false
    userSendingLink.value = null
  }
}
</script>

<template>
  <div>
    <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div class="px-0 sm:px-0">
        <!-- Tabs -->
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex overflow-x-auto gap-3 md:space-x-8 pb-2 sm:pb-0">
            <button
              @click="activeTab = 'dashboard'"
              :class="[
                activeTab === 'dashboard'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                'whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0'
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
                'whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0'
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
                'whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0'
              ]"
            >
              Células
            </button>
            <button
              @click="activeTab = 'whatsapp'"
              :class="[
                activeTab === 'whatsapp'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                'whitespace-nowrap py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex-shrink-0'
              ]"
            >
              <span class="hidden sm:inline">Conexões WhatsApp</span>
              <span class="sm:hidden">WhatsApp</span>
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
        <div v-if="activeTab === 'dashboard'" class="space-y-6" @click="showLeaderDropdown = false">
          <!-- Cabeçalho -->
          <div class="mb-4 sm:mb-6">
            <h1 class="text-xl sm:text-2xl font-bold text-neutral-800">Dashboard</h1>
            <p class="mt-1 text-xs sm:text-sm text-neutral-500">Visão geral das células e membros</p>
          </div>
          
          <!-- Grupo 1: Cards sempre visíveis (não afetados pelo filtro) -->
          <div class="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 mb-4 sm:mb-6">
            <!-- Total de células -->
            <div class="card p-4 sm:p-5 bg-white border border-neutral-200">
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <p class="text-xs sm:text-sm font-medium text-neutral-600 mb-1">Total de Células</p>
                  <p class="text-2xl sm:text-3xl font-bold text-neutral-900">{{ stats.resumo.totalCelulas }}</p>
                  </div>
                <div class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-neutral-100 flex-shrink-0">
                  <AppIcon name="grid" class="text-neutral-600" size="sm" />
                </div>
              </div>
            </div>
            
            <!-- Total de membros -->
            <div class="card p-4 sm:p-5 bg-white border border-neutral-200">
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <p class="text-xs sm:text-sm font-medium text-neutral-600 mb-1">Total de Membros</p>
                  <div class="flex items-baseline gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <p class="text-2xl sm:text-3xl font-bold text-neutral-900">{{ stats.resumo.totalMembros }}</p>
                    <span 
                          :class="[
                            stats.resumo.crescimentoMembros > 0 ? 'text-green-600' : 'text-red-600',
                        'text-xs font-medium'
                          ]"
                        >
                            {{ stats.resumo.crescimentoMembros > 0 ? '▲' : '▼' }}
                            {{ Math.abs(stats.resumo.crescimentoMembros) }}%
                          </span>
                    </div>
                  <div class="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-xs text-neutral-500">
                    <span class="flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                      <span>{{ stats.indicadores.consolidadoresAtivos }} consolidadores</span>
                    </span>
                    <span class="flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                      <span>{{ stats.indicadores.coLideresAtivos }} co-líderes</span>
                    </span>
                  </div>
                </div>
                <div class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-neutral-100 flex-shrink-0">
                  <AppIcon name="users" class="text-neutral-600" size="sm" />
                  </div>
                </div>
              </div>
            </div>
            
          <!-- Seletor de período (filtro para os cards abaixo) -->
          <div class="mb-4 sm:mb-6">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
              <div class="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
                <button
                  v-for="periodo in [
                    { key: 'semana', label: 'Semana', labelMobile: 'Semana' },
                    { key: 'mes', label: 'Mês', labelMobile: 'Mês' },
                    { key: 'trimestre', label: 'Trimestre', labelMobile: 'Trim.' },
                    { key: 'ano', label: 'Ano', labelMobile: 'Ano' }
                  ]"
                  :key="periodo.key"
                  @click="periodoSelecionado = periodo.key as any"
                  class="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0"
                  :class="periodoSelecionado === periodo.key
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'"
                >
                  <span class="sm:hidden">{{ periodo.labelMobile }}</span>
                  <span class="hidden sm:inline">{{ periodo.label }}</span>
                </button>
              </div>
              <div class="flex items-center gap-2">
                <label class="text-xs text-neutral-600 whitespace-nowrap">Líder:</label>
                <div class="relative leader-dropdown-container flex-1 sm:flex-none">
                  <!-- Input de busca com dropdown -->
                  <div 
                    class="relative"
                  >
                    <input
                      v-model="leaderSearchTerm"
                      @focus="openLeaderDropdown()"
                      @click.stop="openLeaderDropdown()"
                      @input="showLeaderDropdown = true"
                      type="text"
                      :placeholder="selectedLeaderName || 'Buscar líder...'"
                      class="px-2.5 py-1.5 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-neutral-700 w-full sm:w-48"
                    />
                    <div class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg class="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                        </div>
                  
                  <!-- Dropdown de líderes -->
                  <div 
                    v-if="showLeaderDropdown"
                    class="absolute z-50 mt-1 w-full sm:w-48 bg-white border border-neutral-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    @click.stop
                  >
                    <div class="p-1">
                      <button
                        @click="leaderFilterId = ''; leaderSearchTerm = ''; showLeaderDropdown = false"
                        class="w-full text-left px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 rounded transition-colors"
                        :class="!leaderFilterId ? 'bg-primary-50 text-primary-700 font-medium' : ''"
                      >
                        Todos os líderes
                      </button>
                      <div v-if="filteredLeaders.length === 0" class="px-2 py-2 text-xs text-neutral-500 text-center">
                        Nenhum líder encontrado
                  </div>
                      <button
                        v-for="l in filteredLeaders"
                        :key="l.id"
                        @click="leaderFilterId = String(l.id); leaderSearchTerm = ''; showLeaderDropdown = false"
                        class="w-full text-left px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 rounded transition-colors"
                        :class="leaderFilterId === String(l.id) ? 'bg-primary-50 text-primary-700 font-medium' : ''"
                      >
                        {{ l.nome }}
                      </button>
                </div>
              </div>
            </div>
                  </div>
                        </div>
                  </div>

          <!-- Grupo 2: Cards afetados pelo filtro -->
          <div class="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-4 sm:mb-6">
            <!-- Média Célula -->
            <div class="card p-4 sm:p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div class="flex items-center">
                <div class="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-500 mr-3 sm:mr-4 flex-shrink-0">
                  <AppIcon name="chart-bar" class="text-white" size="sm" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-green-700 mb-1">Média Célula</p>
                  <p class="text-xl sm:text-2xl font-bold text-green-900">{{ mediaCelulaPeriodo }}%</p>
              </div>
            </div>
          </div>

            <!-- Média Culto -->
            <div class="card p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div class="flex items-center">
                <div class="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500 mr-3 sm:mr-4 flex-shrink-0">
                  <AppIcon name="chart-bar" class="text-white" size="sm" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-blue-700 mb-1">Média Culto</p>
                  <p class="text-xl sm:text-2xl font-bold text-blue-900">{{ mediaCultoPeriodo }}%</p>
                </div>
              </div>
            </div>

            <!-- Relatórios Enviados -->
            <div class="card p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div class="flex items-center">
                <div class="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-purple-500 mr-3 sm:mr-4 flex-shrink-0">
                  <AppIcon name="calendar" class="text-white" size="sm" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-purple-700 mb-1">Relatórios Enviados</p>
                  <p class="text-xl sm:text-2xl font-bold text-purple-900">{{ stats.indicadores.relatoriosEnviados }}</p>
              </div>
            </div>
            </div>
          </div>

          <!-- Relatório de Frequência por Data -->
          <div class="mt-4 sm:mt-8">
            <FrequencyChart 
              :periodo="periodoSelecionado" 
              :celula-id="leaderFilterId && leaderFilterId !== '' ? Number(leaderFilterId) : undefined"
            />
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
            <!-- Filtros da lista de usuários -->
            <div class="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div class="flex-1">
                <input
                  v-model="userSearchTerm"
                  type="text"
                  class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  placeholder="Pesquisar por nome, WhatsApp ou cargo"
                />
              </div>
              <div>
                <select
                  v-model="userRoleFilter"
                  class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                >
                  <option value="">Todos</option>
                  <option value="LIDER">Líder</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="ADMINISTRADOR">Administrador</option>
                </select>
              </div>
            </div>
            <div class="sm:hidden space-y-3 p-4">
              <div
                v-for="user in filteredUsers"
                :key="user.id"
                class="border border-gray-200 rounded-lg p-4 shadow-sm"
              >
                <div class="flex items-center justify-between mb-2">
                  <div>
                    <p class="text-sm font-semibold text-gray-900">{{ user.nome }}</p>
                    <p class="text-xs text-gray-500">{{ user.cargo }}</p>
                  </div>
                  <span 
                    :class="[
                      user.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
                      'px-2 inline-flex text-xs leading-5 font-semibold rounded-full'
                    ]"
                  >
                    {{ user.status }}
                  </span>
                </div>
                <p class="text-sm text-gray-500">
                  {{ user.whatsapp || 'Sem WhatsApp' }}
                </p>
                <div class="mt-3 flex flex-wrap gap-3 text-sm">
                  <button 
                    @click="handleEditarUsuario(user)"
                    class="text-primary-600 hover:text-primary-900"
                  >
                    Editar
                  </button>
                  <button 
                    @click="handleConfirmDelete(user)"
                    class="text-red-600 hover:text-red-900"
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
                  <button 
                    v-if="user.cargo.toUpperCase() === 'LIDER' && user.status === 'ativo'"
                    @click="confirmSendSsoLink(user.id)"
                    class="text-blue-600 hover:text-blue-900"
                    :disabled="sendingLink && userSendingLink === user.id"
                  >
                    <span v-if="sendingLink && userSendingLink === user.id">
                      Enviando...
                    </span>
                    <span v-else>
                      Enviar Link
                    </span>
                  </button>
                </div>
              </div>
            </div>
            <div class="hidden sm:block overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Whatsapp
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Função
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
                <tr v-for="user in filteredUsers" :key="user.id">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {{ user.nome }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ user.whatsapp }}
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
                      class="mr-3"
                    >
                      {{ user.status === 'ativo' ? 'Desativar' : 'Ativar' }}
                    </button>
                    <!-- Botão para enviar link SSO (apenas para líderes ativos) -->
                    <button 
                      v-if="user.cargo.toUpperCase() === 'LIDER' && user.status === 'ativo'"
                      @click="confirmSendSsoLink(user.id)"
                      class="text-blue-600 hover:text-blue-900"
                      :disabled="sendingLink && userSendingLink === user.id"
                    >
                      <span v-if="sendingLink && userSendingLink === user.id">
                        Enviando...
                      </span>
                      <span v-else>
                        Enviar Link
                      </span>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            </div>

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
                      <p class="text-sm font-semibold text-gray-900 group-active:text-primary-700 transition-colors">{{ cell.nome }}</p>
                      <span class="ml-2 text-primary-500 opacity-0 group-active:opacity-100 transition-opacity">→</span>
                  </div>
                    <p class="text-xs text-gray-500 mt-1">{{ cell.lider?.nome || 'Sem líder' }}</p>
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
            <div class="hidden sm:block overflow-x-auto">
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
                    {{ cell.nome }}
                    <span class="ml-2 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity inline-block">
                      →
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                    {{ cell.lider?.nome }}
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
        </div>

        <!-- Conexões WhatsApp -->
        <div v-if="activeTab === 'whatsapp'">
          <WhatsAppConnections ref="whatsappRef" />
        </div>
      </div>
    </main>

    <!-- Confirmar envio de link SSO -->
    <div v-if="showConfirmSendLink" class="modal-backdrop" @click.self="showConfirmSendLink = false">
      <div class="modal-panel modal-panel-sm p-6" @click.stop>
        <h3 class="text-lg leading-6 font-medium text-gray-900 mb-2">Confirmar envio</h3>
        <p class="text-sm text-gray-700 mb-4">Deseja enviar o link do relatório semanal para este líder agora?</p>
        <div class="sm:flex sm:flex-row-reverse gap-3">
          <button @click="handleSendSsoLink" class="inline-flex justify-center px-4 py-2 rounded-md text-white bg-primary-600 hover:bg-primary-700">Enviar</button>
          <button @click="showConfirmSendLink = false" class="inline-flex justify-center px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">Cancelar</button>
        </div>
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

    <!-- Modal de usuário -->
    <UserModal
      :is-open="showUserModal"
      :mode="modalMode"
      :user="selectedUser"
      @close="showUserModal = false"
      @save="handleSaveUser"
    />

    <!-- Modal de membros da célula -->
    <CellMembersModal
      :is-open="showCellMembersModal"
      :cell-id="selectedCellForMembers?.id || null"
      :cell-name="selectedCellForMembers?.nome"
      @close="showCellMembersModal = false"
    />

    <!-- Modal de confirmação de exclusão -->
    <div v-if="showDeleteConfirm" class="modal-backdrop" @click.self="showDeleteConfirm = false">
      <div class="modal-panel modal-panel-md p-6" @click.stop>
        <div class="sm:flex sm:items-start">
          <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Confirmar Exclusão
            </h3>
            <div class="mt-2 space-y-3">
              <p class="text-sm text-gray-700" v-if="entityPendingDelete === 'user'">
                Você está prestes a excluir o usuário <span class="font-semibold">"{{ entityInfo?.name }}"</span>.
                Se este usuário for líder de uma célula, a célula e todos os membros associados serão apagados.
              </p>
              <p class="text-sm text-gray-700" v-else>
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
            @click="entityPendingDelete === 'user' ? handleDeleteUser() : handleDeleteCell()"
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
      @close="closeCellModal"
      @save="handleSaveCell"
    />
  </div>
</template> 

<style scoped>
.card {
  @apply bg-white rounded-lg shadow-sm border border-neutral-200;
}
</style> 