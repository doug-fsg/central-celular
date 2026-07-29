import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
  },
}))

vi.mock('./pwa', () => ({
  isInstalledPwaDisplayMode: vi.fn(() => false),
}))

import { Capacitor } from '@capacitor/core'
import { isInstalledPwaDisplayMode } from './pwa'
import {
  getPlatform,
  isIos,
  isMobileShell,
  isNativeApp,
  markMobileShellClass,
} from './platform'

describe('platform utils', () => {
  beforeEach(() => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web')
    vi.mocked(isInstalledPwaDisplayMode).mockReturnValue(false)
    document.documentElement.classList.remove('is-mobile-shell', 'is-native-shell')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('isNativeApp reflects Capacitor platform', () => {
    expect(isNativeApp()).toBe(false)
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    expect(isNativeApp()).toBe(true)
  })

  it('getPlatform returns ios/android when native', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android')
    expect(getPlatform()).toBe('android')

    vi.mocked(Capacitor.getPlatform).mockReturnValue('ios')
    expect(getPlatform()).toBe('ios')
  })

  it('isMobileShell is true for native or installed PWA', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    expect(isMobileShell()).toBe(true)

    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
    vi.mocked(isInstalledPwaDisplayMode).mockReturnValue(true)
    expect(isMobileShell()).toBe(true)
  })

  it('isIos checks Capacitor platform', () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('ios')
    expect(isIos()).toBe(true)
  })

  it('markMobileShellClass adds DOM classes when shell active', () => {
    vi.mocked(isInstalledPwaDisplayMode).mockReturnValue(true)
    markMobileShellClass()
    expect(document.documentElement.classList.contains('is-mobile-shell')).toBe(true)

    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    markMobileShellClass()
    expect(document.documentElement.classList.contains('is-native-shell')).toBe(true)
  })
})
