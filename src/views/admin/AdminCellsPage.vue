<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks } from 'date-fns'
import CellModal from '../../components/CellModal.vue'
import CellMembersModal from '../../components/CellMembersModal.vue'
import AppIcon from '../../components/AppIcon.vue'
import SortableTableHeader from '../../components/admin/SortableTableHeader.vue'
import { adminService } from '../../services/adminService'
import type { Celula, Usuario } from '../../services/adminService'
import { toggleSortState, type SortState } from '../../utils/tableSort'
import {
  PUBLICO_CELULA_OPTIONS,
  PUBLICO_CELULA_BADGE_CLASS,
  formatPublicoCelula,
  type PublicoCelula,
} from '../../constants/publicoCelula'

// Estado para os dados
const loadingCells = ref(false)
const loadingStatus = ref(false)

// Lista de células
const cells = ref<Celula[]>([])
const cellPagination = ref({
  total: 0,
  pages: 0,
  currentPage: 1,
  perPage: 10
})

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number] | 'all'
const PAGE_SIZE_STORAGE_KEY = 'admin-cells-page-size'

function loadPageSize(): PageSizeOption {
  try {
    const saved = localStorage.getItem(PAGE_SIZE_STORAGE_KEY)
    if (saved === 'all') return 'all'
    const num = Number(saved)
    if (PAGE_SIZE_OPTIONS.includes(num as (typeof PAGE_SIZE_OPTIONS)[number])) {
      return num as PageSizeOption
    }
  } catch {
    /* ignore */
  }
  return 10
}

const pageSize = ref<PageSizeOption>(loadPageSize())

const getEffectiveLimit = () => (pageSize.value === 'all' ? 500 : pageSize.value)

const paginationRange = computed(() => {
  const { total, currentPage, perPage } = cellPagination.value
  if (total === 0) return { from: 0, to: 0 }
  const from = (currentPage - 1) * perPage + 1
  const to = Math.min(currentPage * perPage, total)
  return { from, to }
})

const handlePageSizeChange = () => {
  localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize.value))
  loadCells(1)
}

const sortState = ref<SortState | null>(null)

const handleSort = (key: string) => {
  sortState.value = toggleSortState(sortState.value, key)
  loadCells(1)
}

const totais = ref({ celulas: 0, membros: 0, semPublico: 0 })

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
  searchTerm: '',
  diaSemana: '',
  publico: '',
})

// Status de relatórios por semana do mês (Map<celulaId, boolean[]>)
// Array de 4 posições: [semana1, semana2, semana3, semana4]
const statusSemanas = ref<Map<number, boolean[]>>(new Map())
const mesAtual = ref(new Date().getMonth())
const anoAtual = ref(new Date().getFullYear())

// Calcular as 4 semanas do mês atual
const calcularSemanasDoMes = () => {
  const hoje = new Date()
  const inicioMes = startOfMonth(hoje)
  const fimMes = endOfMonth(hoje)
  
  const semanas: Array<{ inicio: Date; fim: Date }> = []
  let semanaAtual = startOfWeek(inicioMes, { weekStartsOn: 1 })
  
  // Sempre retornar 4 semanas
  for (let i = 0; i < 4; i++) {
    const fimSemana = endOfWeek(semanaAtual, { weekStartsOn: 1 })
    semanas.push({
      inicio: semanaAtual,
      fim: fimSemana > fimMes ? fimMes : fimSemana
    })
    semanaAtual = addWeeks(semanaAtual, 1)
  }
  
  return semanas
}

// Determinar quantas semanas já passaram no mês
const semanasPassadas = computed(() => {
  const hoje = new Date()
  hoje.setHours(23, 59, 59, 999) // Fim do dia atual
  const semanas = calcularSemanasDoMes()
  let count = 0
  
  for (const semana of semanas) {
    // Se a semana já terminou ou está em andamento
    if (semana.fim <= hoje) {
      count++
    } else {
      break
    }
  }
  
  return Math.max(1, count) // Sempre mostrar pelo menos 1 bolinha
})

