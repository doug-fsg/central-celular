<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import FirstAccessForm from '../components/FirstAccessForm.vue'

const router = useRouter()
const userStore = useUserStore()

// Estado do formulário
const credentials = reactive({
  whatsapp: '',
  senha: ''
})

// Estado de carregamento e erro
const loading = ref(false)
const errorMessage = ref('')
const phoneError = ref<string | null>(null)

// Estado do modal de primeiro acesso
const showFirstAccessModal = ref(false)

// Formatação sutil para WhatsApp (BR) enquanto digita
function formatWhatsappBR(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  const ddd = digits.slice(0, 2)
  const rest = digits.slice(2)

  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${ddd}`
  if (digits.length <= 6) return `(${ddd}) ${rest}`
  if (digits.length <= 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`
}

function onWhatsappInput(event: Event) {
  const input = event.target as HTMLInputElement
  credentials.whatsapp = formatWhatsappBR(input.value)
}

// Validações
const validate = () => {
  if (!credentials.whatsapp.trim()) {
    errorMessage.value = 'Por favor, informe seu WhatsApp'
    return false
  }
  if (!credentials.senha.trim()) {
    errorMessage.value = 'Por favor, informe sua senha'
    return false
  }
  return true
}

// Lidar com sucesso do primeiro acesso
const handleFirstAccessSuccess = () => {
  showFirstAccessModal.value = false
  errorMessage.value = 'Senha criada com sucesso! Você já pode fazer login.'
  // Limpar a mensagem após 3 segundos
  setTimeout(() => {
    errorMessage.value = ''
  }, 3000)
}

// Submeter o formulário
const handleLogin = async () => {
  // Limpar mensagem de erro anterior
  errorMessage.value = ''
  
  // Validar campos
  if (!validate()) return
  
  // Iniciar carregamento
  loading.value = true
  console.log('[LoginPage] Iniciando processo de login para:', credentials.whatsapp)
  
  try {
    // Autenticar via store para manter estado sincronizado
    console.log('[LoginPage] Chamando userStore.login...')
    const ok = await userStore.login({
      whatsapp: credentials.whatsapp,
      senha: credentials.senha,
    })

    if (!ok) {
      console.error('[LoginPage] Login falhou no store')
      throw { status: 500 }
    }

    console.log('[LoginPage] Login bem-sucedido, redirecionando...')
    // Redirecionar conforme o cargo do usuário
    const cargo = userStore.user?.cargo
    if (cargo === 'ADMINISTRADOR' || cargo === 'PASTOR') {
      router.push({ name: 'admin-dashboard' })
    } else if (cargo === 'SUPERVISOR') {
      router.push({ name: 'supervisor-dashboard' })
    } else {
      router.push({ name: 'dashboard' })
    }
  } catch (error: any) {
    // Tratar erros de login
    console.error('[LoginPage] Erro ao fazer login:', error)
    
    if (error.status === 401) {
      errorMessage.value = 'WhatsApp/email ou senha incorretos'
    } else if (error.status === 403) {
      errorMessage.value = 'Sua conta está inativa. Entre em contato com o administrador.'
    } else {
      errorMessage.value = 'Erro ao fazer login. Tente novamente.'
    }
  } finally {
    loading.value = false
  }
}

// Solicitar código de primeiro acesso
const handleRequestCode = async () => {
  // Limpar mensagem de erro anterior
  errorMessage.value = ''
  
  // Validar WhatsApp (somente Brasil, aceitar sem +55)
  if (!credentials.whatsapp) {
    errorMessage.value = 'Por favor, informe seu WhatsApp'
    return
  }

  if (phoneError.value) {
    errorMessage.value = 'O número de WhatsApp é inválido'
    return
  }

  // Normalizar para dígitos nacionais (BR). O serviço adiciona +55.
  const whatsapp = credentials.whatsapp.replace(/\D/g, '')
  
  // Iniciar carregamento
  loading.value = true
  
  try {
    // Usar o userStore para solicitar OTP (que chama a API internamente)
    console.log('[LoginPage] Solicitando OTP para:', whatsapp)
    // TODO: Implementar método no userStore ou usar api diretamente se necessário
    // await userStore.requestOtp(whatsapp)
    showFirstAccessModal.value = true
  } catch (error: any) {
    console.error('[LoginPage] Erro ao solicitar código:', error)
    errorMessage.value = error.message || 'Erro ao solicitar código. Tente novamente.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <!-- Logo -->
      <div class="flex justify-center mb-6">
        <img src="../assets/brand/logo-full.png" alt="Aprisco" class="h-16 w-auto" />
      </div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Bem-vindo(a)
      </h2>
    </div>
    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <form @submit.prevent="handleLogin" class="space-y-6">
          <!-- WhatsApp/Email -->
          <div>
            <label for="whatsapp" class="block text-sm font-medium text-gray-700">
              WhatsApp
            </label>
            <div class="mt-1">
              <input
                id="whatsapp"
                type="text"
                v-model="credentials.whatsapp"
                @input="onWhatsappInput"
                inputmode="numeric"
                autocomplete="tel"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <!-- Senha -->
          <div>
            <label for="senha" class="block text-sm font-medium text-gray-700">
              Senha
            </label>
            <div class="mt-1">
              <input
                id="senha"
                type="password"
                v-model="credentials.senha"
                required
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
          </div>

          <!-- Mensagem de erro -->
          <div v-if="errorMessage" class="text-sm text-red-600">
            {{ errorMessage }}
          </div>

          <!-- Botão de login -->
          <div>
            <button
              type="submit"
              :disabled="loading"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
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
              {{ loading ? 'Entrando...' : 'Entrar' }}
            </button>
          </div>

          <!-- Link para primeiro acesso -->
          <div class="text-center">
            <button
              type="button"
              @click="showFirstAccessModal = true"
              class="text-sm text-primary-600 hover:text-primary-500"
            >
              Primeiro acesso? Solicite seu código
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal de primeiro acesso -->
    <div
      v-if="showFirstAccessModal"
      class="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <!-- Overlay -->
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

      <!-- Modal container -->
      <div class="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div 
          class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
        >
          <!-- Botão de fechar -->
          <button
            type="button"
            @click="showFirstAccessModal = false"
            class="absolute right-4 top-4 text-gray-400 hover:text-gray-500"
          >
            <span class="sr-only">Fechar</span>
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Componente de primeiro acesso -->
          <FirstAccessForm 
            :onClose="() => showFirstAccessModal = false"
            @success="handleFirstAccessSuccess"
          />
        </div>
      </div>
    </div>
  </div>
</template> 