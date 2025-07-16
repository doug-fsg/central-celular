<template>
  <div class="presence-grid">
    <div v-if="loading" class="flex justify-center my-8">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
    
    <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      <p>{{ error }}</p>
      <button @click="carregarPresencas" class="text-sm underline mt-2">Tentar novamente</button>
    </div>
    
    <div v-else-if="!evento" class="text-center py-8">
      <p class="text-gray-500">Selecione um evento para registrar presenças</p>
    </div>
    
    <div v-else>
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">
          {{ evento.tipo === 'CELULA' ? '🏠 Célula' : '✝️ Culto' }}
          <span class="text-sm text-gray-500 ml-2">
            {{ formatarData(evento.data) }}
            <span v-if="evento.localEvento" class="ml-1">- {{ evento.localEvento }}</span>
          </span>
        </h3>
        
        <div class="flex space-x-2">
          <button 
            v-if="!relatorioFinalizado && membros.length > 0"
            @click="marcarTodos('PRESENTE')" 
            class="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
          >
            Todos presentes
          </button>
          <button 
            v-if="!relatorioFinalizado && membros.length > 0"
            @click="marcarTodos('AUSENTE')" 
            class="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Todos ausentes
          </button>
        </div>
      </div>
      
      <div v-if="membros.length === 0" class="text-center py-4">
        <p class="text-gray-500">Nenhum membro cadastrado nesta célula</p>
      </div>
      
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Membro
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Justificativa
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="membro in membros" :key="membro.id">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">
                      {{ membro.nome }}
                    </div>
                    <div v-if="membro.telefone" class="text-sm text-gray-500">
                      {{ membro.telefone }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex space-x-2" v-if="!relatorioFinalizado">
                  <button 
                    @click="atualizarPresenca(membro.id, 'PRESENTE')"
                    class="px-3 py-1 rounded text-sm"
                    :class="getStatusButtonClass(membro.id, 'PRESENTE')"
                  >
                    Presente
                  </button>
                  <button 
                    @click="atualizarPresenca(membro.id, 'AUSENTE')"
                    class="px-3 py-1 rounded text-sm"
                    :class="getStatusButtonClass(membro.id, 'AUSENTE')"
                  >
                    Ausente
                  </button>
                  <button 
                    @click="atualizarPresenca(membro.id, 'JUSTIFICADO')"
                    class="px-3 py-1 rounded text-sm"
                    :class="getStatusButtonClass(membro.id, 'JUSTIFICADO')"
                  >
                    Justificado
                  </button>
                </div>
                <div v-else>
                  <span 
                    class="px-2 py-1 text-xs rounded-full"
                    :class="getStatusClass(getPresencaStatus(membro.id))"
                  >
                    {{ getPresencaStatus(membro.id) || 'Não registrado' }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4">
                <input 
                  v-if="!relatorioFinalizado && getPresencaStatus(membro.id) === 'JUSTIFICADO'"
                  type="text" 
                  v-model="justificativas[membro.id]" 
                  @blur="salvarJustificativa(membro.id)"
                  placeholder="Motivo da ausência"
                  class="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span v-else-if="getPresencaStatus(membro.id) === 'JUSTIFICADO'">
                  {{ justificativas[membro.id] || 'Sem justificativa' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import api from '../services/api'

// Interfaces
interface Membro {
  id: number
  nome: string
  telefone?: string
}

export interface Evento {
  id: number
  relatorioId: number
  tipo: 'CELULA' | 'CULTO'
  data: string
  localEvento?: string
}

interface Presenca {
  id?: number
  eventoId: number
  membroId: number
  status: 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO'
  justificativa?: string
}

// Props
const props = defineProps({
  relatorioId: {
    type: Number,
    required: true
  },
  evento: {
    type: Object as () => Evento | null,
    default: null
  },
  relatorioFinalizado: {
    type: Boolean,
    default: false
  }
})

// Estado local
const loading = ref(false)
const error = ref<string | null>(null)
const membros = ref<Membro[]>([])
const presencas = ref<Presenca[]>([])
const justificativas = ref<Record<number, string>>({})

// Métodos
const formatarData = (data: string) => {
  return format(parseISO(data), "EEEE, dd 'de' MMMM", { locale: ptBR })
}

const carregarMembros = async () => {
  try {
    const response = await api.get(`/celulas/${props.relatorioId}/membros`)
    membros.value = response
  } catch (error: any) {
    console.error('Erro ao carregar membros:', error)
    error.value = 'Erro ao carregar membros'
  }
}

const carregarPresencas = async () => {
  if (!props.evento) return
  
  loading.value = true
  error.value = null
  
  try {
    const response = await api.get(`/relatorios/${props.relatorioId}/eventos/${props.evento.id}/presencas`)
    presencas.value = response
    
    // Preencher justificativas
    justificativas.value = {}
    presencas.value.forEach(p => {
      if (p.justificativa) {
        justificativas.value[p.membroId] = p.justificativa
      }
    })
  } catch (error: any) {
    console.error('Erro ao carregar presenças:', error)
    error.value = 'Erro ao carregar presenças'
  } finally {
    loading.value = false
  }
}

const getPresencaStatus = (membroId: number): 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO' | null => {
  const presenca = presencas.value.find(p => p.membroId === membroId)
  return presenca ? presenca.status : null
}

const getStatusClass = (status: 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO' | null) => {
  switch (status) {
    case 'PRESENTE':
      return 'bg-green-100 text-green-800'
    case 'AUSENTE':
      return 'bg-red-100 text-red-800'
    case 'JUSTIFICADO':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getStatusButtonClass = (membroId: number, status: 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO') => {
  const currentStatus = getPresencaStatus(membroId)
  
  if (currentStatus === status) {
    switch (status) {
      case 'PRESENTE':
        return 'bg-green-500 text-white'
      case 'AUSENTE':
        return 'bg-red-500 text-white'
      case 'JUSTIFICADO':
        return 'bg-yellow-500 text-white'
    }
  } else {
    switch (status) {
      case 'PRESENTE':
        return 'bg-green-100 text-green-800 hover:bg-green-200'
      case 'AUSENTE':
        return 'bg-red-100 text-red-800 hover:bg-red-200'
      case 'JUSTIFICADO':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
    }
  }
}

const atualizarPresenca = async (membroId: number, status: 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO') => {
  if (props.relatorioFinalizado || !props.evento) return
  
  try {
    const presencaExistente = presencas.value.find(p => p.membroId === membroId)
    
    if (presencaExistente) {
      // Atualizar presença existente
      const response = await api.patch(
        `/relatorios/${props.relatorioId}/eventos/${props.evento.id}/presencas/${presencaExistente.id}`,
        { status }
      )
      
      // Atualizar na lista local
      const index = presencas.value.findIndex(p => p.id === presencaExistente.id)
      if (index !== -1) {
        presencas.value[index] = response
      }
    } else {
      // Criar nova presença
      const response = await api.post(
        `/relatorios/${props.relatorioId}/eventos/${props.evento.id}/presencas`,
        { membroId, status }
      )
      
      // Adicionar à lista local
      presencas.value.push(response)
    }
  } catch (error: any) {
    console.error('Erro ao atualizar presença:', error)
  }
}

const salvarJustificativa = async (membroId: number) => {
  if (props.relatorioFinalizado || !props.evento) return
  
  try {
    const presencaExistente = presencas.value.find(p => p.membroId === membroId)
    if (!presencaExistente) return
    
    // Atualizar justificativa
    const response = await api.patch(
      `/relatorios/${props.relatorioId}/eventos/${props.evento.id}/presencas/${presencaExistente.id}`,
      { justificativa: justificativas.value[membroId] }
    )
    
    // Atualizar na lista local
    const index = presencas.value.findIndex(p => p.id === presencaExistente.id)
    if (index !== -1) {
      presencas.value[index] = response
    }
  } catch (error: any) {
    console.error('Erro ao salvar justificativa:', error)
  }
}

const marcarTodos = async (status: 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADO') => {
  if (props.relatorioFinalizado || !props.evento) return
  
  try {
    // Chamar API para marcar todos com o mesmo status
    await api.post(
      `/relatorios/${props.relatorioId}/eventos/${props.evento.id}/presencas/todos`,
      { status }
    )
    
    // Recarregar presenças
    await carregarPresencas()
  } catch (error: any) {
    console.error('Erro ao marcar todos:', error)
  }
}

// Lifecycle hooks
onMounted(async () => {
  await carregarMembros()
  if (props.evento) {
    await carregarPresencas()
  }
})

// Watchers
watch(() => props.evento, async (newEvento) => {
  if (newEvento) {
    await carregarPresencas()
  } else {
    presencas.value = []
  }
})
</script>

<style scoped>
.presence-grid {
  width: 100%;
}
</style> 