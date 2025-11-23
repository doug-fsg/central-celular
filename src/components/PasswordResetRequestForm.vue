<script setup lang="ts">
import { ref, reactive } from 'vue'
import api from '../services/api'
import PhoneInput from './PhoneInput.vue'

// Prop para fechar o modal
const props = defineProps<{
  onClose: () => void
}>()

// Estados
const loading = ref(false)
const error = ref('')
const success = ref('')
const phoneError = ref<string | null>(null)

// Formulário
const form = reactive({
  whatsapp: '',
  dataNascimento: ''
})

// Funções de validação
const validate = () => {
  error.value = ''
  
  if (!form.whatsapp.trim()) {
    error.value = 'Por favor, informe seu número de WhatsApp'
    return false
  }
  
  if (phoneError.value) {
    error.value = phoneError.value
    return false
  }
  
  if (!form.dataNascimento.trim()) {
    error.value = 'Por favor, informe sua data de nascimento'
    return false
  }
  
  const dataNasc = new Date(form.dataNascimento)
  const hoje = new Date()
  if (dataNasc > hoje) {
    error.value = 'A data de nascimento não pode ser no futuro'
    return false
  }
  
  return true
}

// Solicitar reset de senha
const requestReset = async () => {
  error.value = ''
  success.value = ''
  
  if (!validate()) return
  
  try {
    loading.value = true
    
    const response = await api.requestPasswordReset(form.whatsapp, form.dataNascimento)
    
    if (response.success) {
      success.value = response.message || 'Link de recuperação enviado para seu WhatsApp. Verifique sua mensagem.'
    } else {
      error.value = response.message || 'Erro ao solicitar reset de senha'
    }
  } catch (err: any) {
    error.value = err.message || 'Erro ao solicitar reset de senha. Tente novamente.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="bg-white rounded-md shadow-sm max-w-md w-full mx-auto">
    <div class="p-6">
      <h2 class="text-xl font-bold text-gray-800 mb-6">Esqueci minha senha</h2>
      
      <!-- Alertas -->
      <div v-if="error" class="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
        {{ error }}
      </div>
      
      <div v-if="success" class="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
        {{ success }}
      </div>
      
      <!-- Formulário -->
      <form v-if="!success" @submit.prevent="requestReset" class="space-y-4">
        <div>
          <label for="whatsapp" class="block text-sm font-medium text-gray-700 mb-1">
            Número de WhatsApp
          </label>
          <PhoneInput
            v-model="form.whatsapp"
            @error="phoneError = $event"
            mode="login"
            :disabled="loading"
          />
        </div>
        
        <div>
          <label for="dataNascimento" class="block text-sm font-medium text-gray-700 mb-1">
            Data de Nascimento
          </label>
          <input
            id="dataNascimento"
            v-model="form.dataNascimento"
            type="date"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            :disabled="loading"
            :max="new Date().toISOString().split('T')[0]"
          />
        </div>
        
        <div class="flex justify-between mt-6">
          <button 
            type="button"
            class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
            @click="props.onClose"
            :disabled="loading"
          >
            Cancelar
          </button>
          
          <button
            type="submit"
            class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50"
            :disabled="loading"
          >
            <span v-if="loading">Enviando...</span>
            <span v-else>Enviar Link</span>
          </button>
        </div>
      </form>
      
      <!-- Mensagem de sucesso -->
      <div v-if="success" class="mt-6">
        <button
          type="button"
          class="w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
          @click="props.onClose"
        >
          Fechar
        </button>
      </div>
    </div>
  </div>
</template>

