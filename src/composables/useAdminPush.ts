import { computed, onMounted, ref, shallowRef } from 'vue'
import { useDebouncedWatch } from './useDebouncedWatch'
import {
  adminService,
  type PushSendPayload,
  type PushSendResult,
  type PushSubscriber,
} from '../services/adminService'

function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: string }).message
    if (message) return message
  }
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function useAdminPush() {
  const subscribers = ref<PushSubscriber[]>([])
  const loading = shallowRef(false)
  const sending = shallowRef(false)
  const search = shallowRef('')
  const error = shallowRef('')
  const lastResult = ref<PushSendResult | null>(null)
  const pagination = ref({ page: 1, perPage: 50, total: 0 })

  const isFiltering = computed(() => search.value.trim() !== '')
  const totalLabel = computed(() => {
    const total = pagination.value.total
    if (total === 1) return '1 usuário com notificações ativas'
    return `${total} usuários com notificações ativas`
  })

  async function load(page = 1) {
    loading.value = true
    error.value = ''
    try {
      const result = await adminService.listarInscritosPush(
        search.value,
        page,
        pagination.value.perPage,
      )
      subscribers.value = result.subscribers
      pagination.value = result.pagination
    } catch (err) {
      error.value = errorMessage(err, 'Não foi possível carregar os inscritos')
      subscribers.value = []
    } finally {
      loading.value = false
    }
  }

  async function sendToUser(userId: number, payload: PushSendPayload): Promise<PushSendResult> {
    sending.value = true
    lastResult.value = null
    error.value = ''
    try {
      const result = await adminService.enviarPushUsuario(userId, payload)
      lastResult.value = result
      void load(pagination.value.page)
      return result
    } catch (err) {
      const message = errorMessage(err, 'Não foi possível enviar a notificação')
      error.value = message
      throw err
    } finally {
      sending.value = false
    }
  }

  async function sendToAll(payload: PushSendPayload): Promise<PushSendResult> {
    sending.value = true
    lastResult.value = null
    error.value = ''
    try {
      const result = await adminService.enviarPushTodos(payload)
      lastResult.value = result
      void load(1)
      return result
    } catch (err) {
      const message = errorMessage(err, 'Não foi possível enviar para todos')
      error.value = message
      throw err
    } finally {
      sending.value = false
    }
  }

  useDebouncedWatch(
    () => search.value,
    () => {
      void load(1)
    },
  )

  onMounted(() => {
    void load(1)
  })

  return {
    subscribers,
    loading,
    sending,
    search,
    error,
    lastResult,
    pagination,
    isFiltering,
    totalLabel,
    load,
    sendToUser,
    sendToAll,
  }
}
