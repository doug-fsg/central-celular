<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import AdminListFilterBar from '../../components/admin/AdminListFilterBar.vue'
import AdminPushSendModal from '../../components/admin/push/AdminPushSendModal.vue'
import AdminPushSubscriberList from '../../components/admin/push/AdminPushSubscriberList.vue'
import SkeletonList from '../../components/SkeletonList.vue'
import { useAdminPush } from '../../composables/useAdminPush'
import type { AdminFilterChip } from '../../constants/adminFilters'
import type { PushSendPayload, PushSubscriber } from '../../services/adminService'

const {
  subscribers,
  loading,
  sending,
  search,
  error,
  lastResult,
  isFiltering,
  totalLabel,
  sendToUser,
  sendToAll,
} = useAdminPush()

const modalOpen = shallowRef(false)
const modalMode = shallowRef<'user' | 'all'>('user')
const selectedSubscriber = shallowRef<PushSubscriber | null>(null)

const filterChips = computed((): AdminFilterChip[] => {
  const term = search.value.trim()
  return term ? [{ key: 'search', label: term }] : []
})

function clearFilters() {
  search.value = ''
}

function removeFilterChip(key: string) {
  if (key === 'search') search.value = ''
}

function openSendUser(subscriber: PushSubscriber) {
  modalMode.value = 'user'
  selectedSubscriber.value = subscriber
  lastResult.value = null
  error.value = ''
  modalOpen.value = true
}

function openSendAll() {
  modalMode.value = 'all'
  selectedSubscriber.value = null
  lastResult.value = null
  error.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  selectedSubscriber.value = null
}

async function handleSubmit(payload: PushSendPayload) {
  try {
    if (modalMode.value === 'all') {
      await sendToAll(payload)
      return
    }
    if (!selectedSubscriber.value) return
    await sendToUser(selectedSubscriber.value.userId, payload)
  } catch {
    /* mensagem já tratada no composable */
  }
}
</script>

<template>
  <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-xl font-bold text-neutral-800 sm:text-2xl">Notificações</h1>
        <p class="mt-1 text-xs text-neutral-500 sm:text-sm">
          Usuários com notificações ativas nesta igreja. Isso não indica se o aplicativo está instalado na tela inicial.
        </p>
        <p class="mt-1 text-xs font-medium text-neutral-600">{{ totalLabel }}</p>
      </div>
      <button
        type="button"
        class="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm touch-manipulation hover:bg-primary-700 disabled:opacity-50"
        :disabled="subscribers.length === 0"
        @click="openSendAll"
      >
        Enviar para todos
      </button>
    </div>

    <AdminListFilterBar
      v-model="search"
      section-label="Filtros da lista de notificações"
      input-id="push-subscriber-search"
      placeholder="Buscar por nome…"
      :loading="loading && isFiltering"
      :chips="filterChips"
      @remove-chip="removeFilterChip"
      @clear-all="clearFilters"
    />

    <p v-if="error && !modalOpen" class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {{ error }}
    </p>

    <SkeletonList v-if="loading" :rows="6" class="mt-4" />

    <div
      v-else-if="subscribers.length === 0"
      class="overflow-hidden rounded-xl border border-gray-100 bg-white p-8 shadow-sm sm:p-12"
    >
      <div class="text-center">
        <h3 class="mb-2 text-base font-semibold text-gray-900 sm:text-lg">
          {{ isFiltering ? 'Nenhum inscrito encontrado' : 'Ninguém com notificações ativas' }}
        </h3>
        <p class="mx-auto max-w-sm text-sm text-gray-500 sm:text-base">
          {{ isFiltering
            ? `Não encontramos usuários com notificações ativas para “${search}”.`
            : 'Quando alguém ativar notificações no aplicativo, o nome aparece aqui para envio individual.' }}
        </p>
      </div>
    </div>

    <AdminPushSubscriberList
      v-else
      :subscribers="subscribers"
      @send="openSendUser"
    />

    <AdminPushSendModal
      :open="modalOpen"
      :mode="modalMode"
      :subscriber="selectedSubscriber"
      :sending="sending"
      :result="lastResult"
      :submit-error="error"
      @close="closeModal"
      @submit="handleSubmit"
    />
  </main>
</template>
