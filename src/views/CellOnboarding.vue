<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import celulaService from '../services/celulaService'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const error = ref('')
const success = ref('')

// Formulário de célula
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
    console.log('[CellOnboarding] Criando célula:', celulaForm)
    
    const dadosCelula = {
      nome: celulaForm.nome,
      endereco: celulaForm.endereco || undefined,
      diaSemana: celulaForm.diaSemana,
      horario: celulaForm.horario,
      liderId: userStore.user!.id
    }
    
    await celulaService.criarCelula(dadosCelula)
    
    success.value = 'Célula criada com sucesso!'
    
    // Recarregar dados do memberStore para atualizar celulaId
    const { useMemberStore } = await import('../stores/memberStore')
    const memberStore = useMemberStore()
    await memberStore.carregarMembros()
    
    // Redirecionar para cadastro de membros após 1.5 segundos
    setTimeout(() => {
      router.push({ name: 'member-onboarding' })
    }, 1500)

  } catch (err: any) {
    console.error('[CellOnboarding] Erro ao criar célula:', err)
    error.value = err.message || 'Erro ao criar célula'
  } finally {
    loading.value = false
  }
}

const pularOnboarding = () => {
  router.push({ name: 'dashboard' })
}
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
      <!-- Conteúdo centralizado -->
      <div class="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <div class="w-full max-w-md">
          <!-- Título -->
        <div class="text-center mb-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-2">
              Olá, {{ userStore.user?.nome?.split(' ')[0] }}!
            </h2>
            <p class="text-gray-600">
              Vamos criar sua célula
            </p>
          </div>

          <!-- Formulário -->
          <div class="bg-white rounded-xl p-4 mb-4 border border-gray-200">
            <form @submit.prevent="criarCelula" class="space-y-4">
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

              <!-- Alertas -->
              <div v-if="error" class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {{ error }}
              </div>
              
              <div v-if="success" class="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                {{ success }}
              </div>

              <button
                type="submit"
                :disabled="loading"
              class="w-full px-4 py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition-all disabled:opacity-50"
              >
                <span v-if="loading">Criando...</span>
                <span v-else>Continuar</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
