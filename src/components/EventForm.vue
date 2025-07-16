<template>
  <div class="event-form">
    <h3 class="text-lg font-semibold mb-4">{{ isEditing ? 'Editar Evento' : 'Novo Evento' }}</h3>
    
    <form @submit.prevent="salvarEvento" class="space-y-4">
      <div class="form-group">
        <label for="tipo" class="block text-sm font-medium text-gray-700 mb-1">Tipo de Evento</label>
        <select 
          id="tipo" 
          v-model="formData.tipo" 
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        >
          <option value="CELULA">Célula</option>
          <option value="CULTO">Culto</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="data" class="block text-sm font-medium text-gray-700 mb-1">Data do Evento</label>
        <input 
          type="date" 
          id="data" 
          v-model="formData.data" 
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      
      <div class="form-group">
        <label for="localEvento" class="block text-sm font-medium text-gray-700 mb-1">Local (opcional)</label>
        <input 
          type="text" 
          id="localEvento" 
          v-model="formData.localEvento" 
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Ex: Casa do João, Igreja, etc."
        />
      </div>
      
      <div class="flex justify-end space-x-2">
        <button 
          type="button" 
          @click="$emit('cancel')" 
          class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button 
          type="submit" 
          class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          :disabled="loading"
        >
          <span v-if="loading" class="inline-block animate-spin mr-2">⟳</span>
          {{ isEditing ? 'Atualizar' : 'Adicionar' }} Evento
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { format } from 'date-fns'

export interface Evento {
  id?: number
  relatorioId: number
  tipo: 'CELULA' | 'CULTO'
  data: string
  localEvento?: string
}

const props = defineProps({
  relatorioId: {
    type: Number,
    required: true
  },
  evento: {
    type: Object as () => Evento | null,
    default: null
  }
})

const emit = defineEmits(['save', 'cancel'])

// Estado local
const loading = ref(false)
const formData = ref({
  tipo: 'CELULA' as 'CELULA' | 'CULTO',
  data: format(new Date(), 'yyyy-MM-dd'),
  localEvento: ''
})

// Computed
const isEditing = computed(() => !!props.evento?.id)

// Métodos
const salvarEvento = async () => {
  loading.value = true
  
  try {
    const eventoData: Evento = {
      ...(props.evento?.id ? { id: props.evento.id } : {}),
      relatorioId: props.relatorioId,
      tipo: formData.value.tipo,
      data: formData.value.data,
      localEvento: formData.value.localEvento || undefined
    }
    
    emit('save', eventoData)
  } catch (error) {
    console.error('Erro ao salvar evento:', error)
  } finally {
    loading.value = false
  }
}

// Lifecycle hooks
onMounted(() => {
  if (props.evento) {
    formData.value = {
      tipo: props.evento.tipo,
      data: props.evento.data.substring(0, 10), // Formato yyyy-MM-dd
      localEvento: props.evento.localEvento || ''
    }
  }
})
</script>

<style scoped>
.event-form {
  width: 100%;
}
</style> 