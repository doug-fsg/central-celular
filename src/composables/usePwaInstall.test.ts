import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  INSTALL_DISMISS_KEY,
  INSTALL_DISMISS_MS,
  isInstallPromptDismissed,
  persistInstallPromptDismiss,
  shouldShowInstallBanner,
} from './usePwaInstall'

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial))
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key)
    },
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
  }
}

describe('usePwaInstall helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('hides the banner on native, installed PWA, or dismissed', () => {
    expect(
      shouldShowInstallBanner({
        native: true,
        installed: false,
        dismissed: false,
        canPrompt: true,
        iosSafari: false,
      }),
    ).toBe(false)

    expect(
      shouldShowInstallBanner({
        native: false,
        installed: true,
        dismissed: false,
        canPrompt: true,
        iosSafari: true,
      }),
    ).toBe(false)

    expect(
      shouldShowInstallBanner({
        native: false,
        installed: false,
        dismissed: true,
        canPrompt: true,
        iosSafari: true,
      }),
    ).toBe(false)
  })

  it('shows the banner for Android deferred prompt or iOS Safari', () => {
    expect(
      shouldShowInstallBanner({
        native: false,
        installed: false,
        dismissed: false,
        canPrompt: true,
        iosSafari: false,
      }),
    ).toBe(true)

    expect(
      shouldShowInstallBanner({
        native: false,
        installed: false,
        dismissed: false,
        canPrompt: false,
        iosSafari: true,
      }),
    ).toBe(true)
  })

  it('persists dismiss for 7 days', () => {
    const storage = memoryStorage()
    const now = 1_700_000_000_000
    persistInstallPromptDismiss(now, storage)
    expect(storage.getItem(INSTALL_DISMISS_KEY)).toBe(String(now + INSTALL_DISMISS_MS))
    expect(isInstallPromptDismissed(now + 1000, storage)).toBe(true)
    expect(isInstallPromptDismissed(now + INSTALL_DISMISS_MS + 1, storage)).toBe(false)
  })
})
