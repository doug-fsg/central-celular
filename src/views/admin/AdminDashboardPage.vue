<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { adminService } from '../../services/adminService'
import type { AdminStats } from '../../services/adminService'
import relatorioService from '../../services/relatorioService'
import FrequencyChart from '../../components/FrequencyChart.vue'
import AppIcon from '../../components/AppIcon.vue'
import type { Usuario, Celula } from '../../services/adminService'

// Estado para os dados
const loading = ref(true)
const periodoSelecionado = ref('semana') // 'semana', 'mes', 'trimestre', 'ano'

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

// Lista de líderes disponíveis
const availableLeaders = ref<Usuario[]>([])
const leaderFilterId = ref<string>('')
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

// Médias do período
const mediaCelulaPeriodo = computed(() => {
  if (!chartSeriesCelula.value.length) return 0
  
  let sum = 0
  let diasComEventos = 0
  
  chartSeriesCelula.value.forEach(percentual => {
    sum += percentual
    diasComEventos++
  })
  
  return diasComEventos > 0 ? Math.round(sum / diasComEventos) : 0
})

const mediaCultoPeriodo = computed(() => {
  if (!chartSeriesCulto.value.length) return 0
  
  let sum = 0
  let diasComEventos = 0
  
  chartSeriesCulto.value.forEach(percentual => {
    sum += percentual
    diasComEventos++
  })
  
  return diasComEventos > 0 ? Math.round(sum / diasComEventos) : 0
})

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
    
    await loadAvailableLeaders()
    await loadCharts()
    
    // Adicionar listener para fechar dropdown ao clicar fora
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 100)
  } catch (error) {
    console.error('Erro ao carregar dados:', error)
  } finally {
    loading.value = false
  }
})

// Atualizar dados quando mudar o período ou líder
async function atualizarDados() {
  try {
    loading.value = true
    const liderId = leaderFilterId.value ? Number(leaderFilterId.value) : undefined
    stats.value = await adminService.obterEstatisticas(periodoSelecionado.value, liderId)
    await loadCharts()
  } catch (error) {
    console.error('Erro ao atualizar dados:', error)
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
  atualizarDados()
})

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
  }
}

// Utilitários de período
function getPeriodRange(periodo: string) {
  const now = new Date()
  let start: Date
  let end: Date
  
  if (periodo === 'semana') {
    const semanaPassada = subWeeks(now, 1)
    start = startOfWeek(semanaPassada, { weekStartsOn: 1 })
    end = endOfWeek(semanaPassada, { weekStartsOn: 1 })
  } else if (periodo === 'trimestre') {
    start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  } else if (periodo === 'ano') {
    start = new Date(now.getFullYear(), 0, 1)
    end = new Date(now.getFullYear(), 11, 31)
  } else {
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

    const agg = new Map<string, { cel: { pres: number; tot: number }; cul: { pres: number; tot: number } }>()

    for (const cell of filteredCells) {
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

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
    <div class="px-0 sm:px-0">
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
        <div class="space-y-6" @click="showLeaderDropdown = false">
          <!-- Cabeçalho -->
          <div class="mb-4 sm:mb-6">
            <h1 class="text-xl sm:text-2xl font-bold text-neutral-800">Dashboard</h1>
            <p class="mt-1 text-xs sm:text-sm text-neutral-500">Visão geral das células e membros</p>
          </div>
          
          <!-- Grupo 1: Cards sempre visíveis -->
          <div class="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 mb-4 sm:mb-6">
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
                  <div class="flex flex-row items-center gap-1.5 sm:gap-3 text-xs text-neutral-500">
                    <span class="flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                      <span>{{ stats.indicadores.consolidadoresAtivos }} consolid. </span>
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
            
            <!-- Seletor de período -->
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
                    <div class="relative">
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
      </div>
    </div>
  </main>
</template>

<style scoped>
.card {
  @apply bg-white rounded-lg shadow-sm border border-neutral-200;
}
</style>

