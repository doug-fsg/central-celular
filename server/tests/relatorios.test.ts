import dotenv from 'dotenv';

dotenv.config();

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import {
  seedRelatorioFixtures,
  cleanupRelatorioFixtures,
  authHeader,
  weekPayload,
  type RelatorioTestFixtures,
} from './helpers/relatorioFixtures';

const hasDatabase = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDatabase ? describe : describe.skip;

describeIfDb('Relatórios — fluxo do líder (integração)', () => {
  const app = createApp();
  let fx: RelatorioTestFixtures;

  beforeAll(async () => {
    fx = await seedRelatorioFixtures();
  });

  afterAll(async () => {
    await cleanupRelatorioFixtures(fx.runId);
  });

  it('cria relatório de célula, registra presenças e envia com sucesso', async () => {
    const payload = weekPayload(fx.celulaA.id, 0, 1);

    const createRes = await request(app)
      .post('/api/relatorios')
      .set(authHeader(fx.tokenA))
      .send(payload);

    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe(0);
    const relatorioId = createRes.body.id;

    const presencaRes = await request(app)
      .post(`/api/relatorios/${relatorioId}/presencas`)
      .set(authHeader(fx.tokenA))
      .send({ membroId: fx.membroA1.id, status: 1, tipo: 0 });

    expect(presencaRes.status).toBe(201);

    const enviarRes = await request(app)
      .post(`/api/relatorios/${relatorioId}/enviar`)
      .set(authHeader(fx.tokenA))
      .send({});

    expect(enviarRes.status).toBe(200);
    expect(enviarRes.body.status).toBe(1);
    expect(enviarRes.body.dataEnvio).toBeTruthy();

    const presencas = await request(app)
      .get(`/api/relatorios/${relatorioId}`)
      .set(authHeader(fx.tokenA));

    expect(presencas.status).toBe(200);
    expect(presencas.body.presencas.length).toBeGreaterThanOrEqual(2);
  });

  it('envia relatório de culto preenchendo ausentes com tipo correto', async () => {
    const payload = weekPayload(fx.celulaA.id, 1, 2);

    const createRes = await request(app)
      .post('/api/relatorios')
      .set(authHeader(fx.tokenA))
      .send(payload);

    expect(createRes.status).toBe(201);
    const relatorioId = createRes.body.id;

    await request(app)
      .post(`/api/relatorios/${relatorioId}/presencas`)
      .set(authHeader(fx.tokenA))
      .send({ membroId: fx.membroA1.id, status: 1, tipo: 1 });

    const enviarRes = await request(app)
      .post(`/api/relatorios/${relatorioId}/enviar`)
      .set(authHeader(fx.tokenA))
      .send({});

    expect(enviarRes.status).toBe(200);

    const detalhe = await request(app)
      .get(`/api/relatorios/${relatorioId}`)
      .set(authHeader(fx.tokenA));

    const tipos = detalhe.body.presencas.map((p: { tipo: number }) => p.tipo);
    expect(tipos.every((t: number) => t === 1)).toBe(true);
  });

  it('envia relatório sem presenças manuais (preenche ausentes automaticamente)', async () => {
    const payload = weekPayload(fx.celulaA.id, 0, 3);

    const createRes = await request(app)
      .post('/api/relatorios')
      .set(authHeader(fx.tokenA))
      .send(payload);

    const relatorioId = createRes.body.id;

    const enviarRes = await request(app)
      .post(`/api/relatorios/${relatorioId}/enviar`)
      .set(authHeader(fx.tokenA))
      .send({});

    expect(enviarRes.status).toBe(200);
    expect(enviarRes.body.status).toBe(1);
  });

  it('marca todos presentes via presencas/todos', async () => {
    const payload = weekPayload(fx.celulaA.id, 0, 4);

    const createRes = await request(app)
      .post('/api/relatorios')
      .set(authHeader(fx.tokenA))
      .send(payload);

    const relatorioId = createRes.body.id;

    const todosRes = await request(app)
      .post(`/api/relatorios/${relatorioId}/presencas/todos`)
      .set(authHeader(fx.tokenA))
      .send({ status: 1 });

    expect(todosRes.status).toBe(200);

    const enviarRes = await request(app)
      .post(`/api/relatorios/${relatorioId}/enviar`)
      .set(authHeader(fx.tokenA))
      .send({});

    expect(enviarRes.status).toBe(200);
  });

  it('retorna 409 ao criar relatório duplicado na mesma semana', async () => {
    const payload = weekPayload(fx.celulaA.id, 0, 5);

    const first = await request(app)
      .post('/api/relatorios')
      .set(authHeader(fx.tokenA))
      .send(payload);

    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/relatorios')
      .set(authHeader(fx.tokenA))
      .send(payload);

    expect(second.status).toBe(409);
  });

  it('retorna 400 ao tentar enviar relatório já enviado', async () => {
    const payload = weekPayload(fx.celulaA.id, 0, 6);

    const createRes = await request(app)
      .post('/api/relatorios')
      .set(authHeader(fx.tokenA))
      .send(payload);

    const relatorioId = createRes.body.id;

    await request(app)
      .post(`/api/relatorios/${relatorioId}/enviar`)
      .set(authHeader(fx.tokenA))
      .send({});

    const again = await request(app)
      .post(`/api/relatorios/${relatorioId}/enviar`)
      .set(authHeader(fx.tokenA))
      .send({});

    expect(again.status).toBe(400);
  });

  it('atualiza presença existente (upsert) sem erro', async () => {
    const payload = weekPayload(fx.celulaA.id, 0, 7);

    const createRes = await request(app)
      .post('/api/relatorios')
      .set(authHeader(fx.tokenA))
      .send(payload);

    const relatorioId = createRes.body.id;

    const first = await request(app)
      .post(`/api/relatorios/${relatorioId}/presencas`)
      .set(authHeader(fx.tokenA))
      .send({ membroId: fx.membroA1.id, status: 1, tipo: 0 });

    const second = await request(app)
      .post(`/api/relatorios/${relatorioId}/presencas`)
      .set(authHeader(fx.tokenA))
      .send({ membroId: fx.membroA1.id, status: 0, tipo: 0 });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.status).toBe(0);
  });
});

