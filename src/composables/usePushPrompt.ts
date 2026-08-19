import { ref, computed } from 'vue'
import { canRequestWebPush } from './usePushNotifications'
import { isNativeApp, getPlatform } from '../utils/platform'
import { isIosDevice, isInstalledPwaDisplayMode } from '../utils/pwa'

const STORAGE_KEY = 'push-prompt-dismissed-at'
const DISMISS_DAYS = 7

function wasDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const dismissedAt = Number(raw)
    const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24)
    return daysSince < DISMISS_DAYS
  } catch {
    return false
  }
}

function pushAlreadyGranted(): boolean {
  if (isNativeApp()) return false
  if (typeof Notification === 'undefined') return false
  return Notification.permission === 'granted'
}

function pushDenied(): boolean {
  if (isNativeApp()) return false
  if (typeof Notification === 'undefined') return false
  return Notification.permission === 'denied'
}

export type PushPromptScenario = 'web' | 'ios-install' | 'android-native' | 'none'

function detectScenario(): PushPromptScenario {
  if (isNativeApp()) {
    return getPlatform() === 'android' ? 'android-native' : 'none'
  }
  if (isIosDevice() && !isInstalledPwaDisplayMode()) {
    return 'ios-install'
  }
  if (canRequestWebPush()) {
    return 'web'
  }
  return 'none'
}

export function usePushPrompt() {
  const dismissed = ref(false)

  const scenario = computed<PushPromptScenario>(() => detectScenario())

  const visible = computed(() => {
    if (dismissed.value) return false
    if (pushAlreadyGranted()) return false
    if (pushDenied()) return false
    if (wasDismissedRecently()) return false
    return scenario.value !== 'none'
  })

  function dismiss() {
    dismissed.value = true
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()))
    } catch { /* ignore */ }
  }

  return { visible, scenario, dismiss }
}
