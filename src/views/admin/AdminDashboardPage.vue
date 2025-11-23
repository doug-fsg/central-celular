<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { adminService } from '../../services/adminService'
import type { AdminStats } from '../../services/adminService'
import relatorioService from '../../services/relatorioService'
import FrequencyChart from '../../components/FrequencyChart.vue'
import AppIcon from '../../components/AppIcon.vue'
import type { Usuario, Celula } from '../../services/adminService'

const router = useRouter()

// Estado para os dados
const loading = ref(true)
const loadingCharts = ref(false)
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

// Líderes filtrados (apenas líderes ativos)
const filteredLeaders = computed(() => {
  return availableLeaders.value.filter((u: Usuario) => 
    u.cargo === 'LIDER' && u.status === 'ativo'
  )
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


// Carregamento inicial dos dados
onMounted(async () => {
  try {
    loading.value = true
    
    // Carregar dados essenciais em paralelo (não bloqueia a renderização)
    const liderId = leaderFilterId.value ? Number(leaderFilterId.value) : undefined
    
    // Carregar stats e líderes em paralelo para acelerar
    const [statsData] = await Promise.all([
      adminService.obterEstatisticas(periodoSelecionado.value, liderId),
      loadAvailableLeaders()
    ])
    
    stats.value = statsData
    
    
    // Carregar gráficos de forma assíncrona (não bloqueia a renderização)
    // Isso permite que a página apareça rapidamente
    loadCharts().catch(err => {
      console.error('Erro ao carregar gráficos (não crítico):', err)
    })
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
    // Carregar gráficos de forma assíncrona para não bloquear
    loadCharts().catch(err => {
      console.error('Erro ao atualizar gráficos:', err)
    })
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
  
  // Buscar páginas restantes em paralelo para acelerar
  if (totalPages > 1) {
    const promises = []
    for (let p = 2; p <= totalPages; p++) {
      promises.push(adminService.listarCelulas(p, 100))
    }
    const responses = await Promise.all(promises)
    responses.forEach(resp => {
      all = all.concat(resp.celulas || [])
    })
  }
  
  return all
}

// Consolida dados apenas para médias dos cards
async function loadCharts() {
  try {
    loadingCharts.value = true
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

    // Buscar relatórios de todas as células em paralelo (muito mais rápido!)
    const relatorioPromises = filteredCells.map(cell => 
      relatorioService.listarRelatorios({ celulaId: cell.id, dataInicio: startStr, dataFim: endStr })
        .catch(err => {
          console.warn(`Erro ao buscar relatórios da célula ${cell.id}:`, err)
          return [] // Retorna array vazio em caso de erro para não quebrar o fluxo
        })
    )
    
    const allRelatorios = await Promise.all(relatorioPromises)
    
    // Processar todos os relatórios
    allRelatorios.flat().forEach((r: any) => {
      const key = String(r.dataInicio).slice(0, 10)
      if (!agg.has(key)) agg.set(key, { cel: { pres: 0, tot: 0 }, cul: { pres: 0, tot: 0 } })
      const entry = agg.get(key)!

      const presentesCel = r.presentesCelula ?? 0
      const totalCel = r.totalCelula ?? 0
      const presentesCul = r.presentesCulto ?? 0
      const totalCul = r.totalCulto ?? 0

      entry.cel.pres += presentesCel
      entry.cel.tot += totalCel
      entry.cul.pres += presentesCul
      entry.cul.tot += totalCul
    })

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
  } finally {
    loadingCharts.value = false
  }
}

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
      <div v-else class="mt-1">
        <!-- Dashboard -->
        <div class="space-y-3 sm:space-y-5" @click="showLeaderDropdown = true">
          <!-- Cabeçalho -->
          <div class="mb-4 sm:mb-6">
            <h1 class="text-xl sm:text-2xl font-bold text-neutral-800">Dashboard</h1>
            <p class="mt-1 text-xs sm:text-sm text-neutral-500">Visão geral das células e membros</p>
          </div>
          
          <!-- Grupo 1: Cards sempre visíveis -->
          <div class="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 mb-1 sm:mb-6">
            <!-- Total de células -->
            <div 
              @click="router.push({ name: 'admin-cells' })"
              class="card p-4 sm:p-5 bg-white border border-neutral-200 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary-300 active:scale-[0.98] group touch-manipulation"
              style="-webkit-tap-highlight-color: rgba(59, 130, 246, 0.1);"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <p class="text-xs sm:text-sm font-medium text-neutral-600 mb-1 group-hover:text-primary-600 transition-colors">Total de Células</p>
                  <p class="text-2xl sm:text-3xl font-bold text-neutral-900 group-hover:text-primary-700 transition-colors">{{ stats.resumo.totalCelulas }}</p>
                </div>
                <div class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-neutral-100 group-hover:bg-primary-50 flex-shrink-0 transition-colors">
                  <AppIcon name="grid" class="text-neutral-600 group-hover:text-primary-600 transition-colors" size="sm" />
                </div>
              </div>
            </div>
            
            <!-- Total de membros -->
            <div 
              @click="router.push({ name: 'admin-members' })"
              class="card p-4 sm:p-5 bg-white border border-neutral-200 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary-300 active:scale-[0.98] group touch-manipulation"
              style="-webkit-tap-highlight-color: rgba(59, 130, 246, 0.1);"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <p class="text-xs sm:text-sm font-medium text-neutral-600 mb-1 group-hover:text-primary-600 transition-colors">Total de Membros</p>
                  <div class="flex items-baseline gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    <p class="text-2xl sm:text-3xl font-bold text-neutral-900 group-hover:text-primary-700 transition-colors">{{ stats.resumo.totalMembros }}</p>
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
                  <!-- Informações dentro do card (desktop) -->
                  <div class="hidden sm:flex flex-row items-center gap-1.5 sm:gap-3 text-xs text-neutral-500">
                    <span class="flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                      <span>{{ stats.indicadores.consolidadoresAtivos }} consolidadores </span>
                    </span>
                    <span class="flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                      <span>{{ stats.indicadores.coLideresAtivos }} co-líderes</span>
                    </span>
                  </div>
                </div>
                <div class="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-neutral-100 group-hover:bg-primary-50 flex-shrink-0 transition-colors">
                  <AppIcon name="users" class="text-neutral-600 group-hover:text-primary-600 transition-colors" size="sm" />
                </div>
              </div>
            </div>
          </div>
          
          <!-- Informações de consolidadores e co-líderes (mobile) -->
          <div class="flex sm:hidden justify-center items-center gap-4 -mt-2 mb-1 text-[10px] text-neutral-500">
            <span class="flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              <span>{{ stats.indicadores.consolidadoresAtivos }} consolidadores</span>
            </span>
            <span class="flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
              <span>{{ stats.indicadores.coLideresAtivos }} co-líderes</span>
            </span>
          </div>
          
          <!-- Seletor de período -->
            <div class="mb-4 sm:mb-6">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                <div class="flex gap-1.5 flex-nowrap">
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
                <div class="flex items-center gap-2 min-w-0">
                  <label class="text-xs text-neutral-600 whitespace-nowrap flex-shrink-0">Líder:</label>
                  <div class="flex items-center gap-1.5 min-w-0 flex-1 sm:flex-none sm:w-auto">
                    <div class="relative min-w-0 flex-1 sm:w-48">
                      <select
                        v-model="leaderFilterId"
                        class="w-full min-w-0 px-3 py-1.5 pr-8 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-neutral-700 appearance-none cursor-pointer"
                      >
                        <option value="">Todos os líderes</option>
                        <option 
                          v-for="l in filteredLeaders" 
                          :key="l.id" 
                          :value="String(l.id)"
                        >
                          {{ l.nome }}
                        </option>
                      </select>
                      <div class="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg class="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <button
                      v-if="leaderFilterId"
                      @click="leaderFilterId = ''"
                      type="button"
                      class="flex-shrink-0 p-1.5 text-neutral-400 hover:text-neutral-600 active:text-neutral-700 transition-colors touch-manipulation"
                      aria-label="Limpar filtro de líder"
                      title="Limpar filtro"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
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

