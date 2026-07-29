import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { signAccessToken } from '../../lib/jwt';

export interface RelatorioTestFixtures {
  runId: number;
  accountA: { id: number };
  accountB: { id: number };
  leaderA: { id: number };
  leaderB: { id: number };
  celulaA: { id: number };
  celulaB: { id: number };
  membroA1: { id: number };
  membroA2: { id: number };
  membroB1: { id: number };
  tokenA: string;
  tokenB: string;
}

export async function seedRelatorioFixtures(): Promise<RelatorioTestFixtures> {
  const runId = Date.now();
  const suffix = String(runId).slice(-8);

  const accountA = await prisma.account.create({
    data: { nome: `Test Church A ${runId}`, ativo: true },
  });
  const accountB = await prisma.account.create({
    data: { nome: `Test Church B ${runId}`, ativo: true },
  });

  const senha = await bcrypt.hash('test123', 10);

  const leaderA = await prisma.usuario.create({
    data: {
      nome: 'Líder Teste A',
      whatsapp: `5511${suffix}01`,
      senha,
      cargo: 'LIDER',
      accountId: accountA.id,
      ativo: true,
    },
  });

  const leaderB = await prisma.usuario.create({
    data: {
      nome: 'Líder Teste B',
      whatsapp: `5511${suffix}02`,
      senha,
      cargo: 'LIDER',
      accountId: accountB.id,
      ativo: true,
    },
  });

  const celulaA = await prisma.celula.create({
    data: {
      nome: 'Célula Teste A',
      diaSemana: 'segunda',
      horario: '19:30',
      liderId: leaderA.id,
      accountId: accountA.id,
      ativo: true,
    },
  });

  const celulaB = await prisma.celula.create({
    data: {
      nome: 'Célula Teste B',
      diaSemana: 'terca',
      horario: '20:00',
      liderId: leaderB.id,
      accountId: accountB.id,
      ativo: true,
    },
  });

  const membroA1 = await prisma.membro.create({
    data: { celulaId: celulaA.id, nome: 'Membro A1', ativo: true },
  });
  const membroA2 = await prisma.membro.create({
    data: { celulaId: celulaA.id, nome: 'Membro A2', ativo: true },
  });
  const membroB1 = await prisma.membro.create({
    data: { celulaId: celulaB.id, nome: 'Membro B1', ativo: true },
  });

  const tokenA = signAccessToken({
    userId: leaderA.id,
    accountId: accountA.id,
    isSuperAdmin: false,
  });
  const tokenB = signAccessToken({
    userId: leaderB.id,
    accountId: accountB.id,
    isSuperAdmin: false,
  });

  return {
    runId,
    accountA,
    accountB,
    leaderA,
    leaderB,
    celulaA,
    celulaB,
    membroA1,
    membroA2,
    membroB1,
    tokenA,
    tokenB,
  };
}

export async function cleanupRelatorioFixtures(runId: number): Promise<void> {
  const accounts = await prisma.account.findMany({
    where: { nome: { contains: String(runId) } },
    select: { id: true },
  });

  for (const { id: accountId } of accounts) {
    await prisma.presenca.deleteMany({
      where: { relatorio: { celula: { accountId } } },
    });
    await prisma.relatorio.deleteMany({ where: { celula: { accountId } } });
    await prisma.membro.deleteMany({ where: { celula: { accountId } } });
    await prisma.celula.deleteMany({ where: { accountId } });
    await prisma.refreshToken.deleteMany({ where: { usuario: { accountId } } });
    await prisma.deviceToken.deleteMany({ where: { usuario: { accountId } } });
    await prisma.usuario.deleteMany({ where: { accountId } });
    await prisma.account.delete({ where: { id: accountId } });
  }
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/** Semana fixa para evitar colisão entre testes paralelos na mesma célula. */
export function weekPayload(celulaId: number, evento = 0, weekOffset = 0) {
  const base = new Date('2026-01-05T00:00:00.000Z');
  base.setUTCDate(base.getUTCDate() + weekOffset * 7);
  const fim = new Date(base);
  fim.setUTCDate(fim.getUTCDate() + 6);

  return {
    celulaId,
    dataInicio: base.toISOString(),
    dataFim: fim.toISOString(),
    evento,
  };
}
