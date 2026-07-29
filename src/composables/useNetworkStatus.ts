import { onMounted, onUnmounted, ref } from 'vue'

export function useNetworkStatus() {
  const isOnline = ref(true)
  let networkListener: { remove: () => void } | null = null

  const syncFromNavigator = () => {
    if (typeof navigator !== 'undefined') {
      isOnline.value = navigator.onLine
    }
  }

  onMounted(() => {
    syncFromNavigator()
    window.addEventListener('online', syncFromNavigator)
    window.addEventListener('offline', syncFromNavigator)

    void (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core')
        if (!Capacitor.isNativePlatform()) return

        const { Network } = await import('@capacitor/network')
        const status = await Network.getStatus()
        isOnline.value = status.connected
        networkListener = await Network.addListener('networkStatusChange', (s) => {
          isOnline.value = s.connected
        })
      } catch {
        // Web/PWA: navigator events are enough
      }
    })()
  })

  onUnmounted(() => {
    window.removeEventListener('online', syncFromNavigator)
    window.removeEventListener('offline', syncFromNavigator)
    networkListener?.remove()
  })

  return { isOnline }
}
