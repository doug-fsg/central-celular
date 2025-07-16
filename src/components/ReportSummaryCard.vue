<script setup lang="ts">
import { computed } from 'vue'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  relatorio: {
    dataInicio: Date | string
    dataFim: Date | string
    presencasCelula?: number
    presencasCulto?: number
    totalMembros?: number
    teveCelula: boolean
    teveCulto: boolean
    observacoes?: string
  }
}>()

const periodoFormatado = computed(() => {
  const inicio = typeof props.relatorio.dataInicio === 'string' 
    ? new Date(props.relatorio.dataInicio) 
    : props.relatorio.dataInicio
  
  const fim = typeof props.relatorio.dataFim === 'string' 
    ? new Date(props.relatorio.dataFim) 
    : props.relatorio.dataFim

  return `${format(inicio, 'dd/MM', { locale: ptBR })} - ${format(fim, 'dd/MM', { locale: ptBR })}`
})

const porcentagemCelula = computed(() => {
  if (!props.relatorio.presencasCelula || !props.relatorio.totalMembros) return 0
  return Math.round((props.relatorio.presencasCelula / props.relatorio.totalMembros) * 100)
})

const porcentagemCulto = computed(() => {
  if (!props.relatorio.presencasCulto || !props.relatorio.totalMembros) return 0
  return Math.round((props.relatorio.presencasCulto / props.relatorio.totalMembros) * 100)
})
</script>

<template>
  <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
    <!-- Cabeçalho -->
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-medium text-gray-900">
        Relatório da Semana
      </h3>
      <span class="text-xs text-gray-500">
        {{ periodoFormatado }}
      </span>
    </div>

    <!-- Grid de Cards -->
    <div class="grid grid-cols-2 gap-3 mb-4">
      <!-- Card de Célula -->
      <div class="bg-blue-50 rounded-lg p-3">
        <div class="flex items-center justify-between">
          <span class="text-xs text-blue-600 font-medium">Célula</span>
          <AppIcon name="users" class="text-blue-600" size="sm" />
        </div>
        <div class="mt-1">
          <p class="text-2xl font-semibold text-blue-700">
            {{ props.relatorio.presencasCelula || 0 }}
            <span class="text-sm font-normal text-blue-600">
              /{{ props.relatorio.totalMembros || 0 }}
            </span>
          </p>
          <p class="text-xs text-blue-600 mt-1">
            {{ porcentagemCelula }}% de presença
          </p>
        </div>
      </div>

      <!-- Card de Culto -->
      <div class="bg-purple-50 rounded-lg p-3">
        <div class="flex items-center justify-between">
          <span class="text-xs text-purple-600 font-medium">Culto</span>
          <AppIcon name="church" class="text-purple-600" size="sm" />
        </div>
        <div class="mt-1">
          <p class="text-2xl font-semibold text-purple-700">
            {{ props.relatorio.presencasCulto || 0 }}
            <span class="text-sm font-normal text-purple-600">
              /{{ props.relatorio.totalMembros || 0 }}
            </span>
          </p>
          <p class="text-xs text-purple-600 mt-1">
            {{ porcentagemCulto }}% de presença
          </p>
        </div>
      </div>
    </div>

    <!-- Status dos Eventos -->
    <div class="flex space-x-4 mb-4">
      <div class="flex items-center">
        <div :class="[
          'w-2 h-2 rounded-full mr-2',
          props.relatorio.teveCelula ? 'bg-blue-500' : 'bg-gray-300'
        ]"></div>
        <span class="text-xs" :class="props.relatorio.teveCelula ? 'text-blue-600' : 'text-gray-500'">
          Célula Realizada
        </span>
      </div>
      <div class="flex items-center">
        <div :class="[
          'w-2 h-2 rounded-full mr-2',
          props.relatorio.teveCulto ? 'bg-purple-500' : 'bg-gray-300'
        ]"></div>
        <span class="text-xs" :class="props.relatorio.teveCulto ? 'text-purple-600' : 'text-gray-500'">
          Culto Realizado
        </span>
      </div>
    </div>

    <!-- Observações (se houver) -->
    <div v-if="props.relatorio.observacoes" class="mb-3">
      <p class="text-xs text-gray-500 italic">
        "{{ props.relatorio.observacoes }}"
      </p>
    </div>
  </div>
</template> 