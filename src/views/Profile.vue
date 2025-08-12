<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useLeaderStore } from '../stores/leaderStore'
import api from '../services/api'

const userStore = useUserStore()
const leaderStore = useLeaderStore()

// Formulário com os dados do usuário
const form = reactive({
  nome: userStore.user?.nome || ''
})

// Estados para controle da UI
defineProps<{}>()
const isSaving = ref(false)
const showSuccess = ref(false)
const errorMessage = ref('')

// Medalha (consistente com o dashboard)
const leaderBadge = computed(() => leaderStore.leaderBadge)
const badgeEmoji = computed(() => leaderBadge.value === 'gold' ? '🥇' : leaderBadge.value === 'silver' ? '🥈' : leaderBadge.value === 'bronze' ? '🥉' : '')
const badgeLabel = computed(() => {
  if (leaderBadge.value === 'gold') return 'Ouro'
  if (leaderBadge.value === 'silver') return 'Prata'
  if (leaderBadge.value === 'bronze') return 'Bronze'
  return ''
})

// Salvar alterações do perfil
const saveProfile = async () => {
  isSaving.value = true
  errorMessage.value = ''
  showSuccess.value = false
  
  try {
    // Atualiza o store com as novas informações (backend pode ser adicionado depois)
    if (userStore.user) {
      userStore.updateProfile({
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

// Alterar senha
const passwordForm = reactive({
  senhaAtual: '',
  novaSenha: '',
  confirmarSenha: ''
})
const changingPassword = ref(false)
const passwordError = ref('')
const passwordSuccess = ref('')

const alterarSenha = async () => {
  passwordError.value = ''
  passwordSuccess.value = ''

  if (!passwordForm.senhaAtual || !passwordForm.novaSenha) {
    passwordError.value = 'Preencha os campos de senha'
    return
  }
  if (passwordForm.novaSenha.length < 6) {
    passwordError.value = 'A nova senha deve ter pelo menos 6 caracteres'
    return
  }
  if (passwordForm.novaSenha !== passwordForm.confirmarSenha) {
    passwordError.value = 'As senhas não coincidem'
    return
  }

  try {
    changingPassword.value = true
    const userId = userStore.user?.id as number
    await api.alterarSenha(userId, passwordForm.senhaAtual, passwordForm.novaSenha)
    passwordSuccess.value = 'Senha alterada com sucesso'
    passwordForm.senhaAtual = ''
    passwordForm.novaSenha = ''
    passwordForm.confirmarSenha = ''
  } catch (err: any) {
    passwordError.value = err?.message || 'Erro ao alterar senha'
  } finally {
    changingPassword.value = false
  }
}
</script>

<template>
  <div>
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">
        <div class="bg-white shadow rounded-lg">
          <div class="px-4 py-5 sm:px-6 flex items-center justify-between">
            <div>
              <h3 class="text-lg leading-6 font-medium text-gray-900">Meu Perfil</h3>
              <p class="mt-1 max-w-2xl text-sm text-gray-500">Atualize seu nome e senha</p>
            </div>
            <div v-if="badgeEmoji" class="flex items-center text-sm text-gray-600">
              <span class="text-xl mr-2">{{ badgeEmoji }}</span>
              <span class="font-medium">Medalha {{ badgeLabel }}</span>
            </div>
          </div>
          
          <!-- Alertas -->
          <div v-if="showSuccess" class="mx-4 mb-4 p-4 rounded-md bg-green-50 border border-green-200">
            <p class="text-sm text-green-700">Perfil atualizado com sucesso!</p>
          </div>
          <div v-if="errorMessage" class="mx-4 mb-4 p-4 rounded-md bg-red-50 border border-red-200">
            <p class="text-sm text-red-700">{{ errorMessage }}</p>
          </div>
          
          <div class="border-t border-gray-200 px-4 py-5 sm:p-6">
            <form @submit.prevent="saveProfile" class="space-y-6">
              <div>
                <label for="nome" class="block text-sm font-medium text-gray-700">Nome</label>
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
          
          <!-- Alterar senha -->
          <div class="border-t border-gray-200 px-4 py-5 sm:px-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Alterar Senha</h3>
            <div v-if="passwordError" class="mb-3 p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">{{ passwordError }}</div>
            <div v-if="passwordSuccess" class="mb-3 p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-700">{{ passwordSuccess }}</div>
            <form @submit.prevent="alterarSenha" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Senha atual</label>
                <input type="password" v-model="passwordForm.senhaAtual" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Nova senha</label>
                <input type="password" v-model="passwordForm.novaSenha" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Confirmar nova senha</label>
                <input type="password" v-model="passwordForm.confirmarSenha" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm" />
              </div>
              <div class="sm:col-span-3">
                <button type="submit" :disabled="changingPassword" class="w-full sm:w-auto px-4 py-2 rounded-md bg-primary-600 text-white text-sm hover:bg-primary-700 disabled:opacity-50">
                  {{ changingPassword ? 'Alterando...' : 'Alterar Senha' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  </div>
</template> 