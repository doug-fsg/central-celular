<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue'
import { useUserStore } from '../stores/userStore'
import api from '../services/api'

const userStore = useUserStore()

const dataNascimento = ref('')
const loading = ref(false)
const checking = ref(false)
const confirmedMissing = ref(false)
const error = ref('')

function hasBirthdate(value: string | Date | null | undefined): boolean {
  if (!value) return false
  const s = String(value).trim()
  return s.length > 0 && !s.startsWith('0000')
}

const needsBirthdate = computed(() => {
  if (!userStore.isLoggedIn || !userStore.user) return false
  return !hasBirthdate(userStore.user.dataNascimento)
})

const open = computed(() => needsBirthdate.value && confirmedMissing.value && !checking.value)

async function syncFromServer() {
  if (!needsBirthdate.value || !userStore.user) {
    confirmedMissing.value = false
    return
  }

  checking.value = true
  try {
    const perfil = await api.get('/usuarios/me') as { dataNascimento?: string | null }
    if (hasBirthdate(perfil.dataNascimento)) {
      userStore.updateProfile({ dataNascimento: perfil.dataNascimento })
      confirmedMissing.value = false
    } else {
      confirmedMissing.value = true
    }
  } catch {
    confirmedMissing.value = true
  } finally {
    checking.value = false
  }
}

watch(
  () => [userStore.user?.id, userStore.user?.dataNascimento] as const,
  () => {
    void syncFromServer()
  },
  { immediate: true },
)

const formatDateInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function onDateInput(event: Event) {
  const input = event.target as HTMLInputElement
  dataNascimento.value = formatDateInput(input.value)
  error.value = ''
}

function toIsoDate(value: string): string | null {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const [, dia, mes, ano] = match
  const diaNum = Number(dia)
  const mesNum = Number(mes)
  const anoNum = Number(ano)
  const date = new Date(anoNum, mesNum - 1, diaNum)
  const hoje = new Date()
  hoje.setHours(23, 59, 59, 999)
  if (
    date.getDate() !== diaNum ||
    date.getMonth() !== mesNum - 1 ||
    date.getFullYear() !== anoNum
  ) {
    return null
  }
  if (anoNum < 1900 || date > hoje) return null
  return `${ano}-${mes}-${dia}`
}

async function confirmar() {
  error.value = ''
  const iso = toIsoDate(dataNascimento.value)
  if (!iso) {
    error.value = 'Informe uma data válida no formato DD/MM/AAAA.'
    return
  }

  loading.value = true
  try {
    const resultado = await api.patch('/usuarios/me', { dataNascimento: iso }) as {
      dataNascimento?: string | null
    }
    userStore.updateProfile({
      dataNascimento: resultado.dataNascimento ?? iso,
    })
    confirmedMissing.value = false
    dataNascimento.value = ''
  } catch (err: unknown) {
    error.value =
      err instanceof Error ? err.message : 'Não foi possível salvar. Tente novamente.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <TransitionRoot appear :show="open" as="template">
    <Dialog as="div" class="relative z-[70]" @close="() => {}">
      <TransitionChild
        as="template"
        enter="duration-200 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-150 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/30" aria-hidden="true" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 sm:items-center">
          <TransitionChild
            as="template"
            enter="duration-200 ease-out"
            enter-from="opacity-0 translate-y-4 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="duration-150 ease-in"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:scale-95"
          >
            <DialogPanel class="modal-dialog-panel w-full max-w-md p-6">
              <DialogTitle class="text-lg font-semibold text-neutral-900">
                Só falta a sua data de nascimento
              </DialogTitle>
              <p class="mt-2 text-sm text-neutral-600">
                Usamos essa informação para lembrar do seu aniversário e cuidar melhor de você.
                Leva só um instante.
              </p>

              <form class="mt-5 space-y-4" @submit.prevent="confirmar">
                <div>
                  <label for="birthdate-prompt" class="block text-sm font-medium text-neutral-700 mb-1">
                    Data de nascimento
                  </label>
                  <input
                    id="birthdate-prompt"
                    :value="dataNascimento"
                    type="text"
                    inputmode="numeric"
                    placeholder="DD/MM/AAAA"
                    maxlength="10"
                    autocomplete="bday"
                    required
                    class="w-full rounded-xl border border-neutral-200 px-4 py-3 text-base focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                    :disabled="loading"
                    @input="onDateInput"
                  />
                </div>

                <p v-if="error" class="text-sm text-rose-600">{{ error }}</p>

                <button
                  type="submit"
                  class="w-full rounded-xl bg-primary-600 py-3.5 text-base font-semibold text-white shadow-sm transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="loading"
                >
                  <span
                    v-if="loading"
                    class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white align-middle"
                  />
                  Confirmar
                </button>
              </form>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
