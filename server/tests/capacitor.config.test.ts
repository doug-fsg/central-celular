import { describe, expect, it } from 'vitest'
import config from '../../capacitor.config'

describe('capacitor.config', () => {
  it('points webDir to Vite dist output', () => {
    expect(config.webDir).toBe('dist')
  })

  it('uses https androidScheme for secure WebView', () => {
    expect(config.server?.androidScheme).toBe('https')
  })

  it('enables CapacitorHttp for native requests', () => {
    expect(config.plugins?.CapacitorHttp).toEqual({ enabled: true })
  })

  it('keeps splash manual until app hides it', () => {
    expect(config.plugins?.SplashScreen?.launchAutoHide).toBe(false)
  })

  it('does not hardcode dev server URL in committed config', () => {
    const url = config.server?.url
    if (url) {
      expect(process.env.CAPACITOR_DEV_SERVER_URL).toBeTruthy()
    } else {
      expect(url).toBeUndefined()
    }
  })
})
