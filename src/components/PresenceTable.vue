<template>
  <div class="presence-table">
    <div v-if="loading" class="flex justify-center my-8">
      <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
    </div>
    
    <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
      <p>{{ error }}</p>
      <button @click="carregarPresencas" class="text-sm underline mt-2">Tentar novamente</button>
    </div>
    
    <div v-else>
      <div v-if="membros.length === 0" class="text-center py-4">
        <p class="text-gray-500">Nenhum membro cadastrado</p>
      </div>
      
      <div v-else>
        <ul class="space-y-2">
          <li v-for="membro in membros" :key="membro.id" 
              class="flex items-center justify-between py-2 px-3 bg-white rounded-lg">
            <div class="flex items-center gap-2">
              <span class="font-medium">{{ membro.nome || membro.name }}</span>
              <div class="flex gap-1">
                <span v-if="membro.isCoLeader" 
                      class="text-[10px] px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded">
                  Co-líder
                </span>
                <span v-if="membro.isConsolidator"
                      class="text-[10px] px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded">
                  Consolidador
                </span>
                <span v-if="membro.isHost"
                      class="text-[10px] px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded">
                  Anfitrião
                </span>
              </div>
            </div>
            
            <div class="flex gap-1">
              <button 
                v-if="teveCelula"
                @click="togglePresenca(membro, TIPO_EVENTO.CELULA)"
                :disabled="relatorioFinalizado || !relatorioId"
                class="min-w-[90px] py-1.5 rounded-lg flex items-center justify-center transition-all duration-200"
                :class="getButtonClass(membro.presencaCelula)"
              >
                <span class="text-lg mr-1">🏠</span>
                <span class="text-sm">Célula</span>
              </button>
              <button 
                @click="togglePresenca(membro, TIPO_EVENTO.CULTO)"
                :disabled="relatorioFinalizado || !relatorioId"
                class="min-w-[90px] py-1.5 rounded-lg flex items-center justify-center transition-all duration-200"
                :class="getButtonClass(membro.presencaCulto)"
              >
                <span class="text-lg mr-1">✝️</span>
                <span class="text-sm">Culto</span>
              </button>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import api from '../services/api'
import relatorioService, { TIPO_EVENTO, STATUS_PRESENCA } from '../services/relatorioService'

// Interfaces
interface Membro {
  id: number | string;
  nome?: string;
  name?: string;
  telefone?: string;
  isCoLeader?: boolean;
  isConsolidator?: boolean;
  isHost?: boolean;
  presencaCelula?: number;
  presencaCulto?: number;
}

export interface Relatorio {
  id: number;
  celulaId: number;
  dataInicio: string | Date;
  dataFim: string | Date;
  evento: number;
  status: number;
  dataEnvio?: string | Date;
  observacoes?: string;
}

interface Presenca {
  id?: number;
  relatorioId: number;
  membroId: number;
  status: number;
  tipo?: number; // 0 = celula, 1 = culto
}

// Props
const props = defineProps({
  relatorioId: {
    type: Number,
    default: 0
  },
  relatorioFinalizado: {
    type: Boolean,
    default: false
  },
  celulaId: {
    type: Number,
    default: 0
  },
  members: {
    type: Array,
    default: () => []
  },
  teveCelula: {
    type: Boolean,
    default: true
  }
})

// Emits
const emit = defineEmits(['presence-change'])

// Estado local
const loading = ref(false)
const error = ref<string | null>(null)
const membros = ref<Membro[]>([])
const presencas = ref<Presenca[]>([])
const relatorio = ref<Relatorio | null>(null)

// Métodos
const formatarDataRange = (dataInicio?: string | Date, dataFim?: string | Date) => {
  if (!dataInicio || !dataFim) return ''
  
  const inicio = typeof dataInicio === 'string' ? new Date(dataInicio) : dataInicio
  const fim = typeof dataFim === 'string' ? new Date(dataFim) : dataFim
  
  return `${format(inicio, 'dd/MM')} - ${format(fim, 'dd/MM/yyyy')}`
}

