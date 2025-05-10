<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'
import { useUserStore } from '../stores/userStore'

const router = useRouter()
const userStore = useUserStore()

// Estado do formulário
const credentials = reactive({
  email: '',
  senha: ''
})

// Estado de carregamento e erro
const loading = ref(false)
const errorMessage = ref('')

// Validações
const validate = () => {
  if (!credentials.email.trim()) {
    errorMessage.value = 'Por favor, informe seu email'
    return false
  }
  if (!credentials.senha.trim()) {
    errorMessage.value = 'Por favor, informe sua senha'
    return false
  }
  return true
}

// Submeter o formulário
const handleLogin = async () => {
  // Limpar mensagem de erro anterior
  errorMessage.value = ''
  
  // Validar campos
  if (!validate()) return
  
  // Iniciar carregamento
  loading.value = true
  
  try {
    // Chamar a API de login
    const response = await api.login(credentials.email, credentials.senha)
    
    // Atualizar o store com os dados do usuário
    userStore.setUser(response.usuario)
    
    // Redirecionar conforme o cargo do usuário
    if (response.usuario.cargo === 'ADMINISTRADOR' || response.usuario.cargo === 'PASTOR') {
      router.push({ name: 'admin-dashboard' })
    } else if (response.usuario.cargo === 'SUPERVISOR') {
      router.push({ name: 'supervisor-dashboard' })
    } else {
      router.push({ name: 'dashboard' })
    }
  } catch (error: any) {
    // Tratar erros de login
    console.error('Erro ao fazer login:', error)
    
    if (error.status === 401) {
      errorMessage.value = 'Email ou senha incorretos'
    } else if (error.status === 403) {
      errorMessage.value = 'Sua conta está desativada. Entre em contato com o administrador.'
    } else {
      errorMessage.value = 'Erro ao fazer login. Tente novamente mais tarde.'
    }
  } finally {
    // Finalizar carregamento
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h1 class="text-3xl font-bold text-center text-primary-600">Central Celular</h1>
      <h2 class="mt-6 text-center text-2xl font-bold text-gray-900">
        Entre na sua conta
      </h2>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <!-- Alerta de erro -->
        <div v-if="errorMessage" class="mb-4 p-4 rounded-md bg-red-50 border border-red-200">
          <p class="text-sm text-red-700">{{ errorMessage }}</p>
        </div>

        <form class="space-y-6" @submit.prevent="handleLogin">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">
              Email
            </label>
            <div class="mt-1">
              <input
                id="email"
                v-model="credentials.email"
                type="email"
                autocomplete="email"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label for="senha" class="block text-sm font-medium text-gray-700">
              Senha
            </label>
            <div class="mt-1">
              <input
                id="senha"
                v-model="credentials.senha"
                type="password"
                autocomplete="current-password"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label for="remember-me" class="ml-2 block text-sm text-gray-900">
                Lembrar de mim
              </label>
            </div>

            <div class="text-sm">
              <a href="#" class="font-medium text-primary-600 hover:text-primary-500">
                Esqueceu sua senha?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              :disabled="loading"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <template v-if="loading">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Entrando...
              </template>
              <template v-else>
                Entrar
              </template>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template> 