// Carregar status de relatórios das semanas do mês (bulk)
const loadStatusSemanas = async () => {
  if (cells.value.length === 0) {
    statusSemanas.value.clear()
    return
  }

  const hoje = new Date()
  const mes = hoje.getMonth()
  const ano = hoje.getFullYear()

  if (mes !== mesAtual.value || ano !== anoAtual.value) {
    statusSemanas.value.clear()
    mesAtual.value = mes
    anoAtual.value = ano
  }

  loadingStatus.value = true
  try {
    const ids = cells.value.map((c) => c.id)
    const { porCelula } = await adminService.statusRelatoriosCelulas(ids, mes + 1, ano)
    statusSemanas.value = new Map(
      Object.entries(porCelula).map(([id, arr]) => [Number(id), arr])
    )
  } catch (error) {
    console.error('Erro ao carregar status das semanas:', error)
  } finally {
    loadingStatus.value = false
  }
}

// Obter status das semanas de uma célula
const getStatusSemanas = (celulaId: number) => {
  return statusSemanas.value.get(celulaId) || []
}

const isFiltering = computed(
  () =>
    cellFilters.value.searchTerm.trim() !== '' ||
    cellFilters.value.diaSemana !== '' ||
    cellFilters.value.publico !== ''
)

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => cellFilters.value.searchTerm,
  () => {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
    searchDebounceTimer = setTimeout(() => {
      searchDebounceTimer = null
      loadCells(1)
    }, 300)
  }
)

const clearFilters = () => {
  cellFilters.value.searchTerm = ''
  cellFilters.value.diaSemana = ''
  cellFilters.value.publico = ''
  loadCells(1)
}

const filterSelectClass =
  'h-9 min-w-[8.5rem] cursor-pointer appearance-none rounded-lg border border-neutral-200 bg-neutral-50/80 pl-3 pr-8 text-sm text-neutral-700 transition-colors duration-200 hover:border-neutral-300 hover:bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20'

type ColumnKey =
  | 'publico'
  | 'membros'
  | 'supervisor'
  | 'colider'
  | 'dia'
  | 'horario'
  | 'endereco'
  | 'relatorios'
  | 'status'

const TOGGLEABLE_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'publico', label: 'Público' },
  { key: 'membros', label: 'Membros' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'colider', label: 'Co-líder' },
  { key: 'dia', label: 'Dia' },
  { key: 'horario', label: 'Horário' },
  { key: 'endereco', label: 'Endereço' },
  { key: 'relatorios', label: 'Relatórios (semana)' },
  { key: 'status', label: 'Status' },
]

const DEFAULT_COLUMN_VISIBILITY: Record<ColumnKey, boolean> = {
  publico: false,
  membros: true,
  supervisor: false,
  colider: false,
  dia: true,
  horario: true,
  endereco: false,
  relatorios: false,
  status: false,
}

const COLUMN_VISIBILITY_STORAGE_KEY = 'admin-cells-column-visibility-v2'

function loadColumnVisibility(): Record<ColumnKey, boolean> {
  try {
    const saved = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY)
    if (saved) {
      return { ...DEFAULT_COLUMN_VISIBILITY, ...JSON.parse(saved) }
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_COLUMN_VISIBILITY }
}

const columnVisibility = ref(loadColumnVisibility())
const showColumnPicker = ref(false)
const columnPickerRef = ref<HTMLElement | null>(null)

const isColumnVisible = (key: ColumnKey) => columnVisibility.value[key]

const optionalLabel = (value?: string | null) => value?.trim() || '—'

const formatDiaSemana = (dia?: string) => {
  if (!dia) return '—'
  return dia.replace('-feira', '').trim()
}

const activeFilterChips = computed(() => {
  const chips: { key: 'search' | 'diaSemana' | 'publico'; label: string }[] = []
  const term = cellFilters.value.searchTerm.trim()
  if (term) chips.push({ key: 'search', label: term })
  if (cellFilters.value.diaSemana) {
    chips.push({ key: 'diaSemana', label: formatDiaSemana(cellFilters.value.diaSemana) })
  }
  if (cellFilters.value.publico) {
    chips.push({ key: 'publico', label: formatPublicoCelula(cellFilters.value.publico) })
  }
  return chips
})

function removeFilterChip(key: 'search' | 'diaSemana' | 'publico') {
  if (key === 'search') cellFilters.value.searchTerm = ''
  if (key === 'diaSemana') cellFilters.value.diaSemana = ''
  if (key === 'publico') cellFilters.value.publico = ''
  loadCells(1)
}

const toggleColumn = (key: ColumnKey) => {
  columnVisibility.value = {
    ...columnVisibility.value,
    [key]: !columnVisibility.value[key],
  }
  localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(columnVisibility.value))
}

