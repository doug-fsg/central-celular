/** App adicionado à tela inicial (atalho) — Android / iOS. */
export function isInstalledPwaDisplayMode(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      // iOS Safari antigo
      (typeof navigator !== 'undefined' && (navigator as Navigator & { standalone?: boolean }).standalone === true)
    )
  } catch {
    return false
  }
}

export function isIosDevice(userAgent?: string, platform?: string, maxTouchPoints?: number): boolean {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '')
  const plat = platform ?? (typeof navigator !== 'undefined' ? navigator.platform : '')
  const touches = maxTouchPoints ?? (typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0)
  return /iPad|iPhone|iPod/i.test(ua) || (plat === 'MacIntel' && touches > 1)
}

/** Safari no iOS/iPadOS (não Chrome/Firefox/Edge iOS). */
export function isIosSafari(userAgent?: string, platform?: string, maxTouchPoints?: number): boolean {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '')
  if (!isIosDevice(ua, platform, maxTouchPoints)) return false
  const isWebkit = /Safari/i.test(ua)
  const isOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Firefox|Edg/i.test(ua)
  return isWebkit && !isOtherBrowser
}
