async function vibrateNative(pattern: number | number[]): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core')
    if (!Capacitor.isNativePlatform()) return false

    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics')

    if (Array.isArray(pattern)) {
      if (pattern.length >= 3) {
        await Haptics.notification({ type: NotificationType.Success })
      } else {
        await Haptics.notification({ type: NotificationType.Error })
      }
      return true
    }

    await Haptics.impact({ style: ImpactStyle.Light })
    return true
  } catch {
    return false
  }
}

const webSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator

export function useHaptic() {
  async function vibrate(pattern: number | number[] = 10) {
    const handled = await vibrateNative(pattern)
    if (handled) return
    if (webSupported) navigator.vibrate(pattern)
  }

  function success() {
    void vibrate([10, 30, 10])
  }

  function error() {
    void vibrate([50, 20, 50])
  }

  function tap() {
    void vibrate(8)
  }

  function selection() {
    void vibrate(4)
  }

  return { vibrate, success, error, tap, selection }
}
