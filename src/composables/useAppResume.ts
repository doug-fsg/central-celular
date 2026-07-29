import { onMounted, onUnmounted } from 'vue'

type ResumeCallback = () => void

const listeners = new Set<ResumeCallback>()
let initialized = false

async function ensureInitialized(): Promise<void> {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  const notify = () => {
    for (const cb of listeners) {
      try {
        cb()
      } catch (error) {
        console.warn('[app-resume] listener error:', error)
      }
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') notify()
  })

  try {
    const { Capacitor } = await import('@capacitor/core')
    if (Capacitor.isNativePlatform()) {
      const { App } = await import('@capacitor/app')
      await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) notify()
      })
    }
  } catch {
    // PWA already covered by visibilitychange
  }
}

/** Dispara callback quando app volta ao foreground (PWA ou Capacitor). */
export function useAppResume(callback: ResumeCallback): void {
  onMounted(() => {
    listeners.add(callback)
    void ensureInitialized()
  })

  onUnmounted(() => {
    listeners.delete(callback)
  })
}
