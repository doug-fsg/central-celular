<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import { useMemberStore } from '../stores/memberStore'
import celulaService from '../services/celulaService'

const router = useRouter()
const userStore = useUserStore()
const memberStore = useMemberStore()

// Estado do wizard
const currentStep = ref(1) // 1: Criar célula, 2: Adicionar membros
const loading = ref(false)
const error = ref('')
const success = ref('')
const showConfirmModal = ref(false)

// Dados da célula criada
const celulaId = ref<number | null>(null)
const existingCell = ref<any | null>(null)

// ========== STEP 1: CRIAR CÉLULA ==========

const celulaForm = reactive({
  nome: '',
  endereco: '',
  diaSemana: '',
  horario: ''
})

const diasSemana = [
  { value: 'segunda', label: 'Segunda-feira' },
  { value: 'terca', label: 'Terça-feira' },
  { value: 'quarta', label: 'Quarta-feira' },
  { value: 'quinta', label: 'Quinta-feira' },
  { value: 'sexta', label: 'Sexta-feira' },
  { value: 'sabado', label: 'Sábado' },
  { value: 'domingo', label: 'Domingo' }
]

const criarCelula = async () => {
  error.value = ''
  
  if (!celulaForm.nome.trim()) {
    error.value = 'Nome da célula é obrigatório'
    return
  }
  
  if (!celulaForm.diaSemana) {
    error.value = 'Selecione o dia da semana'
    return
  }
  
  if (!celulaForm.horario.trim()) {
    error.value = 'Horário é obrigatório'
    return
  }

  loading.value = true

  try {
    const dadosCelula = {
      nome: celulaForm.nome,
      endereco: celulaForm.endereco || undefined,
      diaSemana: celulaForm.diaSemana,
      horario: celulaForm.horario,
      liderId: userStore.user!.id
    }
    
    const novaCelula = await celulaService.criarCelula(dadosCelula)
    celulaId.value = novaCelula.id
    
    success.value = 'Célula criada com sucesso!'
    
    // Recarregar dados do memberStore
    await memberStore.carregarMembros()
    
    // Avançar para próximo step após 1 segundo
    setTimeout(() => {
      success.value = ''
      currentStep.value = 2
    }, 1000)

  } catch (err: any) {
    console.error('[OnboardingWizard] Erro ao criar célula:', err)
    error.value = err.message || 'Erro ao criar célula'
  } finally {
    loading.value = false
  }
}

// ========== STEP 2: ADICIONAR MEMBROS ==========

const membros = ref<Array<{
  id: string
  nome: string
  dataNascimento: string
  ehConsolidador: boolean
  ehCoLider: boolean
  ehAnfitriao: boolean
  observacoes: string
}>>([])

const novoMembro = reactive({
  nome: '',
  dataNascimento: '',
  ehConsolidador: false,
  ehCoLider: false,
  ehAnfitriao: false,
  observacoes: ''
})

let membroIdCounter = 1

