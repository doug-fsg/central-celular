<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type TooltipItem
} from 'chart.js'
import api from '../services/api'

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface FrequencyData {
  data: string
  formatDate: string
  celula: number
  culto: number
  totalCelula: number
  totalCulto: number
}

interface Props {
  periodo: string
  celulaId?: number
}

const props = defineProps<Props>()

const loading = ref(false)
const error = ref<string | null>(null)
const frequencyData = ref<FrequencyData[]>([])
const isInitialized = ref(false)

// Função para calcular o range de datas baseado no período
const getPeriodRange = (periodo: string) => {
  const now = new Date()
  let start: Date
  let end = new Date()
  
  if (periodo === 'trimestre' || periodo === '3meses') {
    start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  } else if (periodo === '6meses') {
    start = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  } else if (periodo === 'ano') {
    start = new Date(now.getFullYear(), 0, 1)
  } else {
    // mes
    start = new Date(now.getFullYear(), now.getMonth(), 1)
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  }
  
  return { start, end }
}

// Carregar dados da API
const loadFrequencyData = async () => {
  try {
    loading.value = true
    error.value = null
    
    if (!props.periodo) {
      console.warn('Período não definido para carregar dados de frequência')
      return
    }
    
    const { start, end } = getPeriodRange(props.periodo)
    const startStr = start.toISOString().slice(0, 10)
    const endStr = end.toISOString().slice(0, 10)
    
    const params = new URLSearchParams({
      dataInicio: startStr,
      dataFim: endStr
    })
    
    if (props.celulaId) {
      params.append('celulaId', props.celulaId.toString())
    }
    
    console.log('[FrequencyChart] Fazendo requisição para:', `/relatorios/frequencia-por-data?${params}`)
    const response = await api.get(`/relatorios/frequencia-por-data?${params}`)
    console.log('[FrequencyChart] Resposta completa da API:', response)
    const data = Array.isArray(response) ? response : []
    console.log('[FrequencyChart] Dados recebidos da API:', data)
    frequencyData.value = data
    isInitialized.value = true
  } catch (err) {
    console.error('Erro ao carregar dados de frequência:', err)
    console.error('Detalhes do erro:', err)
    error.value = 'Erro ao carregar dados'
    frequencyData.value = []
    isInitialized.value = true
  } finally {
    loading.value = false
  }
}

// Dados do gráfico
const chartData = computed(() => {
  console.log('[FrequencyChart] Computando chartData, frequencyData:', frequencyData.value)
  
  if (!frequencyData.value || !frequencyData.value.length) {
    console.log('[FrequencyChart] Sem dados para o gráfico')
    return {
      labels: [],
      datasets: []
    }
  }

  const labels = frequencyData.value.map(item => item.formatDate)
  const celulaData = frequencyData.value.map(item => item.celula)
  const cultoData = frequencyData.value.map(item => item.culto)
  
  console.log('[FrequencyChart] Dados do gráfico:', { labels, celulaData, cultoData })

  return {
    labels: labels,
    datasets: [
      {
        label: 'Célula',
        data: celulaData,
        borderColor: 'rgb(59, 130, 246)', // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
      },
      {
        label: 'Culto',
        data: cultoData,
        borderColor: 'rgb(16, 185, 129)', // green-500
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: 'rgb(16, 185, 129)',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
      }
    ]
  }
})

// Configurações do gráfico
const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 20,
        font: {
          size: 14,
          weight: '500'
        }
      }
    },
    title: {
      display: true,
      text: 'Frequência por Data (Célula x Culto)',
      font: {
        size: 16,
        weight: '600'
      },
      padding: {
        top: 10,
        bottom: 30
      }
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      titleColor: '#374151',
      bodyColor: '#374151',
      borderColor: '#d1d5db',
      borderWidth: 1,
      cornerRadius: 8,
      displayColors: true,
      padding: 12,
      titleFont: {
        size: 14,
        weight: '600'
      },
      bodyFont: {
        size: 13,
        weight: '500'
      },
      callbacks: {
        title: (context: TooltipItem<'line'>[]) => {
          if (!context || !context.length) return ''
          const dataIndex = context[0].dataIndex
          if (!frequencyData.value || dataIndex >= frequencyData.value.length) return ''
          const date = frequencyData.value[dataIndex]?.data
          return date ? `Data: ${new Date(date).toLocaleDateString('pt-BR')}` : ''
        },
        label: (context: TooltipItem<'line'>) => {
          if (!context || !frequencyData.value) return ''
          const dataIndex = context.dataIndex
          if (dataIndex >= frequencyData.value.length) return ''
          const dataPoint = frequencyData.value[dataIndex]
          const datasetLabel = context.dataset.label
          const value = context.parsed.y
          
          if (!dataPoint) return `${datasetLabel}: ${value}`
          
          if (datasetLabel === 'Célula') {
            const total = dataPoint.totalCelula || 0
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0
            return `Célula: ${value} presentes (${percentage}% de ${total})`
          } else if (datasetLabel === 'Culto') {
            const total = dataPoint.totalCulto || 0
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0
            return `Culto: ${value} presentes (${percentage}% de ${total})`
          }
          
          return `${datasetLabel}: ${value}`
        }
      }
    }
  },
  scales: {
    x: {
      grid: {
        display: false
      },
      border: {
        display: false
      },
      ticks: {
        font: {
          size: 12,
          weight: '500'
        },
        color: '#6b7280'
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: '#f3f4f6',
        drawBorder: false
      },
      border: {
        display: false
      },
      ticks: {
        font: {
          size: 12,
          weight: '500'
        },
        color: '#6b7280',
        stepSize: 1
      }
    }
  },
  interaction: {
    intersect: false,
    mode: 'index' as const
  },
  elements: {
    line: {
      borderWidth: 3
    }
  }
}))

// Watchers para recarregar dados quando props mudarem
watch([() => props.periodo, () => props.celulaId], () => {
  if (props.periodo) {
    loadFrequencyData()
  }
}, { immediate: false })

onMounted(() => {
  if (props.periodo) {
    loadFrequencyData()
  }
})
</script>

<template>
  <div class="bg-white rounded-lg shadow p-6">
    <div v-if="loading || !isInitialized" class="flex items-center justify-center h-64">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
    
    <div v-else-if="error" class="flex items-center justify-center h-64 text-red-600">
      <div class="text-center">
        <svg class="mx-auto h-12 w-12 text-red-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p class="text-sm">{{ error }}</p>
      </div>
    </div>
    
    <div v-else-if="!frequencyData || !frequencyData.length" class="flex items-center justify-center h-64 text-gray-500">
      <div class="text-center">
        <svg class="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p class="text-sm">Nenhum dado encontrado para o período selecionado</p>
        <p class="text-xs text-gray-400 mt-1">Certifique-se de que há relatórios enviados no período</p>
      </div>
    </div>
    
    <div v-else class="h-64">
      <Line 
        :data="chartData" 
        :options="chartOptions"
        class="max-h-full"
      />
    </div>
  </div>
</template>
