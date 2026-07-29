import { afterEach, describe, expect, it } from 'vitest'
import { getCorsOrigins } from '../lib/env'

describe('getCorsOrigins', () => {
  const previous = process.env.CORS_ORIGINS

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.CORS_ORIGINS
    } else {
      process.env.CORS_ORIGINS = previous
    }
  })

  it('includes Capacitor and Ionic default origins', () => {
    delete process.env.CORS_ORIGINS
    const origins = getCorsOrigins()
    expect(origins).toContain('capacitor://localhost')
    expect(origins).toContain('ionic://localhost')
    expect(origins).toContain('http://localhost:5173')
  })

  it('parses comma-separated CORS_ORIGINS from env', () => {
    process.env.CORS_ORIGINS = 'https://a.com, https://b.com '
    expect(getCorsOrigins()).toEqual(['https://a.com', 'https://b.com'])
  })
})