const resetColumns = () => {
  columnVisibility.value = { ...DEFAULT_COLUMN_VISIBILITY }
  localStorage.removeItem(COLUMN_VISIBILITY_STORAGE_KEY)
}

const publicoBadgeClass = (publico?: string) => {
  const key = (publico || 'nao_informado') as PublicoCelula
  return PUBLICO_CELULA_BADGE_CLASS[key] ?? PUBLICO_CELULA_BADGE_CLASS.nao_informado
}

const exportingCsv = ref(false)

const exportarCsv = async () => {
  try {
    exportingCsv.value = true
    await adminService.exportarCelulasCsv({
      publico: cellFilters.value.publico || undefined,
      diaSemana: cellFilters.value.diaSemana || undefined,
      search: cellFilters.value.searchTerm.trim() || undefined,
    })
    showFeedback('Exportação concluída')
  } catch (error) {
    console.error('Erro ao exportar CSV:', error)
    showFeedback('Erro ao exportar CSV', 'error')
  } finally {
    exportingCsv.value = false
  }
}

const onDocumentClick = (event: MouseEvent) => {
  if (!showColumnPicker.value || !columnPickerRef.value) return
  if (!columnPickerRef.value.contains(event.target as Node)) {
    showColumnPicker.value = false
  }
}

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
    const response = await adminService.listarUsuarios(1, 100, ['LIDER', 'SUPERVISOR', 'ADMINISTRADOR', 'PASTOR'])
    availableLeaders.value = response.usuarios.filter(u => 
      u.status === 'ativo' && 
      (u.cargo === 'LIDER' || u.cargo === 'SUPERVISOR' || u.cargo === 'ADMINISTRADOR' || u.cargo === 'PASTOR')
    )
  } catch (error) {
    console.error('Erro ao carregar líderes:', error)
    showFeedback('Erro ao carregar líderes disponíveis', 'error')
  }
}