// Usar membros do componente pai
watch(() => props.members, (newMembers) => {
  if (newMembers && newMembers.length > 0) {
    console.log('Recebendo membros do componente pai:', newMembers)
    membros.value = newMembers.map(m => ({
      ...m,
      presencaCelula: m.presencaCelula ?? STATUS_PRESENCA.AUSENTE,
      presencaCulto: m.presencaCulto ?? STATUS_PRESENCA.AUSENTE,
      isCoLeader: m.isCoLeader || false,
      isConsolidator: m.isConsolidator || false,
      isHost: m.isHost || false
    }))
  }
}, { immediate: true, deep: true })

const carregarRelatorio = async () => {
  if (!props.relatorioId) return
  
  try {
    const response = await relatorioService.obterRelatorio(props.relatorioId)
    relatorio.value = response
    presencas.value = response.presencas || []
    
    // Atualizar status dos membros com base nas presenças
    if (presencas.value.length > 0) {
      membros.value = membros.value.map(membro => {
        const presencaCelula = presencas.value.find(p => 
          p.membroId === parseInt(membro.id.toString()) && p.tipo === TIPO_EVENTO.CELULA
        )
        const presencaCulto = presencas.value.find(p => 
          p.membroId === parseInt(membro.id.toString()) && p.tipo === TIPO_EVENTO.CULTO
        )
        
        return {
          ...membro,
          presencaCelula: presencaCelula ? presencaCelula.status : undefined,
          presencaCulto: presencaCulto ? presencaCulto.status : undefined
        }
      })
    }
  } catch (error: any) {
    console.error('Erro ao carregar relatório:', error)
    error.value = error.message || 'Erro ao carregar relatório'
    presencas.value = [] // Reset presencas on error
  }
}

const carregarPresencas = async () => {
  if (!props.relatorioId) {
    presencas.value = []
    return
  }
  
  loading.value = true
  error.value = null
  
  try {
    await carregarRelatorio()
  } catch (error: any) {
    console.error('Erro ao carregar presenças:', error)
    error.value = error.message || 'Erro ao carregar presenças'
  } finally {
    loading.value = false
  }
}

const getPresencaStatus = (membroId: number | string, tipo: number): number => {
  const id = typeof membroId === 'string' ? parseInt(membroId) : membroId
  const presenca = presencas.value.find(p => p.membroId === id && p.tipo === tipo)
  return presenca ? presenca.status : STATUS_PRESENCA.AUSENTE
}

const getButtonClass = (presencaStatus?: number) => {
  return presencaStatus === STATUS_PRESENCA.PRESENTE
    ? 'bg-primary-600 text-white shadow-sm hover:bg-primary-700'
    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
}

const togglePresenca = async (membro: Membro, tipoEvento: number, forceStatus?: number) => {
  if (props.relatorioFinalizado || !props.relatorioId) return

  const membroId = Number(membro.id)
  let currentStatus: number | undefined
  
  if (tipoEvento === TIPO_EVENTO.CELULA) {
    currentStatus = membro.presencaCelula
  } else {
    currentStatus = membro.presencaCulto
  }

  const newStatus = forceStatus !== undefined ? forceStatus :
    currentStatus === STATUS_PRESENCA.PRESENTE
      ? STATUS_PRESENCA.AUSENTE
      : STATUS_PRESENCA.PRESENTE

  try {
    const updatedPresenca = await relatorioService.registrarPresenca(
      props.relatorioId,
      membroId,
      newStatus,
      tipoEvento
    )
    
    // Atualizar o estado local do membro
    const membroIndex = membros.value.findIndex(m => Number(m.id) === membroId)
    if (membroIndex !== -1) {
      if (tipoEvento === TIPO_EVENTO.CELULA) {
        membros.value[membroIndex].presencaCelula = newStatus
      } else {
        membros.value[membroIndex].presencaCulto = newStatus
      }
    }

    emit('presence-change', membroId, newStatus, tipoEvento)
  } catch (error) {
    console.error('Erro ao atualizar presença:', error)
  }
}

// Lifecycle hooks
onMounted(async () => {
  await carregarPresencas()
})

// Watchers
watch(() => props.relatorioId, async () => {
  if (props.relatorioId) {
    await carregarPresencas()
  }
})
</script>

<style scoped>
.presence-table {
  width: 100%;
}
</style> 