// Máscara de data DD/MM/AAAA
const formatDateInput = (value: string) => {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`
}

const onDateInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const formatted = formatDateInput(input.value)
  novoMembro.dataNascimento = formatted
}

// Converter DD/MM/AAAA para AAAA-MM-DD antes de salvar
const convertDateToISO = (dateStr: string): string => {
  if (!dateStr.trim()) return ''
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
  const match = dateStr.match(dateRegex)
  if (!match) return dateStr
  const [, dia, mes, ano] = match
  return `${ano}-${mes}-${dia}`
}

const adicionarMembro = () => {
  if (!novoMembro.nome.trim()) {
    error.value = 'Nome é obrigatório'
    return
  }

  membros.value.push({
    id: `temp_${membroIdCounter++}`,
    nome: novoMembro.nome,
    dataNascimento: novoMembro.dataNascimento,
    ehConsolidador: novoMembro.ehConsolidador,
    ehCoLider: novoMembro.ehCoLider,
    ehAnfitriao: novoMembro.ehAnfitriao,
    observacoes: novoMembro.observacoes
  })

  // Limpar formulário
  Object.assign(novoMembro, {
    nome: '',
    dataNascimento: '',
    ehConsolidador: false,
    ehCoLider: false,
    ehAnfitriao: false,
    observacoes: ''
  })

  error.value = ''
  
  // Focar no campo nome
  setTimeout(() => {
    const nomeInput = document.getElementById('nome-input')
    if (nomeInput) nomeInput.focus()
  }, 100)
}

const removerMembro = (id: string) => {
  membros.value = membros.value.filter(m => m.id !== id)
}

const solicitarConfirmacao = () => {
  if (membros.value.length === 0) {
    error.value = 'Adicione pelo menos um membro para continuar'
    return
  }
  error.value = ''
  showConfirmModal.value = true
}

const continuarComCelulaExistente = () => {
  error.value = ''
  currentStep.value = 2
}

const finalizarOnboarding = async () => {
  if (membros.value.length === 0) {
    error.value = 'Adicione pelo menos um membro para continuar'
    return
  }

  loading.value = true
  error.value = ''
  showConfirmModal.value = false

  try {
    // Cadastrar todos os membros
    for (const membro of membros.value) {
      await memberStore.addMember({
        name: membro.nome,
        dataNascimento: convertDateToISO(membro.dataNascimento) || undefined,
        isConsolidator: membro.ehConsolidador,
        isCoLeader: membro.ehCoLider,
        isHost: membro.ehAnfitriao,
        isActive: true,
        observacoes: membro.observacoes
      })
    }

    success.value = 'Configuração concluída! Redirecionando...'

    // Redirecionar para dashboard após 1.5 segundos
    setTimeout(() => {
      router.replace({ name: 'dashboard' })
    }, 1500)

  } catch (err: any) {
    console.error('[OnboardingWizard] Erro ao cadastrar membros:', err)
    error.value = err.message || 'Erro ao cadastrar membros'
  } finally {
    loading.value = false
  }
}

const voltarParaStep1 = () => {
  currentStep.value = 1
}

// Computed
const podeAvancar = computed(() => {
  if (currentStep.value === 1) {
    if (existingCell.value) {
      return true
    }
    return celulaForm.nome.trim() && celulaForm.diaSemana && celulaForm.horario.trim()
  }
  return membros.value.length > 0
})

onMounted(async () => {
  try {
    const liderId = userStore.user?.id
    if (!liderId) return

    const respostaAtivas = await celulaService.listarCelulas({ lider: liderId, ativo: true })
    let celula = respostaAtivas?.celulas?.[0]

    if (!celula) {
      const respostaTodas = await celulaService.listarCelulas({ lider: liderId })
      celula = respostaTodas?.celulas?.[0]
    }

    if (celula) {
      const detalhes = await celulaService.obterCelula(celula.id)
      existingCell.value = detalhes
      celulaId.value = celula.id
      memberStore.celulaId = celula.id
      currentStep.value = 2
    }
  } catch (err) {
    console.error('[OnboardingWizard] Erro ao carregar célula existente:', err)
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-3xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-lg font-semibold text-gray-900">Configuração Inicial</h1>
            <p class="text-sm text-gray-500 mt-1">
              Passo {{ currentStep }} de 2
            </p>
          </div>
          <!-- Indicador de progresso -->
          <div class="flex items-center gap-2">
            <div 
              :class="[
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                currentStep >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
              ]"
            >
              1
            </div>
            <div class="w-12 h-1 bg-gray-200 rounded">
              <div 
                class="h-full bg-primary-600 rounded transition-all duration-300"
                :style="{ width: currentStep >= 2 ? '100%' : '0%' }"
              ></div>
            </div>
            <div 
              :class="[
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                currentStep >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
              ]"
            >
              2
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 py-8">
      <!-- STEP 1: Criar Célula -->
      <div v-if="currentStep === 1" class="space-y-6">
        <div class="text-center mb-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">
            Olá, {{ userStore.user?.nome?.split(' ')[0] }}!
          </h2>
          <p class="text-gray-600">
            Vamos começar criando sua célula
          </p>
        </div>

        <div v-if="existingCell" class="bg-white rounded-xl p-6 shadow-sm border border-green-200">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Célula encontrada</h3>
          <p class="text-gray-700 mb-4">
            Detectamos que você já possui uma célula cadastrada. Vamos avançar para o cadastro de membros.
          </p>
          <div class="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2 text-sm text-green-900">
            <p><span class="font-semibold">Nome:</span> {{ existingCell.nome }}</p>
            <p><span class="font-semibold">Dia:</span> {{ existingCell.diaSemana }} às {{ existingCell.horario }}</p>
            <p v-if="existingCell.endereco"><span class="font-semibold">Endereço:</span> {{ existingCell.endereco }}</p>
          </div>
          <button
            @click="continuarComCelulaExistente"
            class="mt-6 w-full px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all"
          >
            Continuar para cadastro de membros
          </button>
        </div>

        <div v-else class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <form @submit.prevent="criarCelula" class="space-y-5">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Nome da Célula *
              </label>
              <input
                v-model="celulaForm.nome"
                type="text"
                placeholder="Ex: Célula Esperança"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Endereço
              </label>
              <input
                v-model="celulaForm.endereco"
                type="text"
                placeholder="Onde a célula se reúne"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Dia da Semana *
                </label>
                <select
                  v-model="celulaForm.diaSemana"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value="">Selecione...</option>
                  <option v-for="dia in diasSemana" :key="dia.value" :value="dia.value">
                    {{ dia.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Horário *
                </label>
                <input
                  v-model="celulaForm.horario"
                  type="time"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
            </div>

            <!-- Alertas -->
            <div v-if="error" class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {{ error }}
            </div>
            
            <div v-if="success" class="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {{ success }}
            </div>

            <button
              type="submit"
              :disabled="loading || !podeAvancar"
              class="w-full px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="loading">Criando célula...</span>
              <span v-else>Próximo: Adicionar Membros</span>
            </button>
          </form>
        </div>
      </div>

      <!-- STEP 2: Adicionar Membros -->
      <div v-if="currentStep === 2" class="space-y-6">
        <!-- Formulário para adicionar membro -->
        <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Novo Membro</h3>
          
          <form @submit.prevent="adicionarMembro" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Nome *
              </label>
              <input
                id="nome-input"
                v-model="novoMembro.nome"
                type="text"
                placeholder="Nome completo"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Data de Nascimento (opcional)
              </label>
              <input
                :value="novoMembro.dataNascimento"
                @input="onDateInput"
                type="text"
                placeholder="DD/MM/AAAA"
                maxlength="10"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <!-- Checkboxes para funções -->
            <div class="flex flex-wrap gap-4">
              <label class="flex items-center">
                <input
                  v-model="novoMembro.ehConsolidador"
                  type="checkbox"
                  class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span class="ml-2 text-sm text-gray-700">Consolidador</span>
              </label>

              <label class="flex items-center">
                <input
                  v-model="novoMembro.ehCoLider"
                  type="checkbox"
                  class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span class="ml-2 text-sm text-gray-700">Co-Líder</span>
              </label>

              <label class="flex items-center">
                <input
                  v-model="novoMembro.ehAnfitriao"
                  type="checkbox"
                  class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span class="ml-2 text-sm text-gray-700">Anfitrião</span>
              </label>
            </div>

            <button
              type="submit"
              class="w-full px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-all"
            >
              + Adicionar Membro
            </button>
          </form>
        </div>

        <!-- Lista de membros adicionados -->
        <div v-if="membros.length > 0" class="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">
            Membros Adicionados ({{ membros.length }})
          </h3>
          
          <ul class="space-y-3">
            <li 
              v-for="membro in membros" 
              :key="membro.id"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <p class="font-medium text-gray-900">{{ membro.nome }}</p>
                <div v-if="membro.ehConsolidador || membro.ehCoLider || membro.ehAnfitriao" class="flex gap-2 mt-1">
                  <span v-if="membro.ehConsolidador" class="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded">
                    Consolidador
                  </span>
                  <span v-if="membro.ehCoLider" class="text-xs px-2 py-0.5 bg-accent-100 text-accent-700 rounded">
                    Co-Líder
                  </span>
                  <span v-if="membro.ehAnfitriao" class="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                    Anfitrião
                  </span>
                </div>
              </div>
              <button
                @click="removerMembro(membro.id)"
                class="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Remover
              </button>
            </li>
          </ul>
        </div>

        <!-- Alertas -->
        <div v-if="error" class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {{ error }}
        </div>
        
        <div v-if="success" class="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {{ success }}
        </div>

        <!-- Botões de navegação -->
        <div class="flex gap-4">
          <button
            @click="voltarParaStep1"
            :disabled="loading"
            class="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50"
          >
            Voltar
          </button>
          <button
            @click="solicitarConfirmacao"
            :disabled="loading || !podeAvancar"
            class="flex-1 px-6 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading">Finalizando...</span>
            <span v-else>Finalizar Configuração</span>
          </button>
        </div>
      </div>
    </main>

    <!-- Modal de confirmação -->
    <div
      v-if="showConfirmModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4"
    >
      <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">
          Confirmar envio
        </h3>
        <p class="text-sm text-gray-600 mb-4">
          Você está prestes a cadastrar <span class="font-semibold text-gray-900">{{ membros.length }}</span>
          {{ membros.length === 1 ? 'membro' : 'membros' }} na célula
          <span class="font-semibold text-gray-900">
            {{ existingCell?.nome || celulaForm.nome || 'sem nome' }}
          </span>.
          Deseja continuar?
        </p>
        <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            @click="showConfirmModal = false"
            class="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Seguir editando
          </button>
          <button
            type="button"
            @click="finalizarOnboarding"
            :disabled="loading"
            class="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-70"
          >
            {{ loading ? 'Finalizando...' : 'Confirmar envio' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

