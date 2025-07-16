<script setup lang="ts">
import WeekSelector from '../components/WeekSelector.vue'
import StatsOverview from '../components/StatsOverview.vue'
import { useMemberStore } from '../stores/memberStore'
import { useReportStore } from '../stores/reportStore'
import { computed, ref, watch, onMounted } from 'vue'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import relatorioService, { TIPO_EVENTO, STATUS_RELATORIO } from '../services/relatorioService'

const memberStore = useMemberStore()
const reportStore = useReportStore()

// Estados do componente
const loading = ref(false)
const error = ref<string | null>(null)
const relatorios = ref<any[]>([])
const tipoEvento = ref(TIPO_EVENTO.CELULA) // Por padrão, mostrar relatório de célula

// Computed properties
const totalMembers = computed(() => {
  // Filtrar apenas membros ativos
  return memberStore.getAllMembers.filter(m => m.isActive).length
})

// Estatísticas para o relatório selecionado
const estatisticas = computed(() => {
  const relatorio = relatorios.value.find(r => r.evento === tipoEvento.value)
  
  if (!relatorio || !relatorio.presencas || relatorio.presencas.length === 0) {
    return {
      totalPresentes: 0,
      percentualPresenca: 0
    }
  }
  
  const totalPresentes = relatorio.presencas.filter(p => p.status === 1).length
  const percentualPresenca = totalMembers.value > 0 ? Math.round((totalPresentes / totalMembers.value) * 100) : 0
  
  return {
    totalPresentes,
    percentualPresenca
  }
})

// Método para verificar se um membro está presente em um relatório específico
function getMembroPresenca(membroId: number, tipoEvento: number) {
  const relatorio = relatorios.value.find(r => r.evento === tipoEvento)
  if (!relatorio || !relatorio.presencas) return false
  
  const presenca = relatorio.presencas.find(p => p.membroId === membroId)
  return presenca && presenca.status === 1
}

// Métodos
async function loadData() {
  loading.value = true
  error.value = null
  
  try {
    await memberStore.carregarMembros()
    await loadReports()
  } catch (e: any) {
    error.value = e.message || 'Erro ao carregar dados'
  } finally {
    loading.value = false
  }
}

async function loadReports() {
  try {
    // Buscar relatórios para a semana atual
    const result = await relatorioService.listarRelatorios({
      celula: memberStore.celulaId,
      dataInicio: reportStore.currentWeek.dataInicio,
      dataFim: reportStore.currentWeek.dataFim
    })
    
    // Carregar detalhes de cada relatório (incluindo presenças)
    const relatorioDaSemanaCelula = result.find(r => r.evento === TIPO_EVENTO.CELULA)
    const relatorioDaSemanaCulto = result.find(r => r.evento === TIPO_EVENTO.CULTO)
    
    const relatorioCelula = relatorioDaSemanaCelula ? await relatorioService.obterRelatorio(relatorioDaSemanaCelula.id) : null
    const relatorioCulto = relatorioDaSemanaCulto ? await relatorioService.obterRelatorio(relatorioDaSemanaCulto.id) : null
    
    relatorios.value = [
      relatorioCelula,
      relatorioCulto
    ].filter(Boolean)
  } catch (e: any) {
    console.error('Erro ao carregar relatórios:', e)
    error.value = e.message || 'Erro ao carregar relatórios'
  }
}

function handleWeekChange(week) {
  // A semana foi alterada no WeekSelector, vamos recarregar os relatórios
  loadReports()
}

function handleEventChange(evento) {
  tipoEvento.value = evento
}

function formatarData(data: string | Date) {
  if (!data) return ''
  const date = typeof data === 'string' ? new Date(data) : data
  return format(date, 'dd/MM/yyyy', { locale: ptBR })
}

function formatarStatus(status: number) {
  return status === STATUS_RELATORIO.ENVIADO ? 'Enviado' : 'Rascunho'
}

// Lifecycle hooks
onMounted(async () => {
  await loadData()
})

// Watchers
watch(() => reportStore.currentWeek, () => {
  loadReports()
}, { deep: true })
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p class="mt-1 text-gray-500">Visualize e gerencie os relatórios da sua célula</p>
        </div>
      </div>
      
      <!-- Seletor de semana -->
      <div class="mb-6">
        <WeekSelector 
          @weekChange="handleWeekChange"
          @eventChange="handleEventChange"
        />
      </div>
      
      <!-- Loading state -->
      <div v-if="loading" class="flex justify-center my-8">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
      
      <!-- Error state -->
      <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p>{{ error }}</p>
        <button @click="loadData" class="text-sm underline mt-2">Tentar novamente</button>
      </div>
      
      <!-- No reports state -->
      <div v-else-if="relatorios.length === 0" class="text-center py-8 bg-white rounded-lg shadow">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">Nenhum relatório encontrado</h3>
        <p class="mt-1 text-sm text-gray-500">Não há relatórios para a semana selecionada.</p>
        <div class="mt-6">
          <router-link to="/attendance" class="btn btn-primary">
            Ir para Frequência
          </router-link>
        </div>
      </div>
      
      <!-- Report content -->
      <div v-else>
        <!-- Stats overview -->
        <div class="mb-6">
          <StatsOverview 
            :totalMembers="totalMembers"
            :presentMembers="estatisticas.totalPresentes"
            :percentagePresent="estatisticas.percentualPresenca"
          />
        </div>
        
        <!-- Reports table -->
        <div class="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div class="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Relatórios da Semana
            </h3>
          </div>
          
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Período
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data de Envio
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Presenças
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="relatorio in relatorios" :key="relatorio.id" :class="relatorio.evento === tipoEvento ? 'bg-blue-50' : ''">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">
                      {{ relatorio.evento === TIPO_EVENTO.CELULA ? '🏠 Célula' : '✝️ Culto' }}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      {{ formatarData(relatorio.dataInicio) }} - {{ formatarData(relatorio.dataFim) }}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span 
                      class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      :class="relatorio.status === STATUS_RELATORIO.ENVIADO ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
                    >
                      {{ formatarStatus(relatorio.status) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ relatorio.dataEnvio ? formatarData(relatorio.dataEnvio) : '—' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ relatorio.presencas?.filter(p => p.status === 1).length || 0 }} / {{ totalMembers }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- Member attendance details -->
        <div v-if="relatorios.find(r => r.evento === tipoEvento)" class="bg-white shadow overflow-hidden sm:rounded-lg">
          <div class="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Detalhes de Presença - {{ tipoEvento === TIPO_EVENTO.CELULA ? 'Célula' : 'Culto' }}
            </h3>
          </div>
          
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Membro
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="membro in memberStore.getAllMembers.filter(m => m.isActive)" :key="membro.id">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">{{ membro.nome }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span 
                      class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      :class="getMembroPresenca(membro.id, tipoEvento) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                    >
                      {{ getMembroPresenca(membro.id, tipoEvento) ? 'Presente' : 'Ausente' }}
                    </span>
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

<style scoped>
.card {
  @apply bg-white rounded-lg shadow;
}

.btn {
  @apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2;
}

.btn-primary {
  @apply bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500;
}
</style>