<script setup lang="ts">
import { ref, reactive } from 'vue'
import api from '../services/api'
import PhoneInput from './PhoneInput.vue'

// Prop para fechar o modal
const props = defineProps<{
  onClose: () => void
}>()

// Emitir evento de sucesso
const emit = defineEmits(['success'])

// Estados dos passos
const currentStep = ref(1)
const loading = ref(false)
const error = ref('')
const success = ref('')
const otpVerified = ref(false)
const phoneError = ref<string | null>(null)

// Step 1: Informar WhatsApp
const whatsappInput = reactive({
  whatsapp: '',
  expiresAt: null as Date | null
})

// Step 2: Verificar OTP
const otpInput = reactive({
  code: ''
})

// Step 3: Criar senha
const passwordInput = reactive({
  nome: '',
  senha: '',
  confirmSenha: ''
})

// Funções de validação
const validateWhatsApp = () => {
  if (!whatsappInput.whatsapp.trim()) {
    error.value = 'Por favor, informe seu número de WhatsApp'
    return false
  }
  
  if (phoneError.value) {
    error.value = phoneError.value
    return false
  }
  
  return true
}

const validateOtp = () => {
  if (!otpInput.code.trim()) {
    error.value = 'Por favor, informe o código recebido'
    return false
  }
  
  if (otpInput.code.length !== 4) {
    error.value = 'O código deve ter 4 dígitos'
    return false
  }
  
  return true
}

