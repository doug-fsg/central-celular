<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Celula } from '../services/adminService'

const props = defineProps<{
  isOpen: boolean
  cell?: Partial<Celula>
  availableLeaders: any[]
  isLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: Partial<Celula>): void
}>()

const formData = ref({
  nome: '',
  endereco: '',
  diaSemana: '',
  horario: '',
  lider_id: '',
  supervisor_id: ''
})

const errors = ref<Record<string, string>>({})
const touched = ref<Record<string, boolean>>({})

const validateField = (field: string, value: any) => {
  touched.value[field] = true
  
  switch (field) {
    case 'nome':
      if (!value || value.trim().length < 3) {
        errors.value[field] = 'Nome deve ter pelo menos 3 caracteres'
        return false
      }
      break
    case 'lider_id':
      if (!value) {
        errors.value[field] = 'Selecione um líder'
        return false
      }
      break
    case 'supervisor_id':
      if (!value) {
        errors.value[field] = 'Selecione um supervisor'
        return false
      }
      break
    case 'endereco':
      if (!value || value.trim().length < 5) {
        errors.value[field] = 'Endereço deve ter pelo menos 5 caracteres'
        return false
      }
      break
    case 'diaSemana':
      if (!value) {
        errors.value[field] = 'Selecione um dia da semana'
        return false
      }
      break
    case 'horario':
      if (!value) {
        errors.value[field] = 'Informe um horário'
        return false
      }
      break
  }
  
  delete errors.value[field]
  return true
}

const validateForm = () => {
  const fields = ['nome', 'lider_id', 'supervisor_id', 'endereco', 'diaSemana', 'horario']
  let isValid = true
  
  fields.forEach(field => {
    if (!validateField(field, formData.value[field as keyof typeof formData.value])) {
      isValid = false
    }
  })
  
  return isValid
}

// Reset form quando o modal abrir/fechar
watch(() => props.isOpen, (newVal) => {
  if (newVal && props.cell) {
    formData.value = { 
      nome: props.cell.nome || '',
      endereco: props.cell.endereco || '',
      diaSemana: props.cell.diaSemana || '',
      horario: props.cell.horario || '',
      lider_id: (props.cell.lider_id || props.cell.liderId)?.toString() || '',
      supervisor_id: (props.cell.supervisor_id || props.cell.supervisorId || props.cell.supervisor?.id)?.toString() || ''
    }
  } else {
    formData.value = {
      nome: '',
      endereco: '',
      diaSemana: '',
      horario: '',
      lider_id: '',
      supervisor_id: ''
    }
  }
  errors.value = {}
  touched.value = {}
})

const handleSubmit = () => {
  if (!validateForm()) {
    return
  }

  const liderId = parseInt(formData.value.lider_id)
  const supervisorId = parseInt(formData.value.supervisor_id)
  
  if (isNaN(liderId)) {
    errors.value.lider_id = 'ID do líder inválido'
    return
  }

  if (isNaN(supervisorId)) {
    errors.value.supervisor_id = 'ID do supervisor inválido'
    return
  }

  const data = {
    nome: formData.value.nome.trim(),
    endereco: formData.value.endereco.trim(),
    diaSemana: formData.value.diaSemana,
    horario: formData.value.horario,
    liderId: liderId,
    supervisorId: supervisorId,
    supervisor_id: supervisorId
  }

  console.log('Dados do formulário para salvar:', data)
  emit('save', data)
}

const diasSemana = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
]

const getFieldClass = (field: string) => {
  const baseClass = 'mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none sm:text-sm'
  if (!touched.value[field]) return `${baseClass} border-gray-300 focus:ring-primary-500 focus:border-primary-500`
  return errors.value[field]
    ? `${baseClass} border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500`
    : `${baseClass} border-green-300 focus:ring-green-500 focus:border-green-500`
}

// Ordenar líderes por cargo e nome
const sortedLeaders = computed(() => {
  const sorted = [...props.availableLeaders];
  return sorted.sort((a, b) => {
    // Primeiro por cargo (SUPERVISOR vem antes de LIDER)
    if (a.cargo !== b.cargo) {
      return a.cargo === 'SUPERVISOR' ? -1 : 1;
    }
    // Se o cargo for igual, ordena por nome
    return a.nome.localeCompare(b.nome);
  });
});

// Filtrar apenas supervisores
const availableSupervisors = computed(() => {
  return props.availableLeaders.filter(user => user.cargo === 'SUPERVISOR')
    .sort((a, b) => a.nome.localeCompare(b.nome));
})

