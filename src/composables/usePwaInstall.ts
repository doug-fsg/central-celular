import { computed, onMounted, onUnmounted, ref } from 'vue'
import { isNativeApp } from '../utils/platform'
import { isInstalledPwaDisplayMode, isIosSafari } from '../utils/pwa'

export const INSTALL_DISMISS_KEY = 'aprisco_install_prompt_dismissed_until'
export const INSTALL_DISMISS_MS = 7 * 24 * 60 * 60 * 1000

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function isInstallPromptDismissed(
  now = Date.now(),
  storage: Pick<Storage, 'getItem'> | null = typeof localStorage !== 'undefined' ? localStorage : null,
): boolean {
  if (!storage) return false
  const until = Number(storage.getItem(INSTALL_DISMISS_KEY) || 0)
  return Number.isFinite(until) && until > now
}

export function persistInstallPromptDismiss(
  now = Date.now(),
  storage: Pick<Storage, 'setItem'> | null = typeof localStorage !== 'undefined' ? localStorage : null,
): void {
  if (!storage) return
  storage.setItem(INSTALL_DISMISS_KEY, String(now + INSTALL_DISMISS_MS))
}

export function shouldShowInstallBanner(opts: {
  native: boolean
  installed: boolean
  dismissed: boolean
  canPrompt: boolean
  iosSafari: boolean
}): boolean {
  if (opts.native || opts.installed || opts.dismissed) return false
  return opts.canPrompt || opts.iosSafari
}

export function usePwaInstall() {
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const dismissed = ref(isInstallPromptDismissed())
  const iosSafari = ref(false)

  const canPrompt = computed(() => deferredPrompt.value !== null)

  const visible = computed(() =>
    shouldShowInstallBanner({
      native: isNativeApp(),
      installed: isInstalledPwaDisplayMode(),
      dismissed: dismissed.value,
      canPrompt: canPrompt.value,
      iosSafari: iosSafari.value,
    }),
  )

  function onBeforeInstallPrompt(event: Event) {
    event.preventDefault()
    deferredPrompt.value = event as BeforeInstallPromptEvent
  }

  function onAppInstalled() {
    deferredPrompt.value = null
    dismissed.value = true
  }

  async function install(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    const promptEvent = deferredPrompt.value
    if (!promptEvent) return 'unavailable'
    deferredPrompt.value = null
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') {
      dismissed.value = true
    }
    return outcome
  }

  function dismiss() {
    persistInstallPromptDismiss()
    dismissed.value = true
    deferredPrompt.value = null
  }

  onMounted(() => {
    iosSafari.value = isIosSafari()
    dismissed.value = isInstallPromptDismissed()
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
  })

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.removeEventListener('appinstalled', onAppInstalled)
  })

  return { visible, canPrompt, iosSafari, install, dismiss }
}
