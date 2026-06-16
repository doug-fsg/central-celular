<!-- UserModal.vue -->
<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Usuario } from '../services/adminService'
import PhoneInput from './PhoneInput.vue'

const props = defineProps<{
  isOpen: boolean
  mode: 'create' | 'edit'
  user?: Partial<Usuario>
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: Partial<Usuario> & { criarCelulaApos?: boolean }): void
}>()

// Lista de cargos permitidos
const cargosPermitidos = [
  'PASTOR',
  'SUPERVISOR',
  'LIDER',
]

// Formulário
const form = ref({
  id: props.user?.id,
  nome: props.user?.nome || '',
  whatsapp: props.user?.whatsapp || '',
  cargo: props.user?.cargo || 'LIDER'
})

// Opção para criar célula após criar líder
const criarCelulaApos = ref(false)

// Opção para enviar convite via WhatsApp (marcado por padrão apenas em modo create)
const enviarConvite = ref(props.mode === 'create')

// Erro de validação do telefone
const phoneError = ref<string | null>(null)

// Atualizar formulário quando o usuário mudar
watch(() => props.user, (newUser) => {
  if (newUser) {
    form.value = {
      id: newUser.id,
      nome: newUser.nome || '',
      whatsapp: newUser.whatsapp || '',
      cargo: newUser.cargo || 'LIDER'
    }
    enviarConvite.value = false // Em modo edit, não enviar convite
    criarCelulaApos.value = false
  } else {
    form.value = {
      id: undefined,
      nome: '',
      whatsapp: '',
      cargo: 'LIDER'
    }
    enviarConvite.value = props.mode === 'create' // Resetar para padrão
    criarCelulaApos.value = false
  }
}, { immediate: true })

// Resetar enviarConvite quando o modo mudar
watch(() => props.mode, (newMode) => {
  enviarConvite.value = newMode === 'create'
  if (newMode === 'create') {
    criarCelulaApos.value = false
  }
})

// Desmarcar criar célula se o cargo deixar de ser LIDER
watch(() => form.value.cargo, (cargo) => {
  if (cargo !== 'LIDER') {
    criarCelulaApos.value = false
  }
})

// Salvar usuário
const handleSubmit = () => {
  const dadosParaSalvar = {
    ...form.value,
    criarCelulaApos: criarCelulaApos.value,
    enviarConvite: enviarConvite.value && props.mode === 'create'
  }

  // Validar WhatsApp
  if (!form.value.whatsapp) {
    alert('O WhatsApp é obrigatório')
    return
  }

  // Validar se há erro no telefone
  if (phoneError.value) {
    alert('O número de WhatsApp é inválido')
    return
  }

  emit('save', dadosParaSalvar)
}
</script>

<template>
  <div v-if="isOpen" class="modal-backdrop overflow-y-auto" @click.self="$emit('close')">
    <div class="modal-panel modal-panel-md my-auto" @click.stop>
        <!-- Header -->
        <div class="bg-primary-50 px-4 py-5 sm:px-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <h3 class="text-lg leading-6 font-medium text-primary-900">
              {{ mode === 'create' ? 'Novo Usuário' : 'Editar Usuário' }}
            </h3>
            <button
              @click="$emit('close')"
              class="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <span class="sr-only">Fechar</span>
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="px-4 pt-5 pb-4 sm:p-6">
          <div class="space-y-6">
            <!-- Nome -->
            <div>
              <label for="nome" class="block text-sm font-medium text-gray-700 mb-1">
                Nome completo
              </label>
              <div class="relative rounded-md shadow-sm">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="nome"
                  v-model="form.nome"
                  required
                  class="pl-10 focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="Digite o nome completo"
                />
              </div>
            </div>
            
            <!-- WhatsApp -->
            <div>
              <label for="whatsapp" class="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp <span class="text-red-500">*</span>
              </label>
              <PhoneInput
                v-model="form.whatsapp"
                @error="phoneError = $event"
                mode="admin"
              />
              <p class="mt-1 text-sm text-gray-500">
                O usuário receberá um link de acesso neste número para criar sua senha
              </p>
            </div>

            <!-- Cargo -->
            <div>
              <label for="cargo" class="block text-sm font-medium text-gray-700 mb-1">
                Cargo
              </label>
              <div class="relative rounded-md shadow-sm">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clip-rule="evenodd" />
                  </svg>
                </div>
                <select
                  id="cargo"
                  v-model="form.cargo"
                  required
                  class="pl-10 focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option v-for="cargo in cargosPermitidos" :key="cargo" :value="cargo">
                    {{ cargo }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Opção: enviar convite via WhatsApp (apenas em modo create) — área de toque ampla -->
            <label
              v-if="mode === 'create'"
              for="enviar-convite"
              class="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-3 sm:min-h-[52px] cursor-pointer hover:bg-gray-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500 has-[:focus-visible]:ring-offset-2"
            >
              <div class="flex items-center pt-0.5 shrink-0">
                <input
                  id="enviar-convite"
                  v-model="enviarConvite"
                  type="checkbox"
                  class="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
              <span class="text-sm text-left">
                <span class="font-medium text-gray-800 block">Enviar convite via WhatsApp</span>
                <span class="text-gray-600 mt-0.5 block">O usuário recebe um link neste número; até criar a senha o cadastro fica pendente (não ativo).</span>
              </span>
            </label>

            <!-- Opção: criar célula após salvar (apenas para LIDER em criação) -->
            <label
              v-if="mode === 'create' && form.cargo === 'LIDER'"
              for="criar-celula"
              class="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-3 sm:min-h-[52px] cursor-pointer hover:bg-gray-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500 has-[:focus-visible]:ring-offset-2"
            >
              <div class="flex items-center pt-0.5 shrink-0">
                <input
                  id="criar-celula"
                  v-model="criarCelulaApos"
                  type="checkbox"
                  class="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
              <span class="text-sm text-left">
                <span class="font-medium text-gray-800 block">Criar célula para este líder após salvar</span>
                <span class="text-gray-600 mt-0.5 block">Abre o formulário de nova célula com o líder já selecionado e a lista de membros ao lado.</span>
              </span>
            </label>
          </div>

          <div class="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              @click="$emit('close')"
              class="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {{ mode === 'create' ? 'Criar' : 'Salvar' }}
            </button>
          </div>
        </form>
    </div>
  </div>
</template> 