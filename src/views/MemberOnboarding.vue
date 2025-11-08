<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMemberStore } from '../stores/memberStore'
import { useUserStore } from '../stores/userStore'

const router = useRouter()
const memberStore = useMemberStore()
const userStore = useUserStore()

const currentStep = ref(1) // 1: Boas-vindas, 2: Cadastro rápido, 3: Finalizado
const loading = ref(false)
const error = ref('')
const success = ref('')

// Lista de membros sendo cadastrados
const membros = ref<Array<{
  id: string
  nome: string
  telefone: string
  dataNascimento: string
  ehConsolidador: boolean
  ehCoLider: boolean
  ehAnfitriao: boolean
  observacoes: string
}>>([])

// Formulário para novo membro
const novoMembro = reactive({
  nome: '',
  telefone: '',
  dataNascimento: '',
  ehConsolidador: false,
  ehCoLider: false,
  ehAnfitriao: false,
  observacoes: ''
})

// Contador para IDs únicos temporários
let membroIdCounter = 1

const adicionarMembro = () => {
  if (!novoMembro.nome.trim()) {
    error.value = 'Nome é obrigatório'
    return
  }

  // Adicionar à lista
  membros.value.push({
    id: `temp_${membroIdCounter++}`,
    nome: novoMembro.nome,
    telefone: novoMembro.telefone,
    dataNascimento: novoMembro.dataNascimento,
    ehConsolidador: novoMembro.ehConsolidador,
    ehCoLider: novoMembro.ehCoLider,
    ehAnfitriao: novoMembro.ehAnfitriao,
    observacoes: novoMembro.observacoes
  })

  // Limpar formulário
  Object.assign(novoMembro, {
    nome: '',
    telefone: '',
    dataNascimento: '',
    ehConsolidador: false,
    ehCoLider: false,
    ehAnfitriao: false,
    observacoes: ''
  })

  error.value = ''
  
  // Focar no campo nome para facilitar cadastro rápido
  setTimeout(() => {
    const nomeInput = document.getElementById('nome-input')
    if (nomeInput) nomeInput.focus()
  }, 100)
}

const removerMembro = (id: string) => {
  membros.value = membros.value.filter(m => m.id !== id)
}

const finalizarCadastro = async () => {
  if (membros.value.length === 0) {
    error.value = 'Adicione pelo menos um membro'
    return
  }

  loading.value = true
  error.value = ''

  try {
    console.log('[Onboarding] Iniciando cadastro de membros')
    console.log('[Onboarding] CelulaId atual:', memberStore.celulaId)
    
    // Se não tem célula, recarregar primeiro
    if (!memberStore.celulaId) {
      console.log('[Onboarding] Sem célula, recarregando dados...')
      await memberStore.carregarMembros()
    }
    
    // Verificar se ainda não tem célula
    if (!memberStore.celulaId) {
      error.value = 'Erro: Você precisa estar associado a uma célula para cadastrar membros. Entre em contato com o administrador.'
      return
    }

    // Cadastrar todos os membros
    for (const membro of membros.value) {
      console.log('[Onboarding] Cadastrando membro:', membro.nome)
      await memberStore.addMember({
        name: membro.nome,
        telefone: membro.telefone,
        dataNascimento: membro.dataNascimento,
        isConsolidator: membro.ehConsolidador,
        isCoLeader: membro.ehCoLider,
        isHost: membro.ehAnfitriao,
        isActive: true,
        observacoes: membro.observacoes
      })
    }

    success.value = `${membros.value.length} membros cadastrados!`
    currentStep.value = 3

    // Redirecionar após 2 segundos
    setTimeout(() => {
      router.push({ name: 'dashboard' })
    }, 2000)

  } catch (err: any) {
    console.error('[Onboarding] Erro ao cadastrar membros:', err)
    error.value = err.message || 'Erro ao cadastrar membros'
  } finally {
    loading.value = false
  }
}

const pularOnboarding = () => {
  router.push({ name: 'dashboard' })
}

