<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import api from '../services/api'

const router = useRouter()

// Estados do formulário
const currentStep = ref(1) // 1: WhatsApp, 2: OTP, 3: Dados pessoais
const loading = ref(false)
const error = ref('')
const success = ref('')

// Dados do formulário
const formData = reactive({
  whatsapp: '',
  codigo: '',
  nome: '',
  dataNascimento: '',
  senha: '',
  confirmSenha: ''
})

// Solicitar código OTP
const enviarCodigo = async () => {
  error.value = ''
  
  if (!formData.whatsapp.trim()) {
    error.value = 'Por favor, informe seu WhatsApp'
    return
  }
  
  const digits = formData.whatsapp.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 11) {
    error.value = 'WhatsApp inválido'
    return
  }
  
  try {
    loading.value = true
    
    const response = await api.requestOtp(formData.whatsapp)
    
    if (response.success) {
      success.value = response.message || 'Código enviado com sucesso!'
      currentStep.value = 2
    } else {
      error.value = response.message || 'Erro ao enviar código'
    }
  } catch (err: any) {
    error.value = err.message || 'Erro ao enviar código'
  } finally {
    loading.value = false
  }
}

// Verificar código
const verificarCodigo = async () => {
  error.value = ''
  
  if (!formData.codigo.trim() || formData.codigo.length !== 4) {
    error.value = 'Digite o código de 4 dígitos'
    return
  }
  
  try {
    loading.value = true
    
    const response = await api.verifyOtp(formData.whatsapp, formData.codigo)
    
    if (response.success) {
      success.value = response.message || 'Código verificado!'
      currentStep.value = 3
    } else {
      error.value = response.message || 'Código inválido'
    }
  } catch (err: any) {
    error.value = err.message || 'Código inválido'
  } finally {
    loading.value = false
  }
}

// Finalizar cadastro
const finalizarCadastro = async () => {
  error.value = ''
  
  if (!formData.nome.trim()) {
    error.value = 'Nome é obrigatório'
    return
  }
  
  if (formData.senha.length < 6) {
    error.value = 'Senha deve ter pelo menos 6 caracteres'
    return
  }
  
  if (formData.senha !== formData.confirmSenha) {
    error.value = 'Senhas não coincidem'
    return
  }
  
  try {
    loading.value = true
    
    await api.createPassword(
      formData.whatsapp,
      formData.nome,
      formData.senha,
      formData.dataNascimento || undefined
    )
    
    success.value = 'Cadastro realizado com sucesso! Redirecionando...'
    
    setTimeout(() => {
      router.push('/login')
    }, 1500)
  } catch (err: any) {
    error.value = err.message || 'Erro ao finalizar cadastro'
  } finally {
    loading.value = false
  }
}

const handleSubmit = () => {
  if (currentStep.value === 1) {
    enviarCodigo()
  } else if (currentStep.value === 2) {
    verificarCodigo()
  } else if (currentStep.value === 3) {
    finalizarCadastro()
  }
}

const voltarEtapa = () => {
  if (currentStep.value > 1) {
    currentStep.value--
    error.value = ''
    success.value = ''
  }
}

// Formatar WhatsApp
const formatarWhatsApp = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

const onWhatsAppInput = (e: Event) => {
  const input = e.target as HTMLInputElement
  const formatted = formatarWhatsApp(input.value)
  formData.whatsapp = formatted
  input.value = formatted
}
</script>

