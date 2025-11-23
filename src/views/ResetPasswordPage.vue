<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const router = useRouter()

// Estados
const loading = ref(false)
const verifying = ref(true)
const error = ref('')
const success = ref('')
const tokenValid = ref(false)

// Formulário
const form = reactive({
  novaSenha: '',
  confirmSenha: ''
})

// Token da URL
const token = route.params.token as string

// Verificar token ao carregar página
onMounted(async () => {
  if (!token) {
    error.value = 'Token não fornecido'
    verifying.value = false
    return
  }

  try {
    verifying.value = true
    const response = await api.verifyResetToken(token)
    
    if (response.valid) {
      tokenValid.value = true
    } else {
      error.value = response.message || 'Token inválido ou expirado'
    }
  } catch (err: any) {
    error.value = err.message || 'Erro ao verificar token'
  } finally {
    verifying.value = false
  }
})

// Validações
const validate = () => {
  error.value = ''
  
  if (form.novaSenha.length < 6) {
    error.value = 'A senha deve ter pelo menos 6 caracteres'
    return false
  }
  
  if (form.novaSenha !== form.confirmSenha) {
    error.value = 'As senhas não coincidem'
    return false
  }
  
  return true
}

// Redefinir senha
const resetPassword = async () => {
  error.value = ''
  success.value = ''
  
  if (!validate()) return
  
  try {
    loading.value = true
    
    const response = await api.resetPassword(token, form.novaSenha)
    
    if (response.success) {
      success.value = response.message || 'Senha redefinida com sucesso!'
      
      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        router.push({ name: 'login', query: { message: 'Senha redefinida com sucesso!' } })
      }, 2000)
    } else {
      error.value = response.message || 'Erro ao redefinir senha'
    }
  } catch (err: any) {
    error.value = err.message || 'Erro ao redefinir senha. Tente novamente.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-6 sm:px-10 lg:px-16">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <!-- Logo -->
      <div class="flex justify-center mb-6">
        <img src="../assets/brand/logo-full.png" alt="Aprisco" class="h-12 w-auto sm:h-14" />
      </div>
      
      <div class="bg-white py-8 px-6 shadow sm:rounded-lg sm:px-12">
        <h2 class="text-2xl font-bold text-gray-900 text-center mb-6">
          Redefinir Senha
        </h2>
        
        <!-- Verificando token -->
        <div v-if="verifying" class="text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p class="mt-4 text-sm text-gray-600">Verificando token...</p>
        </div>
        
        <!-- Token inválido -->
        <div v-else-if="!tokenValid" class="text-center py-8">
          <div class="mb-4">
            <svg class="mx-auto h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p class="text-red-600 mb-4">{{ error || 'Token inválido ou expirado' }}</p>
          <button
            @click="router.push({ name: 'login' })"
            class="text-primary-600 hover:text-primary-500 text-sm font-medium"
          >
            Voltar para login
          </button>
        </div>
        
        <!-- Formulário de reset -->
        <div v-else>
          <!-- Alertas -->
          <div v-if="error" class="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {{ error }}
          </div>
          
          <div v-if="success" class="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
            {{ success }}
          </div>
          
          <!-- Formulário -->
          <form v-if="!success" @submit.prevent="resetPassword" class="space-y-4">
            <div>
              <label for="novaSenha" class="block text-sm font-medium text-gray-700 mb-1">
                Nova Senha
              </label>
              <input
                id="novaSenha"
                v-model="form.novaSenha"
                type="password"
                required
                placeholder="Digite sua nova senha"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                :disabled="loading"
              />
              <p class="mt-1 text-xs text-gray-500">
                Mínimo de 6 caracteres.
              </p>
            </div>
            
            <div>
              <label for="confirmSenha" class="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Nova Senha
              </label>
              <input
                id="confirmSenha"
                v-model="form.confirmSenha"
                type="password"
                required
                placeholder="Confirme sua nova senha"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                :disabled="loading"
              />
            </div>
            
            <div class="mt-6">
              <button
                type="submit"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                :disabled="loading"
              >
                <svg
                  v-if="loading"
                  class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {{ loading ? 'Redefinindo...' : 'Redefinir Senha' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