// Estatísticas
onMounted(async () => {
  console.log('[Onboarding] Componente montado')
  console.log('[Onboarding] Usuário:', userStore.user)
  console.log('[Onboarding] CelulaId:', memberStore.celulaId)
  
  // Garantir que os dados estão carregados
  if (!memberStore.celulaId) {
    console.log('[Onboarding] Carregando dados do memberStore...')
    await memberStore.carregarMembros()
  }
  
  // Focar no primeiro campo quando chegar na etapa 2
  if (currentStep.value === 2) {
    setTimeout(() => {
      const nomeInput = document.getElementById('nome-input')
      if (nomeInput) nomeInput.focus()
    }, 500)
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header minimalista -->
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-lg mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <h1 class="text-lg font-semibold text-gray-900">Configuração</h1>
          <button 
            @click="pularOnboarding"
            class="text-sm text-gray-500 hover:text-gray-700"
          >
            Pular
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-lg mx-auto px-4 py-6">
      <!-- Etapa 1: Boas-vindas -->
      <div
        v-if="currentStep === 1"
        class="flex flex-col items-center justify-center text-center gap-8 min-h-[calc(100vh-200px)]"
      >
        <div class="space-y-2">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">
            Olá, {{ userStore.user?.nome?.split(' ')[0] }}!
          </h2>
          <p class="text-gray-600">
            Vamos cadastrar os membros da sua célula
          </p>
        </div>

        <button 
          @click="currentStep = 2"
          class="w-full px-6 py-4 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all"
        >
          Começar
        </button>
      </div>

      <!-- Etapa 2: Cadastro rápido -->
      <div v-if="currentStep === 2">
        <!-- Formulário compacto -->
        <div class="bg-white rounded-xl p-4 mb-4 border border-gray-200">
          <h3 class="font-semibold text-gray-900 mb-4">Novo Membro</h3>
          
          <form @submit.prevent="adicionarMembro" class="space-y-3">
            <div>
              <input
                id="nome-input"
                v-model="novoMembro.nome"
                type="text"
                placeholder="Nome completo"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            <div>
              <input
                v-model="novoMembro.dataNascimento"
                type="date"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                :max="new Date().toISOString().split('T')[0]"
              />
            </div>

            <!-- Funções especiais - compacto -->
            <div class="grid grid-cols-3 gap-2">
              <label class="flex items-center justify-center p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50" :class="{ 'bg-green-50 border-green-500': novoMembro.ehConsolidador }">
                <input
                  v-model="novoMembro.ehConsolidador"
                  type="checkbox"
                  class="sr-only"
                />
                <span class="text-sm font-medium" :class="novoMembro.ehConsolidador ? 'text-green-700' : 'text-gray-600'">
                  Consolidador
                </span>
              </label>
              
              <label class="flex items-center justify-center p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50" :class="{ 'bg-purple-50 border-purple-500': novoMembro.ehCoLider }">
                <input
                  v-model="novoMembro.ehCoLider"
                  type="checkbox"
                  class="sr-only"
                />
                <span class="text-sm font-medium" :class="novoMembro.ehCoLider ? 'text-purple-700' : 'text-gray-600'">
                  Co-líder
                </span>
              </label>
              
              <label class="flex items-center justify-center p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50" :class="{ 'bg-orange-50 border-orange-500': novoMembro.ehAnfitriao }">
                <input
                  v-model="novoMembro.ehAnfitriao"
                  type="checkbox"
                  class="sr-only"
                />
                <span class="text-sm font-medium" :class="novoMembro.ehAnfitriao ? 'text-orange-700' : 'text-gray-600'">
                  Anfitrião
                </span>
              </label>
            </div>

            <!-- Alertas -->
            <div v-if="error" class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {{ error }}
            </div>

            <button
              type="submit"
              class="w-full px-4 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all"
            >
              Adicionar
            </button>
          </form>
        </div>

        <!-- Lista de membros compacta -->
        <div class="bg-white rounded-xl p-4 border border-gray-200">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-gray-900">
              Membros ({{ membros.length }})
            </h3>
          </div>

          <div v-if="membros.length === 0" class="text-center py-6">
            <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span class="text-xl text-gray-400">👥</span>
            </div>
            <p class="text-gray-500 text-sm">Nenhum membro ainda</p>
          </div>

          <div v-else class="space-y-2 max-h-64 overflow-y-auto">
            <div
              v-for="membro in membros"
              :key="membro.id"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div class="flex-1 min-w-0">
                <h4 class="font-medium text-gray-900 truncate">{{ membro.nome }}</h4>
                <div class="flex items-center space-x-2 mt-1">
                  <span v-if="membro.telefone" class="text-xs text-gray-500">{{ membro.telefone }}</span>
                  <div class="flex space-x-1">
                    <span v-if="membro.ehConsolidador" class="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">C</span>
                    <span v-if="membro.ehCoLider" class="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">L</span>
                    <span v-if="membro.ehAnfitriao" class="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">A</span>
                  </div>
                </div>
              </div>
              <button
                @click="removerMembro(membro.id)"
                class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Botão finalizar -->
          <div v-if="membros.length > 0" class="mt-4">
            <button
              @click="finalizarCadastro"
              :disabled="loading"
              class="w-full px-4 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-all disabled:opacity-50"
            >
              <span v-if="loading">Salvando...</span>
              <span v-else>Finalizar ({{ membros.length }})</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Etapa 3: Finalizado -->
      <div v-if="currentStep === 3" class="text-center">
        <div class="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span class="text-2xl text-white">✓</span>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">
          Pronto!
        </h2>
        <div v-if="success" class="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl mb-4">
          {{ success }}
        </div>
        <p class="text-gray-600 mb-6">
          Redirecionando...
        </p>
      </div>
    </main>
  </div>
</template>
