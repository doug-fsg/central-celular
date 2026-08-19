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
  default: { get: vi.fn(), post: vi.fn() },
}))

import { isNativeApp, getPlatform } from '../utils/platform'
import { isIosDevice, isInstalledPwaDisplayMode } from '../utils/pwa'
import { usePushPrompt } from './usePushPrompt'

function stubWebPushSupport() {
  vi.stubGlobal('Notification', { permission: 'default' })
  Object.defineProperty(window, 'PushManager', { configurable: true, value: function PM() {} })
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {} })
}

describe('usePushPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    localStorage.clear()
    vi.mocked(isNativeApp).mockReturnValue(false)
    vi.mocked(isIosDevice).mockReturnValue(false)
    vi.mocked(isInstalledPwaDisplayMode).mockReturnValue(false)
    vi.mocked(getPlatform).mockReturnValue('web')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is visible when web push is supported and permission is default', () => {
    stubWebPushSupport()
    const { visible, scenario } = usePushPrompt()
    expect(scenario.value).toBe('web')
    expect(visible.value).toBe(true)
  })

  it('is not visible when push already granted', () => {
    stubWebPushSupport()
    vi.stubGlobal('Notification', { permission: 'granted' })
    const { visible } = usePushPrompt()
    expect(visible.value).toBe(false)
  })

  it('is not visible when push denied', () => {
    stubWebPushSupport()
    vi.stubGlobal('Notification', { permission: 'denied' })
    const { visible } = usePushPrompt()
    expect(visible.value).toBe(false)
  })

  it('hides after dismiss and stays hidden for 7 days', () => {
    stubWebPushSupport()
    const { visible, dismiss } = usePushPrompt()
    expect(visible.value).toBe(true)

    dismiss()
    expect(visible.value).toBe(false)

    // new instance also hidden (localStorage)
    const { visible: v2 } = usePushPrompt()
    expect(v2.value).toBe(false)
  })

  it('reappears after 7 days', () => {
    stubWebPushSupport()
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000 - 1000
    localStorage.setItem('push-prompt-dismissed-at', String(sevenDaysAgo))

    const { visible } = usePushPrompt()
    expect(visible.value).toBe(true)
  })

  it('stays hidden within 7 days', () => {
    stubWebPushSupport()
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000
    localStorage.setItem('push-prompt-dismissed-at', String(twoDaysAgo))

    const { visible } = usePushPrompt()
    expect(visible.value).toBe(false)
  })

  it('detects ios-install scenario', () => {
    stubWebPushSupport()
    vi.mocked(isIosDevice).mockReturnValue(true)
    vi.mocked(isInstalledPwaDisplayMode).mockReturnValue(false)

    const { scenario, visible } = usePushPrompt()
    expect(scenario.value).toBe('ios-install')
    expect(visible.value).toBe(true)
  })

  it('detects android-native scenario', () => {
    stubWebPushSupport()
    vi.mocked(isNativeApp).mockReturnValue(true)
    vi.mocked(getPlatform).mockReturnValue('android')

    const { scenario, visible } = usePushPrompt()
    expect(scenario.value).toBe('android-native')
    expect(visible.value).toBe(true)
  })

  it('returns none for native iOS', () => {
    vi.mocked(isNativeApp).mockReturnValue(true)
    vi.mocked(getPlatform).mockReturnValue('ios')

    const { scenario, visible } = usePushPrompt()
    expect(scenario.value).toBe('none')
    expect(visible.value).toBe(false)
  })

  it('returns none when browser has no push support', () => {
    // no Notification, PushManager, or serviceWorker
    const { scenario, visible } = usePushPrompt()
    expect(scenario.value).toBe('none')
    expect(visible.value).toBe(false)
  })
})
