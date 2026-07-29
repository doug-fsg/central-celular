import { Request, Response } from 'express';
import { z } from 'zod';
import { liderPertenceAccount } from '../services/dashboardCuidado.service';
import { montarDashboardSemana } from '../services/dashboardSemana.service';

function getAccountId(req: Request): number | null {
  return (req as any).user?.accountId ?? (req as any).usuario?.accountId ?? null;
}

const querySchema = z.object({
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  liderId: z.coerce.number().int().positive().optional(),
});

export const obterDashboardSemanaHandler = async (req: Request, res: Response) => {
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

    const { dataInicio, dataFim, liderId } = parsed.data;
    const inicio = new Date(`${dataInicio}T00:00:00`);
    const fim = new Date(`${dataFim}T00:00:00`);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || inicio > fim) {
      return res.status(400).json({ message: 'Intervalo de datas inválido' });
    }

    if (liderId != null) {
      const ok = await liderPertenceAccount(accountId, liderId);
      if (!ok) {
        return res.status(400).json({ message: 'Líder não encontrado nesta conta' });
      }
    }

    const data = await montarDashboardSemana(accountId, inicio, fim, liderId ?? null);
    return res.json(data);
  } catch (e) {
    console.error('[dashboardSemana]', e);
    return res.status(500).json({ message: 'Erro ao carregar indicadores da semana' });
  }
};
