<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Teleport } from 'vue'
import type { Celula } from '../services/adminService'
import { PUBLICO_CELULA_OPTIONS, type PublicoCelula } from '../constants/publicoCelula'
import CellMembersPanel from './CellMembersPanel.vue'

const publicoOptions = PUBLICO_CELULA_OPTIONS.filter((o) => o.value !== 'nao_informado')

const props = defineProps<{
  isOpen: boolean
  cell?: Partial<Celula>
  availableLeaders: any[]
  isLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', data: Partial<Celula>): void
}>()

const formData = ref({
  nome: '',
  publico: '' as PublicoCelula | '',
  endereco: '',
  diaSemana: '',
  horario: '',
  lider_id: '',
  supervisor_id: '',
})

const errors = ref<Record<string, string>>({})
const touched = ref<Record<string, boolean>>({})

const validateField = (field: string, value: any) => {
  touched.value[field] = true

  switch (field) {
    case 'nome':
      if (!value || value.trim().length < 3) {
        errors.value[field] = 'Nome deve ter pelo menos 3 caracteres'
        return false
      }
      break
    case 'lider_id':
      if (!value) {
        errors.value[field] = 'Selecione um líder'
        return false
      }
      break
    case 'endereco':
      if (!value || value.trim().length < 5) {
        errors.value[field] = 'Endereço deve ter pelo menos 5 caracteres'
        return false
      }
      break
    case 'diaSemana':
      if (!value) {
        errors.value[field] = 'Selecione um dia da semana'
        return false
      }
      break
    case 'horario':
      if (!value) {
        errors.value[field] = 'Informe um horário'
        return false
      }
      break
    case 'publico':
      if (!value || value === 'nao_informado') {
        errors.value[field] = 'Selecione o público da célula'
        return false
      }
      break
  }

  delete errors.value[field]
  return true
}

const validateForm = () => {
  const fields = ['nome', 'publico', 'lider_id', 'endereco', 'diaSemana', 'horario']
  let isValid = true

  fields.forEach((field) => {
    if (!validateField(field, formData.value[field as keyof typeof formData.value])) {
      isValid = false
    }
  })

  return isValid
}

watch(
  () => [props.isOpen, props.cell?.id, props.cell] as const,
  ([open, , cell]) => {
    if (open && cell) {
      const publicoAtual = cell.publico
      formData.value = {
        nome: cell.nome || '',
        publico: publicoAtual && publicoAtual !== 'nao_informado' ? publicoAtual : '',
        endereco: cell.endereco || '',
        diaSemana: cell.diaSemana || '',
        horario: cell.horario || '',
        lider_id: (cell.lider_id || cell.liderId)?.toString() || '',
        supervisor_id:
          (cell.supervisor_id || cell.supervisorId || cell.supervisor?.id)?.toString() || '',
      }
    } else if (!open) {
      formData.value = {
        nome: '',
        publico: '',
        endereco: '',
        diaSemana: '',
        horario: '',
        lider_id: '',
        supervisor_id: '',
      }
      errors.value = {}
      touched.value = {}
    }
  },
)

const handleSubmit = () => {
  if (!validateForm()) return

  const liderId = parseInt(formData.value.lider_id)
  const supervisorId = formData.value.supervisor_id ? parseInt(formData.value.supervisor_id) : undefined

  if (isNaN(liderId)) {
    errors.value.lider_id = 'ID do líder inválido'
    return
  }

  if (formData.value.supervisor_id && isNaN(supervisorId as number)) {
    errors.value.supervisor_id = 'ID do supervisor inválido'
    return
  }

  const data: any = {
    nome: formData.value.nome.trim(),
    publico: formData.value.publico,
    endereco: formData.value.endereco.trim(),
    diaSemana: formData.value.diaSemana,
    horario: formData.value.horario,
    liderId,
  }
  if (typeof supervisorId === 'number') {
    data.supervisorId = supervisorId
    data.supervisor_id = supervisorId
  }

  emit('save', data)
}

const diasSemana = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
]

const fieldClass = (field: string) => {
  const base =
    'mt-1 block w-full rounded-lg border bg-white py-2.5 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500'
  if (!touched.value[field]) return `${base} border-gray-200`
  return errors.value[field]
    ? `${base} border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500/20`
    : `${base} border-green-300 focus:border-green-500 focus:ring-green-500/20`
}

