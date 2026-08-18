import { computed, ref } from 'vue'
import api from '../services/api'
import { getPlatform, isNativeApp } from '../utils/platform'
import { isInstalledPwaDisplayMode, isIosDevice } from '../utils/pwa'

export type PushPermissionStatus =
  | 'unsupported'
  | 'denied'
  | 'granted'
  | 'prompt'
  | 'ios-browser'

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function canRequestWebPush(): boolean {
  if (typeof window === 'undefined') return false
  if (isNativeApp()) return false
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return false
  }
  // iOS Safari: Web Push só funciona no PWA instalado (standalone)
  if (isIosDevice() && !isInstalledPwaDisplayMode()) return false
  return true
}

async function registerWebPush(): Promise<void> {
  const registration = await navigator.serviceWorker.ready
  const res = await api.get('/devices/vapid-public-key')
  const publicKey = res.data?.publicKey ?? res.publicKey
  if (!publicKey) {
    throw new Error('Notificações push não configuradas no servidor')
  }

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    })
  }

  const token = JSON.stringify(subscription.toJSON())
  await api.post('/devices/register', {
    platform: 'web',
    token,
  })
}

let androidListenersBound = false

async function registerAndroidPush(): Promise<void> {
  const { PushNotifications } = await import('@capacitor/push-notifications')

  let permStatus = await PushNotifications.checkPermissions()
  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions()
  }
  if (permStatus.receive !== 'granted') {
    console.warn('[push] permissão Android não concedida')
    return
  }

  if (!androidListenersBound) {
    androidListenersBound = true
    await PushNotifications.addListener('registration', (token) => {
      void api
        .post('/devices/register', {
          platform: 'android',
          token: token.value,
        })
        .catch((error) => {
          console.warn('[push] falha ao registrar token Android:', error)
        })
    })

    await PushNotifications.addListener('registrationError', (error) => {
      console.warn('[push] registro nativo Android falhou (Firebase pode estar ausente):', error)
    })
  }

  await PushNotifications.register()
}

export async function registerPushIfEligible(): Promise<void> {
  try {
    if (isNativeApp()) {
      if (getPlatform() !== 'android') return
      await registerAndroidPush()
      return
    }

    if (!canRequestWebPush()) return
    if (Notification.permission === 'denied') return
    if (Notification.permission !== 'granted') return

    await registerWebPush()
  } catch (error) {
    console.warn('[push] registro automático ignorado:', error)
  }
}

export function usePushNotifications() {
  const permissionStatus = ref<PushPermissionStatus>('unsupported')
  const registering = ref(false)
  const testing = ref(false)
  const errorMessage = ref('')
  const lastTestMessage = ref('')

  const isSupported = computed(
    () => permissionStatus.value !== 'unsupported' && permissionStatus.value !== 'ios-browser',
  )

  function refreshPermission(): void {
    if (isNativeApp()) {
      permissionStatus.value = getPlatform() === 'android' ? 'prompt' : 'unsupported'
      return
    }
    if (isIosDevice() && !isInstalledPwaDisplayMode()) {
      permissionStatus.value = 'ios-browser'
      return
    }
    if (
      typeof Notification === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      permissionStatus.value = 'unsupported'
      return
    }
    const permission = Notification.permission
    permissionStatus.value = permission === 'default' ? 'prompt' : permission
  }

  async function enablePush(): Promise<boolean> {
    registering.value = true
    errorMessage.value = ''
    lastTestMessage.value = ''
    try {
      if (isNativeApp()) {
        if (getPlatform() !== 'android') {
          errorMessage.value = 'Notificações nativas do iOS não estão disponíveis nesta versão'
          return false
        }
        await registerAndroidPush()
        refreshPermission()
        return true
      }

      if (isIosDevice() && !isInstalledPwaDisplayMode()) {
        errorMessage.value =
          'No iPhone/iPad, instale o Aprisco na tela inicial para ativar as notificações'
        permissionStatus.value = 'ios-browser'
        return false
      }

      if (!canRequestWebPush()) {
        errorMessage.value = 'Este navegador não suporta notificações push'
        permissionStatus.value = 'unsupported'
        return false
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        permissionStatus.value = permission === 'denied' ? 'denied' : 'prompt'
        errorMessage.value = 'Permissão de notificação não concedida'
        return false
      }

      await registerWebPush()
      refreshPermission()
      return true
    } catch (error: unknown) {
      const fallback = 'Não foi possível ativar as notificações'
      errorMessage.value =
        typeof error === 'object' && error && 'message' in error
          ? String((error as { message?: string }).message || fallback)
          : fallback
      return false
    } finally {
      registering.value = false
    }
  }

  async function sendTestPush(): Promise<boolean> {
    testing.value = true
    errorMessage.value = ''
    lastTestMessage.value = ''
    try {
      const res = await api.post('/devices/test-push', {})
      lastTestMessage.value =
        res.data?.message || res.message || 'Notificação de teste enviada'
      return true
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao enviar notificação de teste'
      errorMessage.value = typeof error === 'object' && error && 'message' in error
        ? String((error as { message?: string }).message || message)
        : message
      return false
    } finally {
      testing.value = false
    }
  }

  return {
    permissionStatus,
    registering,
    testing,
    errorMessage,
    lastTestMessage,
    isSupported,
    refreshPermission,
    enablePush,
    sendTestPush,
  }
}
