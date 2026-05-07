<script setup lang="ts">
/**
 * Tela pública mínima: sem shell do app (meta em App.vue).
 * Cores: contraste forte (leitura ao sol), semântica clara erro/sucesso (mobile-color-system).
 */
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const router = useRouter()

const token = route.params.token as string
const loading = ref(true)
const error = ref('')
const inviteErrorKind = ref<'none' | 'network' | 'invite'>('none')
const passwordCreated = ref(false)
const redirectCountdown = ref(2)
let redirectIntervalId: ReturnType<typeof setInterval> | null = null

const showSenha = ref(false)
const showConfirmSenha = ref(false)

const usuario = ref<{
  id: number
  nome: string
  whatsapp: string
  cargo: string
  dataNascimento?: string
} | null>(null)

const passwordInput = reactive({
  senha: '',
  confirmSenha: ''
})

const tokenLoadErrorHelp = computed(() => {
  if (inviteErrorKind.value === 'network') return 'Tente de novo.'
  const m = (error.value || '').toLowerCase()
  if (m.includes('não fornecid') || m.includes('token não')) return 'Abra o link do WhatsApp.'
  if (m.includes('já possui senha') || m.includes('já foi utilizad')) return 'Use “Já tenho senha”.'
  if (m.includes('não encontrado')) return 'Fale com o admin.'
  return 'Novo link: válido por 48 h.'
})

function isLikelyNetworkError(err: { message?: string }): boolean {
  const msg = (err.message || '').toLowerCase()
  if (/failed to fetch|networkerror|load failed|conexão|timed out|time out/.test(msg)) return true
  return typeof navigator !== 'undefined' && !navigator.onLine
}

async function validateToken() {
  if (!token) {
    error.value = 'Link inválido'
    inviteErrorKind.value = 'invite'
    loading.value = false
    return
  }

  loading.value = true
  error.value = ''
  inviteErrorKind.value = 'none'
  usuario.value = null

  try {
    const response = await api.verifyInviteToken(token)
    if (response.success && response.usuario) {
      usuario.value = response.usuario
    } else {
      error.value = response.message || 'Convite inválido'
      inviteErrorKind.value = 'invite'
    }
  } catch (err: any) {
    error.value = err.message || 'Erro'
    inviteErrorKind.value = isLikelyNetworkError(err) ? 'network' : 'invite'
  } finally {
    loading.value = false
  }
}

onMounted(() => validateToken())

onBeforeUnmount(() => {
  if (redirectIntervalId !== null) {
    clearInterval(redirectIntervalId)
    redirectIntervalId = null
  }
})

function validatePassword(): boolean {
  if (passwordInput.senha.length < 6) {
    error.value = 'Mínimo 6 caracteres'
    return false
  }
  if (passwordInput.senha !== passwordInput.confirmSenha) {
    error.value = 'Senhas diferentes'
    return false
  }
  return true
}

