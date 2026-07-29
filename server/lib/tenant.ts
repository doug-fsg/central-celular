import { Request } from 'express';
import { prisma } from './prisma';

export function getAccountId(req: Request): number | null {
  return req.user?.accountId ?? (req as Request & { usuario?: { accountId?: number } }).usuario?.accountId ?? null;
}

export function getUserId(req: Request): number | null {
  return req.user?.id ?? (req as Request & { usuario?: { id?: number } }).usuario?.id ?? null;
}

export async function findCelulaForAccount(celulaId: number, accountId: number) {
  return prisma.celula.findFirst({
    where: { id: celulaId, accountId },
  });
}

export async function findRelatorioForAccount(relatorioId: number, accountId: number) {
  return prisma.relatorio.findFirst({
    where: {
      id: relatorioId,
      celula: { accountId },
    },
    include: {
      celula: { select: { id: true, accountId: true, nome: true } },
    },
  });
}

export async function findUsuarioForAccount(usuarioId: number, accountId: number) {
  return prisma.usuario.findFirst({
    where: { id: usuarioId, accountId },
  });
}

export async function assertCelulaBelongsToAccount(
  celulaId: number,
  accountId: number,
): Promise<{ ok: true; celula: NonNullable<Awaited<ReturnType<typeof findCelulaForAccount>>> } | { ok: false }> {
  const celula = await findCelulaForAccount(celulaId, accountId);
  if (!celula) return { ok: false };
  return { ok: true, celula };
}

export async function assertRelatorioBelongsToAccount(
  relatorioId: number,
  accountId: number,
): Promise<{ ok: true; relatorio: NonNullable<Awaited<ReturnType<typeof findRelatorioForAccount>>> } | { ok: false }> {
  const relatorio = await findRelatorioForAccount(relatorioId, accountId);
  if (!relatorio) return { ok: false };
  return { ok: true, relatorio };
}

export async function assertUsuarioBelongsToAccount(
  usuarioId: number,
  accountId: number,
): Promise<{ ok: true; usuario: NonNullable<Awaited<ReturnType<typeof findUsuarioForAccount>>> } | { ok: false }> {
  const usuario = await findUsuarioForAccount(usuarioId, accountId);
  if (!usuario) return { ok: false };
  return { ok: true, usuario };
}