const selectClass = (field: string) => `${fieldClass(field)} appearance-none pr-10`

const sortedLeaders = computed(() => {
  return [...props.availableLeaders].sort((a, b) => {
    if (a.cargo !== b.cargo) return a.cargo === 'SUPERVISOR' ? -1 : 1
    return a.nome.localeCompare(b.nome)
  })
})

const availableSupervisors = computed(() =>
  props.availableLeaders
    .filter((user) => user.cargo === 'SUPERVISOR')
    .sort((a, b) => a.nome.localeCompare(b.nome)),
)

const isEditMode = computed(() => Boolean(props.cell?.id))
const cellId = computed(() => props.cell?.id)

const resolvedLiderId = computed(() => {
  if (props.cell?.lider?.id) return props.cell.lider.id
  if (props.cell?.liderId) return props.cell.liderId
  const parsed = parseInt(formData.value.lider_id, 10)
  return Number.isFinite(parsed) ? parsed : undefined
})

const resolvedLiderNome = computed(() => {
  if (props.cell?.lider?.nome) return props.cell.lider.nome
  const id = resolvedLiderId.value
  if (!id) return undefined
  return props.availableLeaders.find((l) => l.id === id)?.nome
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="modal-backdrop p-1 sm:p-2"
      @click.self="emit('close')"
    >
      <div
        class="modal-panel modal-panel-2xl"
        @click.stop
      >
        <!-- Cabeçalho (mesmo padrão do modal de membros) -->
        <div
          class="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4"
        >
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              class="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors active:bg-gray-100 active:text-gray-900 sm:hidden"
              aria-label="Voltar"
              @click="emit('close')"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div class="min-w-0 flex-1">
              <h3 class="truncate text-base font-medium text-gray-900 sm:text-lg">
                {{ isEditMode ? 'Editar Célula' : 'Nova Célula' }}
              </h3>
              <p v-if="cell?.nome" class="mt-0.5 truncate text-xs text-gray-500 sm:hidden">
                {{ cell.nome }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl font-bold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 sm:flex"
            aria-label="Fechar"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>

        <form class="flex min-h-0 flex-1 flex-col" @submit.prevent="handleSubmit">
          <div class="flex min-h-0 flex-1 flex-col lg:flex-row">
            <!-- Coluna esquerda: dados da célula -->
            <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain lg:max-w-[50%]">
            <!-- Dados da célula -->
            <div class="border-b border-gray-100 px-4 py-4 sm:px-6">
              <p class="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Dados da célula
              </p>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label for="nome" class="block text-sm font-medium text-gray-700">
                    Nome <span class="text-red-500">*</span>
                  </label>
                  <input
                    id="nome"
                    v-model="formData.nome"
                    type="text"
                    required
                    :class="fieldClass('nome')"
                    @blur="validateField('nome', formData.nome)"
                  />
                  <p v-if="errors.nome" class="mt-1 text-sm text-red-600">{{ errors.nome }}</p>
                </div>
                <div>
                  <label for="publico" class="block text-sm font-medium text-gray-700">
                    Público <span class="text-red-500">*</span>
                  </label>
                  <select
                    id="publico"
                    v-model="formData.publico"
                    required
                    :class="selectClass('publico')"
                    @blur="validateField('publico', formData.publico)"
                  >
                    <option value="" disabled>Selecione o público</option>
                    <option v-for="opt in publicoOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                  <p v-if="errors.publico" class="mt-1 text-sm text-red-600">{{ errors.publico }}</p>
                </div>
              </div>
            </div>

            <!-- Equipe -->
            <div class="border-b border-gray-100 px-4 py-4 sm:px-6">
              <p class="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Equipe</p>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label for="lider" class="block text-sm font-medium text-gray-700">
                    Líder <span class="text-red-500">*</span>
                  </label>
                  <div class="relative">
                    <select
                      id="lider"
                      v-model="formData.lider_id"
                      required
                      :class="selectClass('lider_id')"
                      @blur="validateField('lider_id', formData.lider_id)"
                    >
                      <option value="" disabled>Selecione um líder</option>
                      <option v-for="lider in sortedLeaders" :key="lider.id" :value="lider.id">
                        {{ lider.nome }} ({{ lider.cargo }}){{ lider.possuiSenha === false ? ' — pendente' : '' }}
                      </option>
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                      <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fill-rule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                  <p v-if="errors.lider_id" class="mt-1 text-sm text-red-600">{{ errors.lider_id }}</p>
                  <p class="mt-1 text-xs text-gray-500">Líderes, supervisores, admins e pastores</p>
                </div>
                <div>
                  <label for="supervisor" class="block text-sm font-medium text-gray-700">
                    Supervisor <span class="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <div class="relative">
                    <select id="supervisor" v-model="formData.supervisor_id" :class="selectClass('supervisor_id')">
                      <option value="">Nenhum</option>
                      <option v-for="supervisor in availableSupervisors" :key="supervisor.id" :value="supervisor.id">
                        {{ supervisor.nome }}
                      </option>
                    </select>
                    <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                      <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fill-rule="evenodd"
                          d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                  <p v-if="errors.supervisor_id" class="mt-1 text-sm text-red-600">{{ errors.supervisor_id }}</p>
                </div>
              </div>
            </div>

            <!-- Encontro e local -->
            <div class="px-4 py-4 pb-5 sm:px-6">
              <p class="mb-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Encontro e local
              </p>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label for="diaSemana" class="block text-sm font-medium text-gray-700">
                    Dia da semana <span class="text-red-500">*</span>
                  </label>
                  <select
                    id="diaSemana"
                    v-model="formData.diaSemana"
                    required
                    :class="selectClass('diaSemana')"
                    @blur="validateField('diaSemana', formData.diaSemana)"
                  >
                    <option value="" disabled>Selecione um dia</option>
                    <option v-for="dia in diasSemana" :key="dia" :value="dia">{{ dia }}</option>
                  </select>
                  <p v-if="errors.diaSemana" class="mt-1 text-sm text-red-600">{{ errors.diaSemana }}</p>
                </div>
                <div>
                  <label for="horario" class="block text-sm font-medium text-gray-700">
                    Horário <span class="text-red-500">*</span>
                  </label>
                  <input
                    id="horario"
                    v-model="formData.horario"
                    type="time"
                    required
                    :class="fieldClass('horario')"
                    @blur="validateField('horario', formData.horario)"
                  />
                  <p v-if="errors.horario" class="mt-1 text-sm text-red-600">{{ errors.horario }}</p>
                </div>
                <div class="sm:col-span-2">
                  <label for="endereco" class="block text-sm font-medium text-gray-700">
                    Endereço completo <span class="text-red-500">*</span>
                  </label>
                  <textarea
                    id="endereco"
                    v-model="formData.endereco"
                    rows="2"
                    required
                    placeholder="Rua, número, bairro, cidade"
                    :class="fieldClass('endereco')"
                    @blur="validateField('endereco', formData.endereco)"
                  />
                  <p v-if="errors.endereco" class="mt-1 text-sm text-red-600">{{ errors.endereco }}</p>
                </div>
              </div>
            </div>
            </div>

            <!-- Coluna direita: membros (igual ao modo editar) -->
            <CellMembersPanel
              v-if="cellId"
              :key="cellId"
              :celula-id="cellId"
              :lider-nome="resolvedLiderNome"
              :lider-id="resolvedLiderId"
            />
            <div
              v-else
              class="flex min-h-0 flex-1 flex-col border-t border-gray-200 lg:min-h-[28rem] lg:border-t-0 lg:border-l lg:border-gray-200 bg-gray-50/40"
            >
              <div class="shrink-0 border-b border-gray-100 bg-white px-4 py-3 sm:px-5">
                <h4 class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Membros da célula
                </h4>
              </div>
              <div class="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center text-sm text-gray-500">
                <p>Salve os dados da célula para cadastrar membros.</p>
                <p v-if="resolvedLiderNome" class="text-gray-600">
                  Líder: <span class="font-medium text-gray-800">{{ resolvedLiderNome }}</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Rodapé fixo -->
          <div
            class="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-200 bg-white px-4 py-3 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-4"
          >
            <button
              type="button"
              :disabled="props.isLoading"
              class="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 sm:w-auto"
              @click="emit('close')"
            >
              {{ isEditMode ? 'Concluir' : 'Cancelar' }}
            </button>
            <button
              type="submit"
              :disabled="props.isLoading"
              class="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-transparent bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 sm:w-auto"
            >
              <svg
                v-if="props.isLoading"
                class="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {{ props.isLoading ? 'Salvando…' : isEditMode ? 'Salvar alterações' : 'Salvar célula' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
