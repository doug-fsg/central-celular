<!-- PhoneInput.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import { parsePhoneNumber, AsYouType } from 'libphonenumber-js'

const props = defineProps<{
  modelValue: string
  mode?: 'admin' | 'login' // Novo prop para diferenciar o comportamento
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'error', value: string | null): void
}>()

const phoneInput = ref('')
const error = ref<string | null>(null)

// Atualizar número quando o usuário digita
const updatePhoneNumber = (e: Event) => {
  const input = e.target as HTMLInputElement
  let value = input.value
  
  // Garantir que o número comece com +
  if (!value.startsWith('+')) {
    value = '+' + value
  }
  
  // Formatar número enquanto digita
  const formatter = new AsYouType()
  phoneInput.value = formatter.input(value)
  
  try {
    // Tentar criar um número de telefone completo
    const phoneNumber = parsePhoneNumber(phoneInput.value)
    
    if (phoneNumber?.isValid()) {
      error.value = null
      // Emitir o número no formato apropriado dependendo do modo
      if (props.mode === 'admin') {
        // Para o admin, enviar apenas os dígitos nacionais
        emit('update:modelValue', phoneNumber.nationalNumber)
      } else {
        // Para login e outros casos, enviar no formato internacional
        emit('update:modelValue', phoneNumber.format('E.164'))
      }
    } else {
      error.value = 'Número de WhatsApp inválido'
    }
  } catch (err) {
    error.value = 'Formato inválido'
  }
  
  emit('error', error.value)
}

// Inicializar o componente com um valor existente
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    try {
      // Se o valor não começar com +, assumimos que é um número nacional do Brasil
      const phoneNumber = parsePhoneNumber(newValue.startsWith('+') ? newValue : `+55${newValue}`)
      if (phoneNumber) {
        phoneInput.value = phoneNumber.formatInternational()
      }
    } catch (err) {
      // Ignorar erro se o número não puder ser parseado
    }
  }
}, { immediate: true })
</script>

<template>
  <div class="flex flex-col space-y-1">
    <!-- Input do Número -->
    <div class="relative">
      <input
        type="tel"
        :value="phoneInput"
        @input="updatePhoneNumber"
        class="pl-3 pr-10 py-2 w-full border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
        placeholder="+55 11 99999-9999"
      />
    </div>

    <!-- Mensagem de Erro -->
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
  </div>
</template> 