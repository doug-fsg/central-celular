import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from '../app'

describe('CORS for Capacitor clients', () => {
  const app = createApp()

  it('allows capacitor://localhost on GET /api/health', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'capacitor://localhost')

    expect(res.status).toBe(200)
    expect(res.headers['access-control-allow-origin']).toBe('capacitor://localhost')
    expect(res.body.success).toBe(true)
  })

  it('allows ionic://localhost on OPTIONS preflight', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'ionic://localhost')
      .set('Access-Control-Request-Method', 'GET')

    expect(res.status).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe('ionic://localhost')
  })

  it('blocks unknown origins', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil.example.com')

    expect(res.status).toBe(500)
  })
})
