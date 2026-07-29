import { describe, expect, it } from 'vitest'
import { resolveApiBase } from './resolveApiBase'

describe('resolveApiBase', () => {
  it('uses absolute HTTPS URL on Capacitor build', () => {
    expect(
      resolveApiBase({
        isCapacitor: true,
        apiUrl: 'https://central.example.com/api',
      })
    ).toBe('https://central.example.com/api')
  })

  it('appends /api when Capacitor URL has no suffix', () => {
    expect(
      resolveApiBase({
        isCapacitor: true,
        apiUrl: 'https://central.example.com',
      })
    ).toBe('https://central.example.com/api')
  })

  it('uses same origin on prod web when env points to localhost', () => {
    expect(
      resolveApiBase({
        isCapacitor: false,
        apiUrl: 'http://localhost:3000',
        windowOrigin: 'https://central.example.com',
        hostname: 'central.example.com',
      })
    ).toBe('https://central.example.com/api')
  })

  it('keeps localhost API on local dev hostname', () => {
    expect(
      resolveApiBase({
        isCapacitor: false,
        apiUrl: 'http://localhost:3000',
        windowOrigin: 'http://localhost:5173',
        hostname: 'localhost',
      })
    ).toBe('http://localhost:3000/api')
  })

  it('falls back to localhost when no env and no window', () => {
    expect(
      resolveApiBase({
        isCapacitor: false,
        apiUrl: undefined,
        windowOrigin: undefined,
        hostname: undefined,
      })
    ).toBe('http://localhost:3000/api')
  })

  it('normalizes trailing slash on generic apiUrl', () => {
    expect(
      resolveApiBase({
        apiUrl: 'https://api.example.com/',
        isCapacitor: false,
      })
    ).toBe('https://api.example.com/api')
  })
})
