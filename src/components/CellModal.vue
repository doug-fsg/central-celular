<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  isOpen: boolean
  cell?: any
  availableLeaders: any[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: any): void
}>()

const formData = ref({
  nome: '',
  endereco: '',
  bairro: '',
  cidade: '',
  diaSemana: '',
  horario: '',
  lider_id: ''
})

// Reset form quando o modal abrir/fechar
watch(() => props.isOpen, (newVal) => {
  if (newVal && props.cell) {
    formData.value = { ...props.cell }
  } else {
    formData.value = {
      nome: '',
      endereco: '',
      bairro: '',
      cidade: '',
      diaSemana: '',
      horario: '',
      lider_id: ''
    }
  }
})

const handleSubmit = () => {
  // Converter o ID do líder para número
  const liderId = parseInt(formData.value.lider_id);
  
  if (isNaN(liderId)) {
    // TODO: Adicionar feedback visual de erro
    return;
  }

  const data = {
    nome: formData.value.nome,
    endereco: formData.value.endereco,
    bairro: formData.value.bairro,
    cidade: formData.value.cidade,
    diaSemana: formData.value.diaSemana,
    horario: formData.value.horario,
    liderId
  };

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
              <label for="nome" class="block text-sm font-medium text-gray-700">Nome da Célula</label>
              <input
                type="text"
                id="nome"
                v-model="formData.nome"
                required
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>

            <!-- Líder -->
            <div>
              <label for="lider" class="block text-sm font-medium text-gray-700">Líder</label>
              <div class="relative mt-1">
                <select
                  id="lider"
                  v-model="formData.lider_id"
                  required
                  class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                >
                  <option value="" disabled>Selecione um líder</option>
                  <option v-for="lider in availableLeaders" :key="lider.id" :value="lider.id">
                    {{ lider.nome }} - {{ lider.email }}
                  </option>
                </select>
                <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
              <p class="mt-1 text-sm text-gray-500">
                Selecione o líder responsável por esta célula
              </p>
            </div>

            <!-- Endereço -->
            <div>
              <label for="endereco" class="block text-sm font-medium text-gray-700">Endereço</label>
              <input
                type="text"
                id="endereco"
                v-model="formData.endereco"
                required
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>

            <!-- Bairro -->
            <div>
              <label for="bairro" class="block text-sm font-medium text-gray-700">Bairro</label>
              <input
                type="text"
                id="bairro"
                v-model="formData.bairro"
                required
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>

            <!-- Cidade -->
            <div>
              <label for="cidade" class="block text-sm font-medium text-gray-700">Cidade</label>
              <input
                type="text"
                id="cidade"
                v-model="formData.cidade"
                required
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>

            <!-- Dia da semana -->
            <div>
              <label for="diaSemana" class="block text-sm font-medium text-gray-700">Dia da Semana</label>
              <select
                id="diaSemana"
                v-model="formData.diaSemana"
                required
                class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">Selecione um dia</option>
                <option v-for="dia in diasSemana" :key="dia" :value="dia">
                  {{ dia }}
                </option>
              </select>
            </div>

            <!-- Horário -->
            <div>
              <label for="horario" class="block text-sm font-medium text-gray-700">Horário</label>
              <input
                type="time"
                id="horario"
                v-model="formData.horario"
                required
                class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
          </form>
        </div>
      </div>

      <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        <button
          type="button"
          @click="handleSubmit"
          class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
        >
          Salvar
        </button>
        <button
          type="button"
          @click="$emit('close')"
          class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  </div>
</template> 