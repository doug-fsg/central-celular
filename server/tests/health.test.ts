import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../app'

describe('Health endpoints', () => {
  const app = createApp()

  it('GET /api/health returns ok envelope', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.status).toBe('ok')
  })
})