const validatePassword = () => {
  if (!passwordInput.nome.trim()) {
    error.value = 'Por favor, informe seu nome'
    return false
  }
  
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

// Step 1: Solicitar OTP
const requestOtp = async () => {
  error.value = ''
  success.value = ''
  
  if (!validateWhatsApp()) return
  
  try {
    loading.value = true
    
    const response = await api.requestOtp(whatsappInput.whatsapp)
    
    if (response.success) {
      success.value = response.message
      whatsappInput.expiresAt = response.expiresAt ? new Date(response.expiresAt) : null
      currentStep.value = 2
    } else {
      error.value = response.message
    }
  } catch (err: any) {
    error.value = err.message || 'Erro ao solicitar código'
  } finally {
    loading.value = false
  }
}

// Step 2: Verificar OTP
const verifyOtp = async () => {
  error.value = ''
  success.value = ''
  
  if (!validateOtp()) return
  
  try {
    loading.value = true
    
    const response = await api.verifyOtp(whatsappInput.whatsapp, otpInput.code)
    
    if (response.success) {
      success.value = response.message
      otpVerified.value = true
      currentStep.value = 3
    } else {
      error.value = response.message
    }
  } catch (err: any) {
    error.value = err.message || 'Erro ao verificar código'
  } finally {
    loading.value = false
  }
}

// Step 3: Criar senha
const createPassword = async () => {
  error.value = ''
  success.value = ''
  
  if (!validatePassword()) return
  
  try {
    loading.value = true
    
    await api.createPassword(whatsappInput.whatsapp, passwordInput.nome, passwordInput.senha)
    
    // Emitir evento de sucesso
    emit('success')
    
    // Fechar o modal após um breve delay
    setTimeout(() => {
      props.onClose()
    }, 1500)
  } catch (err: any) {
    error.value = err.message || 'Erro ao criar senha'
  } finally {
    loading.value = false
  }
}

// Enviar formulário com base no passo atual
const handleSubmit = () => {
  if (currentStep.value === 1) {
    requestOtp()
  } else if (currentStep.value === 2) {
    verifyOtp()
  } else if (currentStep.value === 3) {
    createPassword()
  }
}

// Voltar para o passo anterior
const goBack = () => {
  error.value = ''
  success.value = ''
  
  if (currentStep.value > 1) {
    currentStep.value--
  }
}
</script>

<template>
  <div class="bg-white rounded-md shadow-sm max-w-md w-full mx-auto">
    <div class="p-6">
      <h2 class="text-xl font-bold text-gray-800 mb-6">Primeiro Acesso</h2>
      
      <!-- Progresso -->
      <div class="flex mb-6">
        <div 
          v-for="step in 3" 
          :key="step"
          class="flex-1 text-center"
        >
          <div 
            class="w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1"
            :class="[
              currentStep === step 
                ? 'bg-primary-600 text-white' 
                : currentStep > step 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-200 text-gray-600'
            ]"
          >
            <span v-if="currentStep > step">✓</span>
            <span v-else>{{ step }}</span>
          </div>
          <span class="text-xs">
            {{ step === 1 ? 'WhatsApp' : step === 2 ? 'Verificação' : 'Senha' }}
          </span>
        </div>
      </div>

      <!-- Alertas -->
      <div v-if="error" class="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
        {{ error }}
      </div>
      
      <div v-if="success" class="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
        {{ success }}
      </div>
      
      <!-- Step 1: Informar WhatsApp -->
      <form v-if="currentStep === 1" @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label for="whatsapp" class="block text-sm font-medium text-gray-700 mb-1">
            Número de WhatsApp
          </label>
          <PhoneInput
            v-model="whatsappInput.whatsapp"
            @error="phoneError = $event"
            mode="login"
            :disabled="loading"
          />
        </div>
        
        <div class="flex justify-between mt-6">
          <button 
            type="button"
            class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
            @click="props.onClose"
          >
            Cancelar
          </button>
          
          <button
            type="submit"
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50"
            :disabled="loading"
          >
            <span v-if="loading">Enviando...</span>
            <span v-else>Enviar Código</span>
          </button>
        </div>
      </form>
      
      <!-- Step 2: Verificar OTP -->
      <form v-if="currentStep === 2" @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label for="otp" class="block text-sm font-medium text-gray-700 mb-1">
            Código de Verificação
          </label>
          <input
            id="otp"
            v-model="otpInput.code"
            type="text"
            placeholder="Digite o código de 4 dígitos"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            :disabled="loading"
            maxlength="4"
          />
          <p class="mt-1 text-xs text-gray-500">
            Enviamos um código para o seu WhatsApp.
            <span v-if="whatsappInput.expiresAt">
              Válido até {{ whatsappInput.expiresAt.toLocaleTimeString() }}.
            </span>
          </p>
        </div>
        
        <div class="flex justify-between mt-6">
          <button 
            type="button"
            class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
            @click="goBack"
            :disabled="loading"
          >
            Voltar
          </button>
          
          <button
            type="submit"
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50"
            :disabled="loading"
          >
            <span v-if="loading">Verificando...</span>
            <span v-else>Verificar Código</span>
          </button>
        </div>
      </form>
      
      <!-- Step 3: Criar senha -->
      <form v-if="currentStep === 3" @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label for="nome" class="block text-sm font-medium text-gray-700 mb-1">
            Seu Nome
          </label>
          <input
            id="nome"
            v-model="passwordInput.nome"
            type="text"
            placeholder="Digite seu nome completo"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            :disabled="loading"
          />
        </div>
        
        <div>
          <label for="senha" class="block text-sm font-medium text-gray-700 mb-1">
            Senha
          </label>
          <input
            id="senha"
            v-model="passwordInput.senha"
            type="password"
            placeholder="Digite sua senha"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            :disabled="loading"
          />
          <p class="mt-1 text-xs text-gray-500">
            Mínimo de 6 caracteres.
          </p>
        </div>
        
        <div>
          <label for="confirmSenha" class="block text-sm font-medium text-gray-700 mb-1">
            Confirmar Senha
          </label>
          <input
            id="confirmSenha"
            v-model="passwordInput.confirmSenha"
            type="password"
            placeholder="Confirme sua senha"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            :disabled="loading"
          />
        </div>
        
        <div class="flex justify-between mt-6">
          <button 
            type="button"
            class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
            @click="goBack"
            :disabled="loading"
          >
            Voltar
          </button>
          
          <button
            type="submit"
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50"
            :disabled="loading"
          >
            <span v-if="loading">Criando conta...</span>
            <span v-else>Concluir Cadastro</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template> 