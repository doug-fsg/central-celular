import { Capacitor } from '@capacitor/core'

let backListenerRegistered = false

export async function initNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  document.documentElement.classList.add('is-native-shell', 'is-mobile-shell')

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Light })
    await StatusBar.setBackgroundColor({ color: '#7928fa' })
  } catch (error) {
    console.warn('[native] StatusBar não disponível:', error)
  }

  try {
    const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard')
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body })
    await Keyboard.setScroll({ isDisabled: false })
  } catch (error) {
    console.warn('[native] Keyboard plugin não disponível:', error)
  }

  if (!backListenerRegistered) {
    backListenerRegistered = true
    const { App } = await import('@capacitor/app')
    await App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back()
      } else {
        void App.exitApp()
      }
    })

    await App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        document.documentElement.classList.remove('app-backgrounded')
      } else {
        document.documentElement.classList.add('app-backgrounded')
      }
    })
  }
}

export async function hideNativeSplash(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide({ fadeOutDuration: 300 })
  } catch (error) {
    console.warn('[native] SplashScreen hide falhou:', error)
  }
}
