import { Request, Response } from 'express';
import { z } from 'zod';
import {
  liderPertenceAccount,
  montarDashboardCuidado,
} from '../services/dashboardCuidado.service';

function getAccountId(req: Request): number | null {
  return (req as any).user?.accountId ?? (req as any).usuario?.accountId ?? null;
}

const querySchema = z.object({
  liderId: z.coerce.number().int().positive().optional(),
});

export const obterDashboardCuidadoHandler = async (req: Request, res: Response) => {
  try {
    const accountId = getAccountId(req);
    if (!accountId) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Parâmetros inválidos';
      return res.status(400).json({ message: msg });
    }

    const liderId = parsed.data.liderId;

    if (liderId != null) {
      const ok = await liderPertenceAccount(accountId, liderId);
      if (!ok) {
        return res.status(400).json({ message: 'Líder não encontrado nesta conta' });
      }
    }

    const data = await montarDashboardCuidado(accountId, liderId ?? null);
    return res.json(data);
  } catch (e) {
    console.error('[dashboardCuidado]', e);
    return res.status(500).json({ message: 'Erro ao carregar dashboard de cuidado' });
  }
};
