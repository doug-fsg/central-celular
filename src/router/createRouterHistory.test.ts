import { beforeEach, describe, expect, it, vi } from 'vitest'

const createWebHistory = vi.fn(() => ({ mode: 'history' as const }))
const createWebHashHistory = vi.fn(() => ({ mode: 'hash' as const }))

vi.mock('vue-router', () => ({
  createWebHistory,
  createWebHashHistory,
}))

describe('createRouterHistory', () => {
  beforeEach(async () => {
    vi.resetModules()
    createWebHistory.mockClear()
    createWebHashHistory.mockClear()
    vi.unstubAllEnvs()
  })

  it('uses hash history for Capacitor build', async () => {
    vi.stubEnv('VITE_CAPACITOR', 'true')
    const { createRouterHistory } = await import('./createRouterHistory')
    const history = createRouterHistory()
    expect(createWebHashHistory).toHaveBeenCalledOnce()
    expect(history.mode).toBe('hash')
  })

  it('uses web history for browser build', async () => {
    vi.stubEnv('VITE_CAPACITOR', '')
    const { createRouterHistory } = await import('./createRouterHistory')
    const history = createRouterHistory()
    expect(createWebHistory).toHaveBeenCalledOnce()
    expect(history.mode).toBe('history')
  })
})
