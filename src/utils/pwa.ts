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
