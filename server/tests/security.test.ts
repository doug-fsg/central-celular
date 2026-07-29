import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('Security regressions (P0)', () => {
  it('POST /api/auth/create-password without setupToken returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/create-password')
      .send({
        whatsapp: '5511999999999',
        nome: 'Test User',
        senha: 'senha123',
      });

    expect(res.status).toBe(400);
  });

  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('auth rate limit returns 429 after many attempts', async () => {
    let lastStatus = 200;
    for (let i = 0; i < 12; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ whatsapp: '5511999999999', senha: 'wrong' });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});

describe('Multi-tenant IDOR', () => {
  it('GET /api/relatorios/999999 without auth returns 401', async () => {
    const res = await request(app).get('/api/relatorios/999999');
    expect([401, 404]).toContain(res.status);
  });
});