describeIfDb('Relatórios — isolamento multi-tenant', () => {
  const app = createApp();
  let fx: RelatorioTestFixtures;
  let relatorioIdA: number;

  beforeAll(async () => {
    fx = await seedRelatorioFixtures();
    const payload = weekPayload(fx.celulaA.id, 0, 10);

    const res = await request(app)
      .post('/api/relatorios')
      .set(authHeader(fx.tokenA))
      .send(payload);

    relatorioIdA = res.body.id;
  });

  afterAll(async () => {
    await cleanupRelatorioFixtures(fx.runId);
  });

  it('tenant B não acessa relatório do tenant A', async () => {
    const res = await request(app)
      .get(`/api/relatorios/${relatorioIdA}`)
      .set(authHeader(fx.tokenB));

    expect(res.status).toBe(404);
  });

  it('tenant B não envia relatório do tenant A', async () => {
    const res = await request(app)
      .post(`/api/relatorios/${relatorioIdA}/enviar`)
      .set(authHeader(fx.tokenB))
      .send({});

    expect(res.status).toBe(404);
  });

  it('tenant B não registra presença em relatório do tenant A', async () => {
    const res = await request(app)
      .post(`/api/relatorios/${relatorioIdA}/presencas`)
      .set(authHeader(fx.tokenB))
      .send({ membroId: fx.membroB1.id, status: 1, tipo: 0 });

    expect(res.status).toBe(404);
  });

  it('tenant B não cria relatório em célula do tenant A', async () => {
    const res = await request(app)
      .post('/api/relatorios')
      .set(authHeader(fx.tokenB))
      .send(weekPayload(fx.celulaA.id, 0, 11));

    expect(res.status).toBe(404);
  });

  it('membro de outra célula retorna 404 ao registrar presença', async () => {
    const res = await request(app)
      .post(`/api/relatorios/${relatorioIdA}/presencas`)
      .set(authHeader(fx.tokenA))
      .send({ membroId: fx.membroB1.id, status: 1, tipo: 0 });

    expect(res.status).toBe(404);
  });
});

describe('Relatórios — smoke (sem banco)', () => {
  const app = createApp();

  it('GET /api/relatorios sem auth retorna 401', async () => {
    const res = await request(app).get('/api/relatorios?celulaId=1&dataInicio=2026-01-01&dataFim=2026-01-31');
    expect(res.status).toBe(401);
  });

  it('POST /api/relatorios sem auth retorna 401', async () => {
    const res = await request(app).post('/api/relatorios').send({
      celulaId: 1,
      dataInicio: '2026-01-01',
      dataFim: '2026-01-07',
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/relatorios/:id/enviar sem auth retorna 401', async () => {
    const res = await request(app).post('/api/relatorios/1/enviar').send({});
    expect(res.status).toBe(401);
  });
});

if (!hasDatabase) {
  console.warn('[relatorios.test] DATABASE_URL não definido — testes de integração ignorados.');
}
