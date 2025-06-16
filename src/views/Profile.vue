<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useUserStore } from '../stores/userStore'
import api from '../services/api'

const userStore = useUserStore()

// Formulário com os dados do usuário
const form = reactive({
  nome: userStore.user?.nome || '',
  email: userStore.user?.email || '',
  cargo: userStore.user?.cargo || '',
})

// Estados para controle da UI
const isSaving = ref(false)
const showSuccess = ref(false)
const errorMessage = ref('')

// Salvar alterações do perfil
const saveProfile = async () => {
  isSaving.value = true
  errorMessage.value = ''
  showSuccess.value = false
  
  try {
    // Simulação de atualização - Implementar a API real quando disponível
    // await api.post(`/usuarios/${userStore.user.id}`, form)
    
    // Atualiza o store com as novas informações
    if (userStore.user) {
      userStore.setUser({
        ...userStore.user,
        nome: form.nome
      })
    }
    
    showSuccess.value = true
    setTimeout(() => {
      showSuccess.value = false
    }, 3000)
  } catch (error: any) {
    console.error('Erro ao salvar perfil:', error)
    errorMessage.value = 'Erro ao salvar alterações no perfil'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div>
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">
        <div class="bg-white shadow rounded-lg">
          <div class="px-4 py-5 sm:px-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Meu Perfil
            </h3>
            <p class="mt-1 max-w-2xl text-sm text-gray-500">
              Visualize e edite suas informações pessoais
            </p>
          </div>
          
          <!-- Alerta de sucesso -->
          <div v-if="showSuccess" class="mx-4 mb-4 p-4 rounded-md bg-green-50 border border-green-200">
            <p class="text-sm text-green-700">Perfil atualizado com sucesso!</p>
          </div>
          
          <!-- Alerta de erro -->
          <div v-if="errorMessage" class="mx-4 mb-4 p-4 rounded-md bg-red-50 border border-red-200">
            <p class="text-sm text-red-700">{{ errorMessage }}</p>
          </div>
          
          <div class="border-t border-gray-200 px-4 py-5 sm:p-6">
            <form @submit.prevent="saveProfile" class="space-y-6">
              <div>
                <label for="nome" class="block text-sm font-medium text-gray-700">
                  Nome
                </label>
                <div class="mt-1">
                  <input
                    id="nome"
                    type="text"
                    v-model="form.nome"
                    required
                    class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label for="email" class="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div class="mt-1">
                  <input
                    id="email"
                    type="email"
                    v-model="form.email"
                    disabled
                    class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                  />
                  <p class="mt-1 text-xs text-gray-500">
                    O email não pode ser alterado
                  </p>
                </div>
              </div>
              
              <div>
                <label for="cargo" class="block text-sm font-medium text-gray-700">
                  Cargo
                </label>
                <div class="mt-1">
                  <input
                    id="cargo"
                    type="text"
                    v-model="form.cargo"
                    disabled
                    class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                  />
                  <p class="mt-1 text-xs text-gray-500">
                    O cargo é definido pelo administrador
                  </p>
                </div>
              </div>
              
              <div>
                <button
                  type="submit"
                  :disabled="isSaving"
                  class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <template v-if="isSaving">
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Salvando...
                  </template>
                  <template v-else>
                    Salvar Alterações
                  </template>
                </button>
              </div>
            </form>
          </div>
          
          <div class="border-t border-gray-200 px-4 py-5 sm:px-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
              Alterar Senha
            </h3>
            <p class="mb-4 text-sm text-gray-500">
              Para alterar sua senha, entre em contato com o administrador do sistema.
            </p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template> 