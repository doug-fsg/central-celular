import { describe, expect, it, vi } from 'vitest'
import { isInstalledPwaDisplayMode, isIosDevice, isIosSafari } from './pwa'

describe('isInstalledPwaDisplayMode', () => {
  it('returns false when display-mode is browser', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
    expect(isInstalledPwaDisplayMode()).toBe(false)
  })

  it('returns true for standalone display mode', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query.includes('standalone'),
      }))
    )
    expect(isInstalledPwaDisplayMode()).toBe(true)
  })

  it('returns true for legacy iOS navigator.standalone', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }))
    Object.defineProperty(navigator, 'standalone', {
      configurable: true,
      value: true,
    })
    expect(isInstalledPwaDisplayMode()).toBe(true)
  })
})

describe('iOS PWA helpers', () => {
  it('detects iPhone and iPad (including iPadOS desktop UA)', () => {
    expect(isIosDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true)
    expect(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5)).toBe(true)
    expect(isIosDevice('Mozilla/5.0 (Linux; Android 14)', 'Linux armv8l', 5)).toBe(false)
  })

  it('detects Safari on iOS but not Chrome iOS', () => {
    const safari =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    const chromeIos =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1'
    expect(isIosSafari(safari)).toBe(true)
    expect(isIosSafari(chromeIos)).toBe(false)
  })
})
