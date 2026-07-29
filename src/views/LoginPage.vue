<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import BrandLogo from '../components/BrandLogo.vue'
import FirstAccessForm from '../components/FirstAccessForm.vue'
import PasswordResetRequestForm from '../components/PasswordResetRequestForm.vue'

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

// Estado do modal de reset de senha
const showPasswordResetModal = ref(false)

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
    if (userStore.isPlatformOwner) {
      router.push({ name: 'admin-dashboard' })
    } else if (userStore.isChurchAdmin) {
      router.push({ name: 'admin-dashboard' })
    } else if (userStore.user?.cargo === 'SUPERVISOR') {
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
  <div
    class="relative min-h-screen flex flex-col justify-center py-12 px-6 sm:px-10 lg:px-16 bg-gradient-to-b from-vibrant-50/40 via-white to-fun-50/25 font-body text-neutral-800 antialiased selection:bg-vibrant-200/60 selection:text-vibrant-900"
  >
    <div class="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <div class="absolute -top-24 right-[-5%] h-56 w-56 rounded-full bg-vibrant-100/25 blur-3xl" />
      <div class="absolute bottom-10 left-[-10%] h-48 w-48 rounded-full bg-accent-100/20 blur-3xl" />
    </div>

    <div class="relative z-10 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="flex justify-center mb-8">
        <RouterLink to="/" class="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-vibrant-400 focus-visible:ring-offset-2">
          <BrandLogo variant="full" class="h-11 w-auto sm:h-12" />
        </RouterLink>
      </div>
      <h2 class="text-center font-display text-2xl sm:text-3xl font-bold text-neutral-800 tracking-tight">
        Bem-vindo(a)
      </h2>
    </div>

    <div class="relative z-10 mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div
        class="bg-white/95 backdrop-blur-sm rounded-2xl border border-vibrant-100/80 shadow-soft px-6 py-9 sm:px-10 sm:py-10"
      >
        <form @submit.prevent="handleLogin" class="space-y-5">
          <div>
            <label for="whatsapp" class="block text-sm font-semibold text-neutral-700">
              WhatsApp
            </label>
            <div class="mt-1.5">
              <input
                id="whatsapp"
                type="text"
                v-model="credentials.whatsapp"
                @input="onWhatsappInput"
                inputmode="numeric"
                autocomplete="tel"
                required
                class="block w-full rounded-xl border border-vibrant-100 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm transition-colors focus:border-vibrant-400 focus:outline-none focus:ring-2 focus:ring-vibrant-200/80"
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div>
            <label for="senha" class="block text-sm font-semibold text-neutral-700">
              Senha
            </label>
            <div class="mt-1.5">
              <input
                id="senha"
                type="password"
                v-model="credentials.senha"
                required
                autocomplete="current-password"
                class="block w-full rounded-xl border border-vibrant-100 bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm transition-colors focus:border-vibrant-400 focus:outline-none focus:ring-2 focus:ring-vibrant-200/80"
              />
            </div>
          </div>

          <div
            v-if="errorMessage"
            role="alert"
            class="rounded-xl border border-red-100 bg-red-50/90 px-3 py-2.5 text-sm text-red-700"
          >
            {{ errorMessage }}
          </div>

          <div class="pt-1">
            <button
              type="submit"
              :disabled="loading"
              class="flex w-full items-center justify-center rounded-xl bg-vibrant-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-vibrant-500/15 transition-colors hover:bg-vibrant-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-vibrant-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <svg
                v-if="loading"
                class="-ml-1 mr-2 h-5 w-5 shrink-0 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {{ loading ? 'Entrando...' : 'Entrar' }}
            </button>
          </div>

          <div class="space-y-2 border-t border-vibrant-50 pt-5 text-center">
            <button
              type="button"
              @click="showFirstAccessModal = true"
              class="block w-full text-sm font-semibold text-vibrant-700 transition-colors hover:text-vibrant-800"
            >
              Primeiro acesso? Solicite seu código
            </button>
            <button
              type="button"
              @click="showPasswordResetModal = true"
              class="block w-full text-sm font-semibold text-neutral-600 transition-colors hover:text-vibrant-700"
            >
              Esqueci minha senha
            </button>
          </div>
        </form>
      </div>

      <p class="mt-8 text-center">
        <RouterLink
          to="/"
          class="text-sm font-medium text-neutral-500 transition-colors hover:text-vibrant-700"
        >
          ← Voltar ao início
        </RouterLink>
      </p>
    </div>

    <!-- Modal de primeiro acesso -->
    <div
      v-if="showFirstAccessModal"
      class="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div class="fixed inset-0 bg-vibrant-900/25 backdrop-blur-[2px] transition-opacity" />

      <div class="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          class="relative w-full max-w-lg overflow-hidden rounded-2xl border border-vibrant-100/90 bg-white text-left shadow-xl shadow-vibrant-900/5"
        >
          <button
            type="button"
            @click="showFirstAccessModal = false"
            class="absolute right-3 top-3 rounded-lg p-2 text-neutral-400 transition-colors hover:bg-vibrant-50 hover:text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-vibrant-400"
          >
            <span class="sr-only">Fechar</span>
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <FirstAccessForm
            :onClose="() => showFirstAccessModal = false"
            @success="handleFirstAccessSuccess"
          />
        </div>
      </div>
    </div>

    <!-- Modal de reset de senha -->
    <div
      v-if="showPasswordResetModal"
      class="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div class="fixed inset-0 bg-vibrant-900/25 backdrop-blur-[2px] transition-opacity" />

      <div class="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          class="relative w-full max-w-lg overflow-hidden rounded-2xl border border-vibrant-100/90 bg-white text-left shadow-xl shadow-vibrant-900/5"
        >
          <button
            type="button"
            @click="showPasswordResetModal = false"
            class="absolute right-3 top-3 rounded-lg p-2 text-neutral-400 transition-colors hover:bg-vibrant-50 hover:text-neutral-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-vibrant-400"
          >
            <span class="sr-only">Fechar</span>
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <PasswordResetRequestForm :onClose="() => showPasswordResetModal = false" />
        </div>
      </div>
    </div>
  </div>
</template> 