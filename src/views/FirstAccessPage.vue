<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const router = useRouter()

const token = route.params.token as string
const loading = ref(true)
const error = ref('')
const success = ref('')
const phoneError = ref<string | null>(null)

// Dados do usuário vindos do token
const usuario = ref<{
  id: number
  nome: string
  whatsapp: string
  cargo: string
  dataNascimento?: string
} | null>(null)

// Formulário de senha
const passwordInput = reactive({
  senha: '',
  confirmSenha: ''
})

// Validar token ao montar o componente
onMounted(async () => {
  if (!token) {
    error.value = 'Token não fornecido'
    loading.value = false
    return
  }

  try {
    const response = await api.verifyInviteToken(token)
    
    if (response.success && response.usuario) {
      usuario.value = response.usuario
      success.value = 'Token válido! Preencha os dados abaixo para criar sua senha.'
    } else {
      error.value = response.message || 'Link de convite inválido ou expirado'
    }
  } catch (err: any) {
    error.value = err.message || 'Erro ao validar token de convite'
  } finally {
    loading.value = false
  }
})

const validatePassword = () => {
  if (passwordInput.senha.length < 6) {
    error.value = 'A senha deve ter pelo menos 6 caracteres'
    return false
  }
  
  if (passwordInput.senha !== passwordInput.confirmSenha) {
    error.value = 'As senhas não coincidem'
    return false
  }
  
  return true
}

const createPassword = async () => {
  error.value = ''
  success.value = ''
  
  if (!validatePassword()) return
  
  if (!usuario.value) {
    error.value = 'Dados do usuário não disponíveis'
    return
  }

  try {
    loading.value = true
    
    await api.createPassword(
      usuario.value.whatsapp,
      usuario.value.nome,
      passwordInput.senha,
      usuario.value.dataNascimento
    )
    
    success.value = 'Senha criada com sucesso! Redirecionando para login...'
    
    // Redirecionar para login após 2 segundos
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } catch (err: any) {
    error.value = err.message || 'Erro ao criar senha'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Criar Senha de Acesso
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Você foi convidado para acessar o sistema
        </p>
      </div>

      <div v-if="loading" class="text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p class="mt-2 text-sm text-gray-600">Validando convite...</p>
      </div>

      <div v-else-if="error && !usuario" class="bg-red-50 border border-red-200 rounded-md p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">{{ error }}</h3>
            <div class="mt-2 text-sm text-red-700">
              <p>Este link pode ter expirado ou já foi utilizado.</p>
            </div>
            <div class="mt-4">
              <a href="/login" class="text-sm font-medium text-red-800 hover:text-red-900 underline">
                Voltar para login
              </a>
            </div>
          </div>
        </div>
      </div>

      <form v-else-if="usuario" @submit.prevent="createPassword" class="mt-8 space-y-6 bg-white p-8 rounded-lg shadow">
        <!-- Alertas -->
        <div v-if="error" class="p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {{ error }}
        </div>
        
        <div v-if="success" class="p-3 bg-green-50 text-green-700 rounded-md text-sm">
          {{ success }}
        </div>

        <!-- Informações do usuário -->
        <div class="bg-gray-50 p-4 rounded-md">
          <p class="text-sm text-gray-600">Nome:</p>
          <p class="text-base font-medium text-gray-900">{{ usuario.nome }}</p>
          <p class="mt-2 text-sm text-gray-600">WhatsApp:</p>
          <p class="text-base font-medium text-gray-900">{{ usuario.whatsapp }}</p>
        </div>

        <!-- Senha -->
        <div>
          <label for="senha" class="block text-sm font-medium text-gray-700 mb-1">
            Senha <span class="text-red-500">*</span>
          </label>
          <input
            id="senha"
            v-model="passwordInput.senha"
            type="password"
            placeholder="Digite sua senha"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            :disabled="loading"
          />
          <p class="mt-1 text-xs text-gray-500">
            Mínimo de 6 caracteres.
          </p>
        </div>

        <!-- Confirmar Senha -->
        <div>
          <label for="confirmSenha" class="block text-sm font-medium text-gray-700 mb-1">
            Confirmar Senha <span class="text-red-500">*</span>
          </label>
          <input
            id="confirmSenha"
            v-model="passwordInput.confirmSenha"
            type="password"
            placeholder="Confirme sua senha"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            :disabled="loading"
          />
        </div>

        <!-- Botões -->
        <div class="flex justify-between">
          <a
            href="/login"
            class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
          >
            Cancelar
          </a>
          
          <button
            type="submit"
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50"
            :disabled="loading"
          >
            <span v-if="loading">Criando senha...</span>
            <span v-else>Criar Senha</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

