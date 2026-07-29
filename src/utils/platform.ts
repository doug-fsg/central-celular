import { Capacitor } from '@capacitor/core'
import { isInstalledPwaDisplayMode } from './pwa'

export type AppPlatform = 'web' | 'ios' | 'android'

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

export function getPlatform(): AppPlatform {
  if (!isNativeApp()) return 'web'
  const p = Capacitor.getPlatform()
  if (p === 'ios' || p === 'android') return p
  return 'web'
}

/** PWA instalado ou app Capacitor — layout mobile com bottom nav e safe areas. */
export function isMobileShell(): boolean {
  return isNativeApp() || isInstalledPwaDisplayMode()
}

export function isIos(): boolean {
  return Capacitor.getPlatform() === 'ios'
}

export function markMobileShellClass(): void {
  if (typeof document === 'undefined') return
  if (isMobileShell()) {
    document.documentElement.classList.add('is-mobile-shell')
  }
  if (isNativeApp()) {
    document.documentElement.classList.add('is-native-shell')
  }
}