<template>
  <div class="fixed inset-0 bg-black overflow-y-auto">
    <!-- Conteúdo Principal - Estilo Spotify -->
    <div class="min-h-screen flex items-center justify-center px-6 py-16 bg-black">
      <div class="w-full max-w-[450px]">
        <!-- Card do Formulário - Estilo Spotify -->
        <div class="bg-black">
          <!-- Título Principal -->
          <div class="text-center mb-10">
            <h1 class="text-4xl font-black text-white mb-4 tracking-tight">
              <span v-if="currentStep === 1">Se prepare para o extraordinário</span>
              <span v-else-if="currentStep === 2">Verificação</span>
              <span v-else>Quase lá</span>
            </h1>
            <p class="text-neutral-400 text-sm" v-if="currentStep === 1">
              Gileade - 2025
            </p>
            <p class="text-neutral-400 text-sm" v-else-if="currentStep === 2">
              Digite o código enviado para seu WhatsApp
            </p>
            <p class="text-neutral-400 text-sm" v-else>
              Complete suas informações para finalizar
            </p>
          </div>

          <!-- Alertas -->
          <div v-if="error" class="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-md text-sm">
            {{ error }}
          </div>
          
          <div v-if="success" class="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-md text-sm">
            {{ success }}
          </div>

          <!-- Formulário -->
          <form @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Etapa 1: WhatsApp -->
            <div v-if="currentStep === 1">
              <label class="block text-sm font-semibold text-white mb-2">
                Digite seu WhatsApp
              </label>
              <input
                v-model="formData.whatsapp"
                @input="onWhatsAppInput"
                type="tel"
                placeholder="(11) 99999-9999"
                class="w-full px-4 py-4 bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white transition-all text-base"
                :disabled="loading"
                maxlength="15"
              />
            </div>

            <!-- Etapa 2: Código OTP -->
            <div v-if="currentStep === 2">
              <label class="block text-sm font-semibold text-white mb-2">
                Código de Verificação
              </label>
              <input
                v-model="formData.codigo"
                type="text"
                placeholder="0000"
                class="w-full px-4 py-4 text-center text-3xl font-bold tracking-widest bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white transition-all"
                :disabled="loading"
                maxlength="4"
                autocomplete="one-time-code"
              />
              <p class="text-xs text-neutral-500 text-center mt-3">
                Código enviado para {{ formData.whatsapp }}
              </p>
            </div>

            <!-- Etapa 3: Dados Pessoais -->
            <div v-if="currentStep === 3" class="space-y-4">
              <div>
                <label class="block text-sm font-semibold text-white mb-2">
                  Nome Completo
                </label>
                <input
                  v-model="formData.nome"
                  type="text"
                  placeholder="Seu nome completo"
                  class="w-full px-4 py-4 bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white transition-all"
                  :disabled="loading"
                />
              </div>

              <div>
                <label class="block text-sm font-semibold text-white mb-2">
                  Data de Nascimento
                  <span class="text-neutral-500 font-normal ml-1">(opcional)</span>
                </label>
                <input
                  v-model="formData.dataNascimento"
                  type="date"
                  class="w-full px-4 py-4 bg-neutral-900 border border-neutral-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white transition-all"
                  :disabled="loading"
                  :max="new Date().toISOString().split('T')[0]"
                />
              </div>

              <div>
                <label class="block text-sm font-semibold text-white mb-2">
                  Senha
                </label>
                <input
                  v-model="formData.senha"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  class="w-full px-4 py-4 bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white transition-all"
                  :disabled="loading"
                />
              </div>

              <div>
                <label class="block text-sm font-semibold text-white mb-2">
                  Confirmar Senha
                </label>
                <input
                  v-model="formData.confirmSenha"
                  type="password"
                  placeholder="Digite a senha novamente"
                  class="w-full px-4 py-4 bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white transition-all"
                  :disabled="loading"
                />
              </div>
            </div>

            <!-- Botão Principal - Estilo Spotify -->
            <div class="pt-6">
              <button
                type="submit"
                class="w-full px-4 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-full transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-base"
                :disabled="loading"
              >
                <span v-if="loading && currentStep === 1">Enviando...</span>
                <span v-else-if="loading && currentStep === 2">Verificando...</span>
                <span v-else-if="loading && currentStep === 3">Finalizando...</span>
                <span v-else-if="currentStep === 1">Continuar</span>
                <span v-else-if="currentStep === 2">Verificar</span>
                <span v-else>Finalizar cadastro</span>
              </button>
            </div>

            <!-- Botão Voltar -->
            <div v-if="currentStep > 1" class="pt-2">
              <button 
                type="button"
                @click="voltarEtapa"
                class="w-full px-4 py-4 text-white bg-transparent border-2 border-neutral-700 hover:border-white rounded-full font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
                :disabled="loading"
              >
                Voltar
              </button>
            </div>
          </form>

          <!-- Divisor -->
          <div class="flex items-center my-8">
            <div class="flex-1 border-t border-neutral-800"></div>
          </div>

          <!-- Footer -->
          <div class="text-center">
            <p class="text-neutral-400 text-sm">
              Já tem uma conta? 
              <router-link 
                to="/login" 
                class="text-white hover:underline font-semibold ml-1"
              >
                Entrar
              </router-link>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
