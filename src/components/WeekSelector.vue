<template>
  <div class="week-selector">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold">{{ title || 'Selecione a semana' }}</h2>
      <div v-if="showRefresh" class="refresh-button" @click="recarregarDados">
        <i class="fas fa-sync-alt"></i>
      </div>
    </div>
    
    <div v-if="loading" class="flex justify-center my-4">
      <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
    </div>
    
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      <p>{{ error }}</p>
      <button @click="recarregarDados" class="text-sm underline mt-2">Tentar novamente</button>
    </div>
    
    <div class="bg-white shadow rounded-lg p-4 mb-4">
      <div class="flex justify-between items-center">
        <button 
          @click="previousWeek" 
          class="p-2 rounded-full hover:bg-gray-100"
          title="Semana anterior"
        >
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div class="text-center">
          <div class="text-lg font-medium">
            {{ formatarSemana(currentWeek.dataInicio, currentWeek.dataFim) }}
          </div>
          <div class="text-sm text-gray-500">
            {{ formatarDataRange(currentWeek.dataInicio, currentWeek.dataFim) }}
          </div>
          <div v-if="!isCurrentReportWeek" class="text-xs text-red-500 mt-1">
            Semana anterior - Não é mais possível enviar relatório
          </div>
        </div>
        
        <button 
          @click="nextWeek" 
          class="p-2 rounded-full hover:bg-gray-100"
          title="Próxima semana"
        >
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      <div class="mt-4 flex justify-center">
        <button 
          @click="goToCurrentWeek" 
          class="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"
        >
          Ir para semana atual
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useReportStore } from '../stores/reportStore'

const reportStore = useReportStore()

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  showRefresh: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['weekChange'])

// Estado local
const loading = ref(false)
const error = ref<string | null>(null)
const currentWeek = ref(reportStore.currentWeek)

// Computed
const isCurrentReportWeek = computed(() => {
  const semanaPermitida = reportStore.calcularPeriodoRelatorio()
  return format(currentWeek.value.dataInicio, 'yyyy-MM-dd') === format(semanaPermitida.dataInicio, 'yyyy-MM-dd')
})

// Métodos
const formatarSemana = (dataInicio: Date | string, dataFim: Date | string) => {
  const inicio = typeof dataInicio === 'string' ? new Date(dataInicio) : dataInicio
  return `Semana ${format(inicio, 'w', { locale: ptBR })}`
}

const formatarDataRange = (dataInicio: Date | string, dataFim: Date | string) => {
  const inicio = typeof dataInicio === 'string' ? new Date(dataInicio) : dataInicio
  const fim = typeof dataFim === 'string' ? new Date(dataFim) : dataFim
  return `${format(inicio, 'dd/MM')} - ${format(fim, 'dd/MM/yyyy')}`
}

const recarregarDados = async () => {
  loading.value = true
  error.value = null
  
  try {
    await reportStore.carregarRelatorios()
  } catch (e: any) {
    error.value = e.message || 'Erro ao carregar relatórios'
  } finally {
    loading.value = false
  }
}

const previousWeek = () => {
  reportStore.previousWeek()
  currentWeek.value = reportStore.currentWeek
  emit('weekChange', currentWeek.value)
}

const nextWeek = () => {
  reportStore.nextWeek()
  currentWeek.value = reportStore.currentWeek
  emit('weekChange', currentWeek.value)
}

const goToCurrentWeek = () => {
  reportStore.goToCurrentWeek()
  currentWeek.value = reportStore.currentWeek
  emit('weekChange', currentWeek.value)
}

// Lifecycle hooks
onMounted(async () => {
  // Não carregar relatórios automaticamente, apenas emitir o evento de mudança de semana
  // para que o componente pai possa lidar com isso
  emit('weekChange', currentWeek.value);
})

// Watchers
watch(() => reportStore.currentWeek, (newWeek) => {
  currentWeek.value = newWeek
}, { deep: true })
</script>

<style scoped>
.week-selector {
  width: 100%;
}

.refresh-button {
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.refresh-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
</style> 