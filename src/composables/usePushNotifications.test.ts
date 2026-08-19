import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
    delete: vi.fn(),
  },
}))

import api from '../services/api'
import { isNativeApp, getPlatform } from '../utils/platform'
import { isInstalledPwaDisplayMode, isIosDevice } from '../utils/pwa'
import {
  canRequestWebPush,
  urlBase64ToUint8Array,
  registerPushIfEligible,
  usePushNotifications,
} from './usePushNotifications'

function stubWebPushSupport(permission: NotificationPermission = 'default') {
  vi.stubGlobal('Notification', {
    permission,
    requestPermission: vi.fn(async () => permission),
  })
  Object.defineProperty(window, 'PushManager', { configurable: true, value: function PM() {} })
}

function stubServiceWorker(subscription: any = null) {
  const sw = {
    ready: Promise.resolve({
      pushManager: {
        getSubscription: vi.fn(async () => subscription),
        subscribe: vi.fn(async () => subscription),
      },
    }),
  }
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: sw })
  return sw
}

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

describe('registerPushIfEligible', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('does nothing when permission is not granted', async () => {
    stubWebPushSupport('default')
    stubServiceWorker()
    vi.mocked(isNativeApp).mockReturnValue(false)
    vi.mocked(isIosDevice).mockReturnValue(false)

    await registerPushIfEligible()
    expect(api.get).not.toHaveBeenCalled()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('registers when permission is already granted', async () => {
    stubWebPushSupport('granted')
    const sub = {
      toJSON: () => ({ endpoint: 'https://example.com', keys: { p256dh: 'a', auth: 'b' } }),
    }
    stubServiceWorker(sub)
    vi.mocked(isNativeApp).mockReturnValue(false)
    vi.mocked(isIosDevice).mockReturnValue(false)
    vi.mocked(api.get).mockResolvedValue({ data: { publicKey: 'vapid-key' } })
    vi.mocked(api.post).mockResolvedValue({})

    await registerPushIfEligible()

    expect(api.get).toHaveBeenCalledWith('/devices/vapid-public-key')
    expect(api.post).toHaveBeenCalledWith('/devices/register', expect.objectContaining({
      platform: 'web',
    }))
  })

  it('does nothing when denied', async () => {
    stubWebPushSupport('denied')
    stubServiceWorker()
    vi.mocked(isNativeApp).mockReturnValue(false)
    vi.mocked(isIosDevice).mockReturnValue(false)

    await registerPushIfEligible()
    expect(api.get).not.toHaveBeenCalled()
  })
})

describe('usePushNotifications composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    vi.mocked(isNativeApp).mockReturnValue(false)
    vi.mocked(isIosDevice).mockReturnValue(false)
    vi.mocked(getPlatform).mockReturnValue('web')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('refreshPermission', () => {
    it('sets granted when Notification.permission is granted', () => {
      stubWebPushSupport('granted')
      stubServiceWorker()
      const { permissionStatus, refreshPermission } = usePushNotifications()
      refreshPermission()
      expect(permissionStatus.value).toBe('granted')
    })

    it('sets prompt when Notification.permission is default', () => {
      stubWebPushSupport('default')
      stubServiceWorker()
      const { permissionStatus, refreshPermission } = usePushNotifications()
      refreshPermission()
      expect(permissionStatus.value).toBe('prompt')
    })

    it('sets denied when Notification.permission is denied', () => {
      stubWebPushSupport('denied')
      stubServiceWorker()
      const { permissionStatus, refreshPermission } = usePushNotifications()
      refreshPermission()
      expect(permissionStatus.value).toBe('denied')
    })

    it('sets ios-browser on iOS without PWA', () => {
      stubWebPushSupport()
      stubServiceWorker()
      vi.mocked(isIosDevice).mockReturnValue(true)
      vi.mocked(isInstalledPwaDisplayMode).mockReturnValue(false)

      const { permissionStatus, refreshPermission } = usePushNotifications()
      refreshPermission()
      expect(permissionStatus.value).toBe('ios-browser')
    })

    it('sets unsupported when no Notification API', () => {
      // no Notification global
      const { permissionStatus, refreshPermission } = usePushNotifications()
      refreshPermission()
      expect(permissionStatus.value).toBe('unsupported')
    })

    it('sets prompt for native Android', () => {
      vi.mocked(isNativeApp).mockReturnValue(true)
      vi.mocked(getPlatform).mockReturnValue('android')
      const { permissionStatus, refreshPermission } = usePushNotifications()
      refreshPermission()
      expect(permissionStatus.value).toBe('prompt')
    })
  })

  describe('enablePush', () => {
    it('returns false for iOS browser', async () => {
      stubWebPushSupport()
      stubServiceWorker()
      vi.mocked(isIosDevice).mockReturnValue(true)
      vi.mocked(isInstalledPwaDisplayMode).mockReturnValue(false)

      const { enablePush, errorMessage, permissionStatus } = usePushNotifications()
      const result = await enablePush()
      expect(result).toBe(false)
      expect(permissionStatus.value).toBe('ios-browser')
      expect(errorMessage.value).toContain('tela inicial')
    })

    it('returns false when browser does not support push', async () => {
      // no push support
      const { enablePush, errorMessage } = usePushNotifications()
      const result = await enablePush()
      expect(result).toBe(false)
      expect(errorMessage.value).toContain('não suporta')
    })

    it('returns false when user denies permission', async () => {
      vi.stubGlobal('Notification', {
        permission: 'default',
        requestPermission: vi.fn(async () => 'denied'),
      })
      Object.defineProperty(window, 'PushManager', { configurable: true, value: function PM() {} })
      stubServiceWorker()

      const { enablePush, permissionStatus } = usePushNotifications()
      const result = await enablePush()
      expect(result).toBe(false)
      expect(permissionStatus.value).toBe('denied')
    })

    it('sets registering flag during operation', async () => {
      vi.stubGlobal('Notification', {
        permission: 'default',
        requestPermission: vi.fn(() => new Promise((r) => setTimeout(() => r('granted'), 10))),
      })
      Object.defineProperty(window, 'PushManager', { configurable: true, value: function PM() {} })
      const sub = {
        toJSON: () => ({ endpoint: 'https://e.com', keys: { p256dh: 'a', auth: 'b' } }),
      }
      stubServiceWorker(sub)
      vi.mocked(api.get).mockResolvedValue({ data: { publicKey: 'k' } })
      vi.mocked(api.post).mockResolvedValue({})

      const { enablePush, registering } = usePushNotifications()
      expect(registering.value).toBe(false)

      const promise = enablePush()
      expect(registering.value).toBe(true)
      await promise
      expect(registering.value).toBe(false)
    })
  })

  describe('disablePush', () => {
    it('calls unsubscribe endpoint and removes subscription', async () => {
      stubWebPushSupport('granted')
      const unsubscribe = vi.fn(async () => true)
      const sub = {
        toJSON: () => ({ endpoint: 'https://example.com', keys: { p256dh: 'a', auth: 'b' } }),
        unsubscribe,
      }
      stubServiceWorker(sub)
      vi.mocked(api.post).mockResolvedValue({})

      const { disablePush } = usePushNotifications()
      const result = await disablePush()

      expect(result).toBe(true)
      expect(api.post).toHaveBeenCalledWith('/devices/unsubscribe', {
        token: JSON.stringify(sub.toJSON()),
      })
      expect(unsubscribe).toHaveBeenCalled()
    })

    it('still unsubscribes locally if server call fails', async () => {
      stubWebPushSupport('granted')
      const unsubscribe = vi.fn(async () => true)
      const sub = {
        toJSON: () => ({ endpoint: 'https://example.com', keys: {} }),
        unsubscribe,
      }
      stubServiceWorker(sub)
      vi.mocked(api.post).mockRejectedValue(new Error('404'))

      const { disablePush } = usePushNotifications()
      const result = await disablePush()

      expect(result).toBe(true)
      expect(unsubscribe).toHaveBeenCalled()
    })

    it('succeeds even when there is no active subscription', async () => {
      stubWebPushSupport('granted')
      stubServiceWorker(null)

      const { disablePush } = usePushNotifications()
      const result = await disablePush()

      expect(result).toBe(true)
      expect(api.post).not.toHaveBeenCalled()
    })

    it('returns false for native app', async () => {
      vi.mocked(isNativeApp).mockReturnValue(true)

      const { disablePush, errorMessage } = usePushNotifications()
      const result = await disablePush()

      expect(result).toBe(false)
      expect(errorMessage.value).toContain('configurações do sistema')
    })

    it('sets registering flag during operation', async () => {
      stubWebPushSupport('granted')
      stubServiceWorker(null)

      const { disablePush, registering } = usePushNotifications()
      expect(registering.value).toBe(false)

      const promise = disablePush()
      expect(registering.value).toBe(true)
      await promise
      expect(registering.value).toBe(false)
    })

    it('sets error message on unexpected failure', async () => {
      stubWebPushSupport('granted')
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: { ready: Promise.reject(new Error('SW not available')) },
      })

      const { disablePush, errorMessage } = usePushNotifications()
      const result = await disablePush()

      expect(result).toBe(false)
      expect(errorMessage.value).toBe('SW not available')
    })
  })
})