// Carregar células
const loadCells = async (page: number = 1) => {
  try {
    loadingCells.value = true

    const response = await adminService.listarCelulas(
      page,
      getEffectiveLimit(),
      undefined,
      cellFilters.value.diaSemana || undefined,
      cellFilters.value.searchTerm.trim() || undefined,
      cellFilters.value.publico || undefined,
      sortState.value ? { sortBy: sortState.value.key, sortDir: sortState.value.dir } : undefined,
    )

    if (!response || typeof response !== 'object') {
      showFeedback('Resposta inválida do servidor', 'error')
      return
    }

    if (!response.celulas || !Array.isArray(response.celulas)) {
      showFeedback('Formato de resposta inválido', 'error')
      return
    }

    cells.value = response.celulas
    cellPagination.value = response.pagination
    if (response.totais) {
      totais.value = response.totais
    } else {
      totais.value = {
        celulas: response.pagination?.total ?? 0,
        membros: response.celulas.reduce(
          (sum: number, c: Celula & { _count?: { membros?: number } }) =>
            sum + (c._count?.membros ?? 0),
          0
        ),
      }
    }
  } catch (error) {
    console.error('Erro ao carregar células:', error)
    showFeedback('Erro ao carregar células', 'error')
  } finally {
    loadingCells.value = false
    void loadStatusSemanas()
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
      publico: cellData.publico,
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
onMounted(() => {
  loadCells()
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-neutral-800">Células</h1>
        <p class="mt-1 text-xs sm:text-sm text-neutral-500">Gerencie células do sistema</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          @click="exportarCsv"
          :disabled="exportingCsv || loadingCells"
          class="inline-flex items-center px-4 py-2 border border-neutral-300 text-sm font-medium rounded-md shadow-sm text-neutral-700 bg-white hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ exportingCsv ? 'Exportando…' : 'Exportar CSV' }}
        </button>
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
    </div>

    <!-- Filtros -->
    <section
      aria-label="Filtros da lista de células"
      class="mb-4 overflow-hidden rounded-xl border border-neutral-200/90 bg-white shadow-sm"
    >
      <div class="flex flex-col lg:flex-row lg:items-stretch">
        <!-- Busca -->
        <div
          class="relative flex min-w-0 flex-1 items-center border-b border-neutral-100 lg:border-b-0 lg:border-r lg:border-neutral-100"
          :aria-busy="loadingCells && !!cellFilters.searchTerm.trim()"
        >
          <AppIcon
            name="search"
            size="sm"
            class="pointer-events-none absolute left-3.5 text-neutral-400"
            aria-hidden="true"
          />
          <input
            id="cell-search"
            v-model="cellFilters.searchTerm"
            type="search"
            autocomplete="off"
            spellcheck="false"
            enterkeyhint="search"
            class="h-11 w-full min-w-0 border-0 bg-transparent pl-10 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-0"
            placeholder="Buscar células, líderes ou endereços…"
          >
          <div class="absolute inset-y-0 right-0 flex items-center pr-3">
            <span
              v-if="loadingCells && cellFilters.searchTerm.trim()"
              class="h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-primary-600 motion-reduce:animate-none"
              aria-hidden="true"
            />
            <button
              v-else-if="cellFilters.searchTerm"
              type="button"
              class="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Limpar busca"
              @click="cellFilters.searchTerm = ''"
            >
              <AppIcon name="close" size="sm" aria-hidden="true" />
            </button>
          </div>
        </div>

        <!-- Selects compactos -->
        <div class="flex flex-wrap items-center gap-2 px-3 py-2.5 lg:shrink-0">
          <div class="relative">
            <select
              id="cell-dia-semana"
              v-model="cellFilters.diaSemana"
              :class="filterSelectClass"
              aria-label="Filtrar por dia da semana"
              @change="loadCells(1)"
            >
              <option value="">Todos os dias</option>
              <option value="Segunda-feira">Segunda</option>
              <option value="Terça-feira">Terça</option>
              <option value="Quarta-feira">Quarta</option>
              <option value="Quinta-feira">Quinta</option>
              <option value="Sexta-feira">Sexta</option>
              <option value="Sábado">Sábado</option>
              <option value="Domingo">Domingo</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-2.5 flex items-center" aria-hidden="true">
              <svg class="h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div class="relative">
            <select
              id="cell-publico"
              v-model="cellFilters.publico"
              :class="filterSelectClass"
              aria-label="Filtrar por público"
              @change="loadCells(1)"
            >
              <option value="">Todos os públicos</option>
              <option v-for="opt in PUBLICO_CELULA_OPTIONS" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-2.5 flex items-center" aria-hidden="true">
              <svg class="h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Chips de filtros ativos -->
      <div
        v-if="isFiltering"
        class="flex flex-wrap items-center gap-2 border-t border-neutral-100 bg-neutral-50/70 px-3 py-2"
      >
        <span class="text-xs font-medium text-neutral-500">Filtros ativos:</span>
        <button
          v-for="chip in activeFilterChips"
          :key="chip.key"
          type="button"
          class="inline-flex max-w-[14rem] items-center gap-1 rounded-full border border-neutral-200 bg-white py-1 pl-2.5 pr-1.5 text-xs font-medium text-neutral-700 shadow-sm transition-colors hover:border-neutral-300 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer"
          :aria-label="`Remover filtro ${chip.label}`"
          @click="removeFilterChip(chip.key)"
        >
          <span class="truncate">{{ chip.label }}</span>
          <AppIcon name="close" size="xs" class="shrink-0 text-neutral-400" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="ml-auto text-xs font-medium text-primary-600 transition-colors hover:text-primary-700 focus:outline-none focus-visible:underline cursor-pointer"
          @click="clearFilters"
        >
          Limpar tudo
        </button>
      </div>
    </section>

    <!-- Totais + colunas (desktop) -->
    <div class="mb-3 flex items-center justify-between gap-3">
      <div
        class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600 tabular-nums transition-opacity duration-200 min-w-0"
        :class="loadingCells ? 'opacity-40' : 'opacity-100'"
        aria-label="Resumo de células e membros"
      >
        <span class="inline-flex items-center gap-2">
          <AppIcon name="grid" size="sm" class="text-primary-500 shrink-0" aria-hidden="true" />
          <span class="font-semibold text-neutral-800">{{ totais.celulas.toLocaleString('pt-BR') }}</span>
          <span>{{ totais.celulas === 1 ? 'célula' : 'células' }}</span>
        </span>
        <span class="inline-flex items-center gap-2">
          <AppIcon name="users" size="sm" class="text-primary-500 shrink-0" aria-hidden="true" />
          <span class="font-semibold text-neutral-800">{{ totais.membros.toLocaleString('pt-BR') }}</span>
          <span>{{ totais.membros === 1 ? 'membro' : 'membros' }}</span>
        </span>
      </div>

      <div ref="columnPickerRef" class="relative hidden sm:block shrink-0">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg border border-transparent hover:border-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 touch-manipulation"
          :aria-expanded="showColumnPicker"
          aria-haspopup="true"
          aria-controls="column-picker-panel"
          @click.stop="showColumnPicker = !showColumnPicker"
        >
          <AppIcon name="grid" size="sm" aria-hidden="true" />
          Colunas
        </button>
        <div
          v-if="showColumnPicker"
          id="column-picker-panel"
          role="group"
          aria-label="Visibilidade das colunas"
          class="absolute right-0 z-20 mt-1 w-52 max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-neutral-200 bg-white py-2 shadow-lg"
          @click.stop
        >
          <p class="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
            Exibir colunas
          </p>
          <label
            v-for="col in TOGGLEABLE_COLUMNS"
            :key="col.key"
            class="flex items-center gap-2.5 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 cursor-pointer"
          >
            <input
              type="checkbox"
              class="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              :checked="isColumnVisible(col.key)"
              @change="toggleColumn(col.key)"
            >
            {{ col.label }}
          </label>
          <div class="mt-1 border-t border-neutral-100 pt-1 px-2">
            <button
              type="button"
              class="w-full px-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              @click="resetColumns"
            >
              Restaurar padrão
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loadingCells" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>

    <div v-else-if="cells.length === 0" class="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden p-8 sm:p-12">
      <div class="text-center">
        <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
          <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="text-base sm:text-lg font-semibold text-gray-900 mb-2">
          {{ isFiltering ? 'Nenhuma célula encontrada' : 'Nenhuma célula cadastrada' }}
        </h3>
        <p class="text-sm sm:text-base text-gray-500 max-w-sm mx-auto">
          {{ isFiltering
            ? `Não encontramos células com os filtros aplicados${cellFilters.searchTerm ? ` para "${cellFilters.searchTerm}"` : ''}.`
            : 'Comece criando sua primeira célula usando o botão acima.' }}
        </p>
        <button
          v-if="isFiltering"
          type="button"
          class="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md touch-manipulation"
          @click="clearFilters"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Limpar filtros
        </button>
      </div>
    </div>

    <div v-else class="bg-white shadow overflow-hidden sm:rounded-lg">
      <!-- Lista mobile -->
      <div class="sm:hidden space-y-2.5 p-3">
        <div
          v-for="cell in cells"
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
              <div class="flex items-center mb-0.5 gap-1.5">
                <p class="text-sm font-semibold text-gray-900 group-active:text-primary-700 transition-colors truncate">{{ cell.lider?.nome || 'Sem líder' }}</p>
                <div class="flex items-center gap-1 ml-1">
                  <template v-if="loadingStatus">
                    <span
                      v-for="index in semanasPassadas"
                      :key="index"
                      class="w-2 h-2 rounded-full flex-shrink-0 bg-gray-300 animate-pulse"
                    ></span>
                  </template>
                  <template v-else>
                    <span
                      v-for="(enviado, index) in getStatusSemanas(cell.id).slice(0, semanasPassadas)"
                      :key="index"
                      :class="enviado ? 'bg-green-500' : 'bg-red-500'"
                      class="w-2 h-2 rounded-full flex-shrink-0"
                      :title="`Semana ${index + 1}: ${enviado ? 'Relatório enviado' : 'Relatório não enviado'}`"
                    ></span>
                  </template>
                </div>
              </div>
              <p class="text-xs font-medium text-gray-700 truncate">{{ cell.nome }}</p>
              <span
                class="inline-flex mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                :class="publicoBadgeClass(cell.publico)"
              >
                {{ formatPublicoCelula(cell.publico) }}
              </span>
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
              <SortableTableHeader
                label="Líder"
                sort-key="lider"
                :active-key="sortState?.key ?? null"
                :direction="sortState?.dir ?? 'asc'"
                @sort="handleSort"
              />
              <SortableTableHeader
                label="Célula"
                sort-key="nome"
                :active-key="sortState?.key ?? null"
                :direction="sortState?.dir ?? 'asc'"
                @sort="handleSort"
              />
              <SortableTableHeader
                v-if="isColumnVisible('publico')"
                label="Público"
                sort-key="publico"
                :active-key="sortState?.key ?? null"
                :direction="sortState?.dir ?? 'asc'"
                @sort="handleSort"
              />
              <SortableTableHeader
                v-if="isColumnVisible('supervisor')"
                label="Supervisor"
                sort-key="supervisor"
                :active-key="sortState?.key ?? null"
                :direction="sortState?.dir ?? 'asc'"
                @sort="handleSort"
              />
              <SortableTableHeader
                v-if="isColumnVisible('colider')"
                label="Co-líder"
                sort-key="colider"
                :active-key="sortState?.key ?? null"
                :direction="sortState?.dir ?? 'asc'"
                @sort="handleSort"
              />
              <SortableTableHeader
                v-if="isColumnVisible('membros')"
                label="Membros"
                sort-key="membros"
                :active-key="sortState?.key ?? null"
                :direction="sortState?.dir ?? 'asc'"
                @sort="handleSort"
              />
              <SortableTableHeader
                v-if="isColumnVisible('dia')"
                label="Dia"
                sort-key="dia"
                :active-key="sortState?.key ?? null"
                :direction="sortState?.dir ?? 'asc'"
                @sort="handleSort"
              />
              <SortableTableHeader
                v-if="isColumnVisible('horario')"
                label="Horário"
                sort-key="horario"
                :active-key="sortState?.key ?? null"
                :direction="sortState?.dir ?? 'asc'"
                @sort="handleSort"
              />
              <SortableTableHeader
                v-if="isColumnVisible('endereco')"
                label="Endereço"
                sort-key="endereco"
                :active-key="sortState?.key ?? null"
                :direction="sortState?.dir ?? 'asc'"
                @sort="handleSort"
              />
              <th
                v-if="isColumnVisible('relatorios')"
                scope="col"
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Relatórios
              </th>
              <SortableTableHeader
                v-if="isColumnVisible('status')"
                label="Status"
                sort-key="status"
                :active-key="sortState?.key ?? null"
                :direction="sortState?.dir ?? 'asc'"
                @sort="handleSort"
              />
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr 
              v-for="cell in cells" 
              :key="cell.id"
              @click="handleVerCelula(cell)"
              class="cursor-pointer transition-all duration-200 hover:bg-blue-50 hover:shadow-sm hover:border-l-4 hover:border-l-primary-500 group"
            >
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 group-hover:text-primary-700 transition-colors">
                <div class="flex items-center gap-2">
                  <span>{{ cell.lider?.nome || 'Sem líder' }}</span>
                  <div v-if="!isColumnVisible('relatorios')" class="flex items-center gap-1">
                    <template v-if="loadingStatus">
                      <span
                        v-for="index in semanasPassadas"
                        :key="index"
                        class="w-2 h-2 rounded-full bg-gray-300 animate-pulse"
                      ></span>
                    </template>
                    <template v-else>
                      <span
                        v-for="(enviado, index) in getStatusSemanas(cell.id).slice(0, semanasPassadas)"
                        :key="index"
                        :class="enviado ? 'bg-green-500' : 'bg-red-500'"
                        class="w-2 h-2 rounded-full"
                        :title="`Semana ${index + 1}: ${enviado ? 'Relatório enviado' : 'Relatório não enviado'}`"
                      ></span>
                    </template>
                  </div>
                  <span class="ml-2 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity inline-block">
                    →
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                {{ cell.nome }}
              </td>
              <td
                v-if="isColumnVisible('publico')"
                class="px-6 py-4 whitespace-nowrap text-sm"
              >
                <span
                  class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold"
                  :class="publicoBadgeClass(cell.publico)"
                >
                  {{ formatPublicoCelula(cell.publico) }}
                </span>
              </td>
              <td
                v-if="isColumnVisible('supervisor')"
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 group-hover:text-gray-700 transition-colors"
              >
                {{ optionalLabel(cell.supervisor?.nome) }}
              </td>
              <td
                v-if="isColumnVisible('colider')"
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 group-hover:text-gray-700 transition-colors"
              >
                {{ optionalLabel(cell.coLider?.nome) }}
              </td>
              <td
                v-if="isColumnVisible('membros')"
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 group-hover:text-gray-700 transition-colors"
              >
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 group-hover:bg-blue-200 transition-colors tabular-nums">
                  {{ cell._count?.membros || 0 }}
                </span>
              </td>
              <td
                v-if="isColumnVisible('dia')"
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 group-hover:text-gray-700 transition-colors"
              >
                {{ formatDiaSemana(cell.diaSemana) }}
              </td>
              <td
                v-if="isColumnVisible('horario')"
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 tabular-nums group-hover:text-gray-700 transition-colors"
              >
                {{ cell.horario }}
              </td>
              <td
                v-if="isColumnVisible('endereco')"
                class="px-6 py-4 text-sm text-gray-500 group-hover:text-gray-700 transition-colors max-w-xs truncate"
                :title="cell.endereco || undefined"
              >
                {{ optionalLabel(cell.endereco) }}
              </td>
              <td
                v-if="isColumnVisible('relatorios')"
                class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 group-hover:text-gray-700 transition-colors"
              >
                <div class="flex items-center gap-1">
                  <template v-if="loadingStatus">
                    <span
                      v-for="index in semanasPassadas"
                      :key="index"
                      class="w-2 h-2 rounded-full bg-gray-300 animate-pulse"
                    ></span>
                  </template>
                  <template v-else>
                    <span
                      v-for="(enviado, index) in getStatusSemanas(cell.id).slice(0, semanasPassadas)"
                      :key="index"
                      :class="enviado ? 'bg-green-500' : 'bg-red-500'"
                      class="w-2 h-2 rounded-full"
                      :title="`Semana ${index + 1}: ${enviado ? 'Relatório enviado' : 'Relatório não enviado'}`"
                    ></span>
                  </template>
                </div>
              </td>
              <td
                v-if="isColumnVisible('status')"
                class="px-6 py-4 whitespace-nowrap text-sm group-hover:text-gray-700 transition-colors"
              >
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                  :class="cell.ativo !== false ? 'bg-green-100 text-green-800' : 'bg-neutral-100 text-neutral-600'"
                >
                  {{ cell.ativo !== false ? 'Ativa' : 'Inativa' }}
                </span>
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
      <div
        v-if="cells.length > 0"
        class="bg-white px-4 py-3 flex flex-col gap-3 border-t border-gray-200 sm:px-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label class="inline-flex items-center gap-2 text-sm text-gray-700">
            <span class="whitespace-nowrap">Itens por página</span>
            <div class="relative">
              <select
                v-model="pageSize"
                :class="[filterSelectClass, 'min-w-[5.5rem] h-8']"
                aria-label="Itens por página"
                @change="handlePageSizeChange"
              >
                <option v-for="opt in PAGE_SIZE_OPTIONS" :key="opt" :value="opt">
                  {{ opt }}
                </option>
                <option value="all">Todos</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-2.5 flex items-center" aria-hidden="true">
                <svg class="h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </label>
          <p class="text-sm text-gray-700 tabular-nums">
            Mostrando
            <span class="font-medium">{{ paginationRange.from }}</span>
            até
            <span class="font-medium">{{ paginationRange.to }}</span>
            de
            <span class="font-medium">{{ cellPagination.total }}</span>
            {{ cellPagination.total === 1 ? 'célula' : 'células' }}
          </p>
        </div>

        <div v-if="cellPagination.pages > 1" class="flex items-center justify-between sm:justify-end gap-3">
          <div class="flex sm:hidden gap-2">
            <button
              type="button"
              :disabled="cellPagination.currentPage === 1"
              @click="handleCellPageChange(cellPagination.currentPage - 1)"
              class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              type="button"
              :disabled="cellPagination.currentPage === cellPagination.pages"
              @click="handleCellPageChange(cellPagination.currentPage + 1)"
              class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
          <nav class="relative z-0 hidden sm:inline-flex rounded-md shadow-sm -space-x-px" aria-label="Paginação de células">
            <button
              type="button"
              :disabled="cellPagination.currentPage === 1"
              @click="handleCellPageChange(cellPagination.currentPage - 1)"
              class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span class="sr-only">Anterior</span>
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
            <button
              v-for="page in cellPagination.pages"
              :key="page"
              type="button"
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
            <button
              type="button"
              :disabled="cellPagination.currentPage === cellPagination.pages"
              @click="handleCellPageChange(cellPagination.currentPage + 1)"
              class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
    <div v-if="showDeleteConfirm" class="modal-backdrop" @click.self="showDeleteConfirm = false">
      <div class="modal-panel modal-panel-md p-6" @click.stop>
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

