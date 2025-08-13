<!-- PhoneInput.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'

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

// Funções de formatação BR (sem DDI +55 na UI)
function formatBR(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  const ddd = digits.slice(0, 2)
  const rest = digits.slice(2)
  if (digits.length === 0) return ''
  if (digits.length <= 2) return `(${ddd}`
  if (digits.length <= 6) return `(${ddd}) ${rest}`
  if (digits.length === 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`
}

function validateBR(value: string): string | null {
  const digits = value.replace(/\D/g, '')
  // Aceita 10 (fixo) ou 11 (celular com nono dígito)
  if (digits.length === 10 || digits.length === 11) return null
  if (digits.length === 0) return null
  return 'Número de WhatsApp inválido'
}

// Atualizar número quando o usuário digita (somente BR nacional)
const updatePhoneNumber = (e: Event) => {
  const input = e.target as HTMLInputElement
  const raw = input.value
  phoneInput.value = formatBR(raw)

  const digits = raw.replace(/\D/g, '').slice(0, 11)
  error.value = validateBR(raw)

  // Emitir somente dígitos nacionais (sem +55)
  emit('update:modelValue', digits)
  emit('error', error.value)
}

// Inicializar o componente com um valor existente
watch(() => props.modelValue, (newValue) => {
  if (newValue == null) {
    phoneInput.value = ''
    error.value = null
    return
  }
  // Remover DDI 55 se vier do backend (12 ou 13 dígitos iniciando com 55)
  const raw = String(newValue).replace(/\D/g, '')
  const normalized = raw.startsWith('55') && (raw.length === 12 || raw.length === 13)
    ? raw.slice(2)
    : raw
  const digits = normalized.slice(0, 11)
  phoneInput.value = formatBR(digits)
  error.value = validateBR(digits)
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
        placeholder="(11) 99999-9999"
      />
    </div>

    <!-- Mensagem de Erro -->
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
  </div>
</template> 