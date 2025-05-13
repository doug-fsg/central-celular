<!-- UserModal.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Usuario } from '../services/adminService'
import PhoneInput from './PhoneInput.vue'

const props = defineProps<{
  isOpen: boolean
  mode: 'create' | 'edit'
  user?: Partial<Usuario>
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: Partial<Usuario>): void
}>()

// Lista de cargos permitidos
const cargosPermitidos = [
  'ADMINISTRADOR',
  'SUPERVISOR',
  'LIDER'
]

// Formulário
const form = ref({
  id: props.user?.id,
  nome: props.user?.nome || '',
  email: props.user?.email || '',
  whatsapp: props.user?.whatsapp || '',
  cargo: props.user?.cargo || 'LIDER'
})

// Erro de validação do telefone
const phoneError = ref<string | null>(null)

// Atualizar formulário quando o usuário mudar
watch(() => props.user, (newUser) => {
  if (newUser) {
    form.value = {
      id: newUser.id,
      nome: newUser.nome || '',
      email: newUser.email || '',
      whatsapp: newUser.whatsapp || '',
      cargo: newUser.cargo || 'LIDER'
    }
  } else {
    form.value = {
      id: undefined,
      nome: '',
      email: '',
      whatsapp: '',
      cargo: 'LIDER'
    }
  }
}, { immediate: true })

// Salvar usuário
const handleSubmit = () => {
  const dadosParaSalvar = {
    ...form.value
  }

  // Validar WhatsApp
  if (!form.value.whatsapp) {
    alert('O WhatsApp é obrigatório')
    return
  }

  // Validar se há erro no telefone
  if (phoneError.value) {
    alert('O número de WhatsApp é inválido')
    return
  }

  emit('save', dadosParaSalvar)
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 overflow-y-auto z-50">
    <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
      <!-- Background overlay -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

      <!-- Modal panel -->
      <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
        <!-- Header -->
        <div class="bg-primary-50 px-4 py-5 sm:px-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h3 class="text-lg leading-6 font-medium text-primary-900">
              {{ mode === 'create' ? 'Novo Usuário' : 'Editar Usuário' }}
            </h3>
            <button
              @click="$emit('close')"
              class="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <span class="sr-only">Fechar</span>
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="px-4 pt-5 pb-4 sm:p-6">
          <div class="space-y-6">
            <!-- Nome -->
            <div>
              <label for="nome" class="block text-sm font-medium text-gray-700 mb-1">
                Nome completo
              </label>
              <div class="relative rounded-md shadow-sm">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="nome"
                  v-model="form.nome"
                  required
                  class="pl-10 focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Digite o nome completo"
                />
              </div>
            </div>
            
            <!-- WhatsApp -->
            <div>
              <label for="whatsapp" class="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp <span class="text-red-500">*</span>
              </label>
              <PhoneInput
                v-model="form.whatsapp"
                @error="phoneError = $event"
              />
              <p class="mt-1 text-sm text-gray-500">
                O usuário receberá um código de acesso neste número para criar sua senha
              </p>
            </div>

            <!-- Email (opcional) -->
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                Email <span class="text-gray-400">(opcional)</span>
              </label>
              <div class="relative rounded-md shadow-sm">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <input
                  type="email"
                  id="email"
                  v-model="form.email"
                  class="pl-10 focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Digite o email (opcional)"
                />
              </div>
            </div>

            <!-- Cargo -->
            <div>
              <label for="cargo" class="block text-sm font-medium text-gray-700 mb-1">
                Cargo
              </label>
              <div class="relative rounded-md shadow-sm">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clip-rule="evenodd" />
                  </svg>
                </div>
                <select
                  id="cargo"
                  v-model="form.cargo"
                  required
                  class="pl-10 focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option v-for="cargo in cargosPermitidos" :key="cargo" :value="cargo">
                    {{ cargo }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div class="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              @click="$emit('close')"
              class="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {{ mode === 'create' ? 'Criar' : 'Salvar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template> 