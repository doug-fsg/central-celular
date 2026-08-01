<template>
  <div class="report-list">
    <div class="mb-4">
      <h2 class="text-xl font-semibold mb-2">Relatórios</h2>
      <p class="text-sm text-gray-500">Selecione uma semana para ver os relatórios</p>
    </div>
    
    <div class="mb-6">
      <WeekSelector 
        @weekChange="carregarRelatorios"
        @eventChange="handleEventChange"
      />
    </div>
    
    <div v-if="loading" class="flex justify-center my-8">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
    
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      <p>{{ error }}</p>
      <button @click="carregarRelatorios" class="text-sm underline mt-2">Tentar novamente</button>
    </div>
    
    <div v-else-if="relatorios.length === 0" class="text-center py-8">
      <p class="text-gray-500">Nenhum relatório encontrado para esta semana</p>
      <button 
        v-if="canCreateReport"
        @click="criarNovoRelatorio" 
        class="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
      >
        Criar Relatório
      </button>
    </div>
    
    <div v-else class="grid grid-cols-1 gap-4">
      <div 
        v-for="relatorio in relatorios" 
        :key="relatorio.id"
        class="border rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
      >
        <div class="flex justify-between items-start">
          <div>
            <h3 class="font-medium">{{ relatorio.celula?.nome || 'Célula' }}</h3>
            <p class="text-sm text-gray-500">
              {{ formatarSemana() }}
            </p>
          </div>
          
          <div>
            <span 
              class="px-2 py-1 text-xs rounded-full"
              :class="relatorio.status === STATUS_RELATORIO.ENVIADO ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
            >
              {{ relatorio.status === STATUS_RELATORIO.ENVIADO ? 'Enviado' : 'Rascunho' }}
            </span>
          </div>
        </div>
        
        <div class="mt-3 flex flex-wrap gap-2">
          <span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
            {{ relatorio.evento === TIPO_EVENTO.CELULA ? '🏠 Célula' : '✝️ Culto' }}
            {{ formatarData(relatorio.dataInicio) }}
          </span>
        </div>
        
        <div v-if="relatorio.observacoes" class="mt-3 text-sm">
          <p class="text-gray-700">{{ relatorio.observacoes }}</p>
        </div>
        
        <div class="mt-4 flex justify-end">
          <router-link 
            :to="{ name: 'attendance' }"
            class="text-blue-500 hover:text-blue-700 text-sm"
          >
            {{ relatorio.status === STATUS_RELATORIO.ENVIADO ? 'Visualizar' : 'Editar' }}
          </router-link>
        </div>
      </div>
    </div>
    
    <div v-if="canCreateReport && relatorios.length > 0" class="mt-4 flex justify-center">
      <button 
        @click="criarNovoRelatorio" 
        class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
      >
        Criar Novo Relatório
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'vue-router'
import { useReportStore } from '../stores/reportStore'
import { useUserStore } from '../stores/userStore'
import { useMemberStore } from '../stores/memberStore'
import relatorioService, { TIPO_EVENTO, STATUS_RELATORIO } from '../services/relatorioService'
import WeekSelector from './WeekSelector.vue'

const reportStore = useReportStore()
const userStore = useUserStore()
const memberStore = useMemberStore()
const router = useRouter()

// Estado local
const loading = ref(false)
const error = ref<string | null>(null)
const relatorios = ref<any[]>([])
const tipoEvento = ref(TIPO_EVENTO.CELULA)

// Computed
const canCreateReport = computed(() => {
  // Verificar permissões do usuário
  return userStore.isLeader || userStore.isAdmin || userStore.isSuperAdmin
})

// Métodos
const formatarSemana = () => {
  const dataInicio = reportStore.currentWeek.dataInicio
  return `Semana ${format(dataInicio, 'w', { locale: ptBR })}`
}

const formatarData = (data: string | Date) => {
  const date = typeof data === 'string' ? new Date(data) : data
  return format(date, 'dd/MM', { locale: ptBR })
}

const handleEventChange = (evento: number) => {
  tipoEvento.value = evento
  carregarRelatorios()
}

const carregarRelatorios = async () => {
  loading.value = true
  error.value = null
  
  try {
    const result = await relatorioService.listarRelatorios({
      celulaId: memberStore.celulaId as number,
      dataInicio: reportStore.currentWeek.dataInicio,
      dataFim: reportStore.currentWeek.dataFim,
      evento: tipoEvento.value
    })
    
    relatorios.value = result
  } catch (e: any) {
    console.error('Erro ao carregar relatórios:', e)
    error.value = e.message || 'Erro ao carregar relatórios'
  } finally {
    loading.value = false
  }
}

const criarNovoRelatorio = async () => {
  try {
    loading.value = true
    
    // Criar relatório para a semana atual
    const response = await relatorioService.criarRelatorio(
      memberStore.celulaId,
      reportStore.currentWeek.dataInicio,
      reportStore.currentWeek.dataFim,
      tipoEvento.value
    )
    
    // Navegar para a página de edição do relatório
    router.push({ name: 'attendance' })
  } catch (e: any) {
    console.error('Erro ao criar relatório:', e)
    error.value = e.message || 'Erro ao criar relatório'
  } finally {
    loading.value = false
  }
}

// Lifecycle hooks
onMounted(async () => {
  try {
    await memberStore.carregarMembros()
    await carregarRelatorios()
  } catch (e: any) {
    console.error('Erro ao carregar dados:', e)
  }
})

// Watchers
watch(() => reportStore.currentWeek, () => {
  carregarRelatorios()
}, { deep: true })
</script>

<style scoped>
.report-list {
  width: 100%;
}
</style> 