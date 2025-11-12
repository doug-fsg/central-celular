<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Teleport } from 'vue'
import relatorioService from '../services/relatorioService'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface FrequenciaItem {
  dataInicio: string | Date
  dataFim: string | Date
  dataEnvio: string | Date
  presenteCelula: boolean
  presenteCulto: boolean
}

const props = defineProps<{
  isOpen: boolean
  membroId: number | null
  membroNome: string
  celulaId: number | null
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const loading = ref(false)
const frequencia = ref<FrequenciaItem[]>([])

const formatarData = (data: string | Date) => {
  if (!data) return '-'
  const date = typeof data === 'string' ? new Date(data) : data
  return format(date, 'dd/MM/yyyy', { locale: ptBR })
}

const formatarPeriodo = (dataInicio: string | Date, dataFim: string | Date) => {
  if (!dataInicio || !dataFim) return '-'
  const inicio = typeof dataInicio === 'string' ? new Date(dataInicio) : dataInicio
  const fim = typeof dataFim === 'string' ? new Date(dataFim) : dataFim
  return `${format(inicio, 'dd/MM', { locale: ptBR })} - ${format(fim, 'dd/MM/yyyy', { locale: ptBR })}`
}


async function loadFrequencia() {
  if (!props.membroId || !props.celulaId) return
  
  try {
    loading.value = true
    const data = await relatorioService.obterFrequenciaMembro(props.membroId, props.celulaId)
    frequencia.value = data
  } catch (error) {
    console.error('Erro ao carregar frequência:', error)
    frequencia.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.isOpen, (open) => {
  if (open) {
    loadFrequencia()
  }
})

watch(() => props.membroId, () => {
  if (props.isOpen) {
    loadFrequencia()
  }
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-50 sm:bg-gray-500 sm:bg-opacity-75 sm:flex sm:items-center sm:justify-center sm:p-4">
      <!-- Overlay apenas no desktop -->
      <div v-if="isOpen" class="hidden sm:block fixed inset-0 bg-gray-500 bg-opacity-75" @click="emit('close')"></div>
      
      <!-- Modal Container -->
      <div class="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-lg sm:shadow-xl flex flex-col sm:relative">
        <!-- Header Fixo -->
        <div class="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-white">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <!-- Botão voltar no mobile -->
            <button 
              @click="emit('close')" 
              class="sm:hidden flex-shrink-0 w-10 h-10 flex items-center justify-center -ml-2 text-gray-600 active:text-gray-900 active:bg-gray-100 rounded-full transition-colors"
              aria-label="Voltar"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div class="flex-1 min-w-0">
              <h3 class="text-base sm:text-lg font-medium text-gray-900 truncate">
                Frequência
              </h3>
              <p class="text-xs sm:text-sm text-gray-500 truncate mt-0.5">{{ membroNome }}</p>
            </div>
          </div>
          <!-- Botão fechar apenas no desktop -->
          <button 
            @click="emit('close')" 
            class="hidden sm:flex flex-shrink-0 w-8 h-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xl font-bold"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        
        <!-- Conteúdo com Scroll -->
        <div class="flex-1 overflow-y-auto overscroll-contain -webkit-overflow-scrolling-touch px-4 sm:px-6 py-4 sm:py-6">
          <div v-if="loading" class="text-center text-gray-500 py-8">
            Carregando...
          </div>
          
          <div v-else-if="frequencia.length === 0" class="text-center text-gray-500 py-8">
            <p class="text-sm">Nenhum relatório encontrado</p>
          </div>
          
          <!-- Tabela de Frequência -->
          <div v-else class="overflow-x-auto">
            <!-- Mobile: Cards -->
            <div class="sm:hidden space-y-3">
              <div
                v-for="item in frequencia"
                :key="item.id"
                class="bg-gray-50 rounded-lg p-3 border border-gray-200"
              >
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium text-gray-700">Período:</span>
                    <span class="text-xs text-gray-900">{{ formatarPeriodo(item.dataInicio, item.dataFim) }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium text-gray-700">Enviado em:</span>
                    <span class="text-xs text-gray-900">{{ formatarData(item.dataEnvio) }}</span>
                  </div>
                  <div class="pt-2 border-t border-gray-200 space-y-1.5">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-medium text-gray-700">Célula:</span>
                      <span 
                        :class="item.presenteCelula 
                          ? 'text-xs font-medium text-green-600' 
                          : 'text-xs font-medium text-red-600'"
                      >
                        {{ item.presenteCelula ? '✓ Presente' : '✗ Ausente' }}
                      </span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-medium text-gray-700">Culto:</span>
                      <span 
                        :class="item.presenteCulto 
                          ? 'text-xs font-medium text-green-600' 
                          : 'text-xs font-medium text-red-600'"
                      >
                        {{ item.presenteCulto ? '✓ Presente' : '✗ Ausente' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Desktop: Tabela -->
            <table class="hidden sm:table min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enviado em</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Célula</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Culto</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="(item, index) in frequencia" :key="index" class="hover:bg-gray-50">
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {{ formatarPeriodo(item.dataInicio, item.dataFim) }}
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {{ formatarData(item.dataEnvio) }}
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-center">
                    <span 
                      :class="item.presenteCelula 
                        ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800' 
                        : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800'"
                    >
                      {{ item.presenteCelula ? 'Presente' : 'Ausente' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-center">
                    <span 
                      :class="item.presenteCulto 
                        ? 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800' 
                        : 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800'"
                    >
                      {{ item.presenteCulto ? 'Presente' : 'Ausente' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