// Filtrar apenas líderes
const availableOnlyLeaders = computed(() => {
  return props.availableLeaders.filter(user => user.cargo === 'LIDER')
    .sort((a, b) => a.nome.localeCompare(b.nome));
})
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg px-4 pt-5 pb-4 overflow-hidden shadow-xl transform transition-all sm:max-w-lg sm:w-full sm:p-6">
      <div class="sm:flex sm:items-start">
        <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
          <h3 class="text-lg leading-6 font-medium text-gray-900">
            {{ cell ? 'Editar Célula' : 'Nova Célula' }}
          </h3>
          
          <form @submit.prevent="handleSubmit" class="mt-6 space-y-4">
            <!-- Nome da célula -->
            <div>
              <label for="nome" class="block text-sm font-medium text-gray-700">
                Nome da Célula <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nome"
                v-model="formData.nome"
                @blur="validateField('nome', formData.nome)"
                required
                :class="getFieldClass('nome')"
              />
              <p v-if="errors.nome" class="mt-1 text-sm text-red-600">{{ errors.nome }}</p>
            </div>

            <!-- Líder -->
            <div>
              <label for="lider" class="block text-sm font-medium text-gray-700">
                Líder <span class="text-red-500">*</span>
              </label>
              <div class="relative mt-1">
                <select
                  id="lider"
                  v-model="formData.lider_id"
                  @blur="validateField('lider_id', formData.lider_id)"
                  required
                  :class="getFieldClass('lider_id')"
                >
                  <option value="" disabled>Selecione um líder</option>
                  <option v-for="lider in sortedLeaders" :key="lider.id" :value="lider.id">
                    {{ lider.nome }} ({{ lider.cargo }})
                  </option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
              <p v-if="errors.lider_id" class="mt-1 text-sm text-red-600">{{ errors.lider_id }}</p>
              <p class="mt-1 text-xs text-gray-500">Somente líderes e supervisores disponíveis</p>
            </div>

            <!-- Supervisor -->
            <div>
              <label for="supervisor" class="block text-sm font-medium text-gray-700">
                Supervisor <span class="text-red-500">*</span>
              </label>
              <div class="relative mt-1">
                <select
                  id="supervisor"
                  v-model="formData.supervisor_id"
                  @blur="validateField('supervisor_id', formData.supervisor_id)"
                  required
                  :class="getFieldClass('supervisor_id')"
                >
                  <option value="" disabled>Selecione um supervisor</option>
                  <option v-for="supervisor in availableSupervisors" :key="supervisor.id" :value="supervisor.id">
                    {{ supervisor.nome }} ({{ supervisor.cargo }})
                  </option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
              <p v-if="errors.supervisor_id" class="mt-1 text-sm text-red-600">{{ errors.supervisor_id }}</p>
              <p class="mt-1 text-xs text-gray-500">Somente supervisores disponíveis</p>
            </div>

            <!-- Dia da Semana -->
            <div>
              <label for="diaSemana" class="block text-sm font-medium text-gray-700">
                Dia da Semana <span class="text-red-500">*</span>
              </label>
              <select
                id="diaSemana"
                v-model="formData.diaSemana"
                @blur="validateField('diaSemana', formData.diaSemana)"
                required
                :class="getFieldClass('diaSemana')"
              >
                <option value="" disabled>Selecione um dia</option>
                <option v-for="dia in diasSemana" :key="dia" :value="dia">
                  {{ dia }}
                </option>
              </select>
              <p v-if="errors.diaSemana" class="mt-1 text-sm text-red-600">{{ errors.diaSemana }}</p>
            </div>

            <!-- Horário -->
            <div>
              <label for="horario" class="block text-sm font-medium text-gray-700">
                Horário <span class="text-red-500">*</span>
              </label>
              <input
                type="time"
                id="horario"
                v-model="formData.horario"
                @blur="validateField('horario', formData.horario)"
                required
                :class="getFieldClass('horario')"
              />
              <p v-if="errors.horario" class="mt-1 text-sm text-red-600">{{ errors.horario }}</p>
            </div>
            
            <!-- Endereço -->
            <div>
              <label for="endereco" class="block text-sm font-medium text-gray-700">
                Endereço Completo <span class="text-red-500">*</span>
              </label>
              <textarea
                id="endereco"
                v-model="formData.endereco"
                @blur="validateField('endereco', formData.endereco)"
                required
                rows="2"
                placeholder="Digite o endereço completo (rua, número, bairro, cidade)"
                :class="getFieldClass('endereco')"
              ></textarea>
              <p v-if="errors.endereco" class="mt-1 text-sm text-red-600">{{ errors.endereco }}</p>
              <p class="mt-1 text-xs text-gray-500">Ex: Rua das Flores, 123 - Centro, São Paulo</p>
            </div>

            <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                :disabled="props.isLoading"
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg v-if="props.isLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ props.isLoading ? 'Salvando...' : 'Salvar' }}
              </button>
              <button
                type="button"
                @click="emit('close')"
                :disabled="props.isLoading"
                class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template> 