async function createPassword() {
  error.value = ''
  if (!validatePassword()) return
  if (!usuario.value) {
    error.value = 'Erro'
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

    passwordCreated.value = true
    redirectCountdown.value = 2
    if (redirectIntervalId !== null) clearInterval(redirectIntervalId)
    redirectIntervalId = window.setInterval(() => {
      redirectCountdown.value -= 1
      if (redirectCountdown.value <= 0) {
        if (redirectIntervalId !== null) {
          clearInterval(redirectIntervalId)
          redirectIntervalId = null
        }
        router.push('/login')
      }
    }, 1000)
  } catch (err: any) {
    error.value = err.message || 'Erro ao salvar'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    class="first-access-root min-h-screen flex flex-col items-center justify-center px-4"
  >
    <div class="w-full max-w-sm space-y-6">
      <header class="text-center">
        <img
          src="../assets/brand/logo-full.png"
          alt="Aprisco"
          class="mx-auto h-12 w-auto sm:h-14"
        />
        <h1 class="mt-4 text-xl font-bold text-neutral-900 tracking-tight">
          Nova senha
        </h1>
      </header>

      <!-- Loading -->
      <div v-if="loading && !usuario && !passwordCreated" class="flex flex-col items-center py-10">
        <div
          class="h-9 w-9 rounded-full border-2 border-primary-600 border-t-transparent animate-spin"
          aria-hidden="true"
        />
      </div>

      <!-- Erro convite -->
      <div
        v-else-if="error && !usuario"
        class="rounded-2xl border border-red-200/90 bg-red-50 px-4 py-4 text-red-950 shadow-sm"
        role="alert"
      >
        <p class="text-sm font-semibold leading-snug">{{ error }}</p>
        <p class="mt-2 text-xs text-red-900/85 leading-snug">{{ tokenLoadErrorHelp }}</p>
        <div class="mt-4 flex flex-col gap-2">
          <button
            v-if="inviteErrorKind === 'network'"
            type="button"
            class="min-h-[48px] w-full rounded-xl bg-primary-600 text-sm font-semibold text-white active:bg-primary-700"
            @click="validateToken"
          >
            Tentar
          </button>
          <RouterLink
            to="/login"
            class="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-red-200 bg-white text-sm font-semibold text-red-950 active:bg-red-100/60"
          >
            Já tenho senha
          </RouterLink>
        </div>
      </div>

      <!-- Sucesso -->
      <div
        v-else-if="passwordCreated"
        class="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-5 py-6 text-center shadow-sm"
      >
        <div
          class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
          aria-hidden="true"
        >
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p class="text-base font-semibold text-neutral-900">Pronto</p>
        <p class="mt-1 text-xs text-neutral-600">Entrando em {{ redirectCountdown }}s</p>
        <RouterLink
          to="/login"
          class="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-primary-600 text-sm font-semibold text-white active:bg-primary-700"
        >
          Entrar agora
        </RouterLink>
      </div>

      <!-- Form -->
      <form
        v-else-if="usuario"
        class="rounded-2xl border border-neutral-200/90 bg-white px-4 py-5 shadow-sm"
        @submit.prevent="createPassword"
      >
        <div
          v-if="error"
          class="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-900"
        >
          {{ error }}
        </div>

        <div class="space-y-4">
          <div>
            <label for="fa-senha" class="sr-only">Senha</label>
            <div class="relative">
              <input
                id="fa-senha"
                v-model="passwordInput.senha"
                :type="showSenha ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Senha (mín. 6)"
                required
                :disabled="loading"
                class="w-full min-h-[52px] rounded-xl border border-neutral-300 bg-neutral-50/50 py-3 pl-3 pr-[4.5rem] text-base text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25"
              />
              <button
                type="button"
                class="absolute right-1 top-1/2 min-h-[44px] -translate-y-1/2 px-3 text-xs font-semibold text-primary-700"
                :aria-pressed="showSenha"
                @click="showSenha = !showSenha"
              >
                {{ showSenha ? 'Ocultar' : 'Ver' }}
              </button>
            </div>
          </div>

          <div>
            <label for="fa-confirm" class="sr-only">Confirmar</label>
            <div class="relative">
              <input
                id="fa-confirm"
                v-model="passwordInput.confirmSenha"
                :type="showConfirmSenha ? 'text' : 'password'"
                autocomplete="new-password"
                placeholder="Confirmar"
                required
                :disabled="loading"
                class="w-full min-h-[52px] rounded-xl border border-neutral-300 bg-neutral-50/50 py-3 pl-3 pr-[4.5rem] text-base text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25"
              />
              <button
                type="button"
                class="absolute right-1 top-1/2 min-h-[44px] -translate-y-1/2 px-3 text-xs font-semibold text-primary-700"
                :aria-pressed="showConfirmSenha"
                @click="showConfirmSenha = !showConfirmSenha"
              >
                {{ showConfirmSenha ? 'Ocultar' : 'Ver' }}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          class="mt-5 min-h-[52px] w-full rounded-xl bg-primary-600 text-base font-semibold text-white shadow-sm active:bg-primary-700 disabled:opacity-45"
          :disabled="loading"
        >
          {{ loading ? 'Salvando…' : 'Continuar' }}
        </button>

        <div class="mt-3 text-center">
          <RouterLink to="/login" class="text-sm font-medium text-neutral-600 active:text-neutral-900">
            Já tenho senha
          </RouterLink>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.first-access-root {
  background-color: #f2f2f2;
  padding-top: max(1.5rem, env(safe-area-inset-top, 0px));
  padding-bottom: max(1.5rem, env(safe-area-inset-bottom, 0px));
}
</style>
