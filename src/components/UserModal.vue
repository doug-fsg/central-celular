<!-- UserModal.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Usuario } from '../services/adminService'

const props = defineProps<{
  isOpen: boolean
  mode: 'create' | 'edit'
  user?: Partial<Usuario>
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: Partial<Usuario> & { senha?: string }): void
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
  cargo: props.user?.cargo || 'LIDER',
  senha: ''
})

// Atualizar formulário quando o usuário mudar
watch(() => props.user, (newUser) => {
  if (newUser) {
    form.value = {
      id: newUser.id,
      nome: newUser.nome || '',
      email: newUser.email || '',
      cargo: newUser.cargo || 'LIDER',
      senha: ''
    }
  } else {
    form.value = {
      id: undefined,
      nome: '',
      email: '',
      cargo: 'LIDER',
      senha: ''
    }
  }
}, { immediate: true })

// Salvar usuário
const handleSubmit = () => {
  const dadosParaSalvar = {
    ...form.value
  }

  // Remover senha se estiver editando
  if (props.mode === 'edit') {
    delete dadosParaSalvar.senha
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

            <!-- Email -->
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                Email
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
                  required
                  class="pl-10 focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Digite o email"
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

            <!-- Senha (apenas na criação) -->
            <div v-if="mode === 'create'">
              <label for="senha" class="block text-sm font-medium text-gray-700 mb-1">
                Senha
              </label>
              <div class="relative rounded-md shadow-sm">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                  </svg>
                </div>
                <input
                  type="password"
                  id="senha"
                  v-model="form.senha"
                  :required="mode === 'create'"
                  class="pl-10 focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Digite a senha"
                />
              </div>
              <p class="mt-1 text-sm text-gray-500">
                Mínimo de 6 caracteres
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div class="mt-8 sm:flex sm:flex-row-reverse">
            <button
              type="submit"
              class="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              <svg class="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
              </svg>
              {{ mode === 'create' ? 'Criar Usuário' : 'Salvar Alterações' }}
            </button>
            <button
              type="button"
              @click="$emit('close')"
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template> 