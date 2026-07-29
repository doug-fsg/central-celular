import { describe, expect, it, vi } from 'vitest'
import { isInstalledPwaDisplayMode } from './pwa'

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
