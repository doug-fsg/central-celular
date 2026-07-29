import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export async function deleteUsuarioAdmin(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = Number(id);
    const accountId = (req as Request & { user?: { accountId?: number }; usuario?: { id?: number; accountId?: number } }).user?.accountId
      ?? (req as Request & { usuario?: { accountId?: number } }).usuario?.accountId;

    if (!accountId) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const usuario = await prisma.usuario.findFirst({
      where: { id: userId, accountId },
      select: { id: true, nome: true, cargo: true },
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const actorId = (req as Request & { usuario?: { id?: number } }).usuario?.id
      ?? (req as Request & { user?: { id?: number } }).user?.id;

    if (usuario.id === actorId) {
      return res.status(400).json({ message: 'Não é possível excluir o próprio usuário' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.celula.updateMany({
        where: { coLiderId: userId, accountId },
        data: { coLiderId: null },
      });

      await tx.celula.updateMany({
        where: { supervisorId: userId, accountId },
        data: { supervisorId: null },
      });

      const celulasLideradas = await tx.celula.findMany({
        where: { liderId: userId, accountId },
        select: { id: true },
      });

      if (celulasLideradas.length > 0) {
        const celulaIds = celulasLideradas.map((c) => c.id);
        await tx.relatorio.deleteMany({ where: { celulaId: { in: celulaIds } } });
        await tx.membro.deleteMany({ where: { celulaId: { in: celulaIds } } });
        await tx.celula.deleteMany({ where: { id: { in: celulaIds }, accountId } });
      }

      await tx.notificacao.deleteMany({ where: { usuarioId: userId } });
      await tx.conquista.deleteMany({ where: { usuarioId: userId } });
      await tx.ssoLink.deleteMany({ where: { usuarioId: userId } });
      await tx.usuarioConfig.deleteMany({ where: { usuarioId: userId } });
      await tx.refreshToken.deleteMany({ where: { usuarioId: userId } });
      await tx.deviceToken.deleteMany({ where: { usuarioId: userId } });
      await tx.usuario.delete({ where: { id: userId, accountId } });
    });

    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ message: 'Erro ao excluir usuário' });
  }
}
