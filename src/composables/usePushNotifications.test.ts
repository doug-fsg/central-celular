import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../utils/platform', () => ({
  isNativeApp: vi.fn(() => false),
  getPlatform: vi.fn(() => 'web'),
}))

vi.mock('../utils/pwa', () => ({
  isInstalledPwaDisplayMode: vi.fn(() => false),
  isIosDevice: vi.fn(() => false),
}))

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import { isNativeApp } from '../utils/platform'
import { isInstalledPwaDisplayMode, isIosDevice } from '../utils/pwa'
import { canRequestWebPush, urlBase64ToUint8Array } from './usePushNotifications'

describe('usePushNotifications helpers', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('converts a VAPID key to Uint8Array', () => {
    const bytes = urlBase64ToUint8Array('AQID')
    expect(Array.from(bytes)).toEqual([1, 2, 3])
  })

  it('does not request web push on native or iOS browser tabs', () => {
    vi.stubGlobal('Notification', {})
    Object.defineProperty(window, 'PushManager', { configurable: true, value: function PushManager() {} })
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {} })

    vi.mocked(isNativeApp).mockReturnValue(true)
    expect(canRequestWebPush()).toBe(false)

    vi.mocked(isNativeApp).mockReturnValue(false)
    vi.mocked(isIosDevice).mockReturnValue(true)
    vi.mocked(isInstalledPwaDisplayMode).mockReturnValue(false)
    expect(canRequestWebPush()).toBe(false)
  })

  it('allows web push on Android/desktop or installed iOS PWA', () => {
    vi.stubGlobal('Notification', {})
    Object.defineProperty(window, 'PushManager', { configurable: true, value: function PushManager() {} })
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {} })

    vi.mocked(isNativeApp).mockReturnValue(false)
    vi.mocked(isIosDevice).mockReturnValue(false)
    expect(canRequestWebPush()).toBe(true)

    vi.mocked(isIosDevice).mockReturnValue(true)
    vi.mocked(isInstalledPwaDisplayMode).mockReturnValue(true)
    expect(canRequestWebPush()).toBe(true)
  })
})
