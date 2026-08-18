<script setup lang="ts">
import { computed, reactive, shallowRef, watch } from 'vue'
import type { PushSendPayload, PushSendResult, PushSubscriber } from '../../../services/adminService'

const props = defineProps<{
  open: boolean
  mode: 'user' | 'all'
  subscriber: PushSubscriber | null
  sending: boolean
  result: PushSendResult | null
  submitError?: string
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: PushSendPayload]
}>()

const TITLE_MAX = 80
const BODY_MAX = 240

const form = reactive({
  title: '',
  body: '',
  url: '',
})
const confirmAll = shallowRef(false)
const localError = shallowRef('')

const titleId = computed(() =>
  props.mode === 'all' ? 'admin-push-send-all-title' : 'admin-push-send-user-title',
)

const heading = computed(() =>
  props.mode === 'all' ? 'Enviar para todos' : 'Enviar notificação',
)

const targetLabel = computed(() => {
  if (props.mode === 'all') {
    return 'Todos os usuários com notificações ativas nesta igreja'
  }
  return props.subscriber?.nome ?? 'este usuário'
})

const canSubmit = computed(() => {
  if (props.sending) return false
  if (!form.title.trim() || !form.body.trim()) return false
  if (props.mode === 'all' && !confirmAll.value) return false
  return true
})

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    form.title = ''
    form.body = ''
    form.url = ''
    confirmAll.value = false
    localError.value = ''
  },
)

function close() {
  if (props.sending) return
  emit('close')
}

function submit() {
  localError.value = ''
  const title = form.title.trim()
  const body = form.body.trim()
  const url = form.url.trim()

  if (!title || !body) {
    localError.value = 'Preencha título e mensagem'
    return
  }
  if (props.mode === 'all' && !confirmAll.value) {
    localError.value = 'Confirme o envio para todos'
    return
  }

  emit('submit', {
    title,
    body,
    ...(url ? { url } : {}),
  })
}

function resultTone(result: PushSendResult): 'success' | 'warning' | 'error' {
  if (result.sent > 0 && result.failed === 0) return 'success'
  if (result.sent > 0) return 'warning'
  return 'error'
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[110] flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @click.self="close"
    >
      <div class="w-full max-w-md overflow-hidden rounded-xl border border-neutral-100 bg-white px-4 pb-4 pt-5 shadow-xl sm:p-6">
        <h3 :id="titleId" class="mb-1 text-lg font-semibold text-neutral-900">
          {{ heading }}
        </h3>
        <p class="mb-4 text-sm text-neutral-600">
          Destino: <span class="font-medium text-neutral-800">{{ targetLabel }}</span>
        </p>

        <div v-if="result" class="space-y-3">
          <div
            class="rounded-lg border px-3 py-3 text-sm"
            :class="{
              'border-emerald-200 bg-emerald-50 text-emerald-900': resultTone(result) === 'success',
              'border-amber-200 bg-amber-50 text-amber-900': resultTone(result) === 'warning',
              'border-red-200 bg-red-50 text-red-900': resultTone(result) === 'error',
            }"
          >
            <p class="font-medium">{{ result.message || 'Envio concluído' }}</p>
            <p class="mt-1 text-xs">
              Enviados: {{ result.sent }} · Falhas: {{ result.failed }} · Não enviados: {{ result.skipped }}
            </p>
            <p v-if="result.usersTargeted != null" class="mt-1 text-xs">
              Usuários: {{ result.usersWithSend ?? 0 }} de {{ result.usersTargeted }}
            </p>
          </div>
          <button
            type="button"
            class="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white touch-manipulation hover:bg-primary-700"
            @click="close"
          >
            Fechar
          </button>
        </div>

        <form v-else class="space-y-3" @submit.prevent="submit">
          <label class="block">
            <span class="mb-1 block text-sm font-medium text-neutral-700">Título</span>
            <input
              v-model="form.title"
              type="text"
              maxlength="80"
              required
              class="h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
            <span class="mt-1 block text-right text-[11px] text-neutral-400">{{ form.title.length }}/{{ TITLE_MAX }}</span>
          </label>

          <label class="block">
            <span class="mb-1 block text-sm font-medium text-neutral-700">Mensagem</span>
            <textarea
              v-model="form.body"
              rows="4"
              maxlength="240"
              required
              class="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <span class="mt-1 block text-right text-[11px] text-neutral-400">{{ form.body.length }}/{{ BODY_MAX }}</span>
          </label>

          <label class="block">
            <span class="mb-1 block text-sm font-medium text-neutral-700">Link (opcional)</span>
            <input
              v-model="form.url"
              type="text"
              maxlength="500"
              placeholder="/dashboard"
              class="h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
            <span class="mt-1 block text-xs text-neutral-500">Caminho do app, como /dashboard, ou URL https.</span>
          </label>

          <label v-if="mode === 'all'" class="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <input
              v-model="confirmAll"
              type="checkbox"
              class="mt-1"
            >
            <span>Sim, enviar para todos com notificações ativas nesta igreja.</span>
          </label>

          <p v-if="localError || submitError" class="text-sm text-red-700">{{ localError || submitError }}</p>

          <div class="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              class="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-neutral-300 px-4 text-sm font-medium text-neutral-700 touch-manipulation hover:bg-neutral-50"
              :disabled="sending"
              @click="close"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white touch-manipulation hover:bg-primary-700 disabled:opacity-50"
              :disabled="!canSubmit"
            >
              {{ sending ? 'Enviando…' : mode === 'all' ? 'Enviar para todos' : 'Enviar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
