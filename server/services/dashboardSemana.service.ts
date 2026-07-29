import { prisma } from '../lib/prisma';

export interface DashboardSemanaResponse {
  periodo: { inicio: string; fim: string };
  participacao: {
    totalMembros: number;
    culto: { presentes: number; total: number; percentual: number };
    celula: { presentes: number; total: number; percentual: number };
  };
  relatorios: {
    lideresTotal: number;
    lideresPreencheram: number;
    pendentes: number;
    percentualAdesao: number;
  };
  filtros: { liderId: number | null };
}

function countByTipoStatus(
  rows: Array<{ tipo: number; status: number; _count: { _all: number } }>,
  tipo: number,
  status?: number,
) {
  return rows
    .filter((p) => p.tipo === tipo && (status === undefined || p.status === status))
    .reduce((sum, p) => sum + p._count._all, 0);
}

export async function montarDashboardSemana(
  accountId: number,
  dataInicio: Date,
  dataFim: Date,
  liderId: number | null,
): Promise<DashboardSemanaResponse> {
  const celulaScope = {
    accountId,
    ativo: true,
    ...(liderId != null ? { liderId } : {}),
  };

  const fimDia = new Date(dataFim);
  fimDia.setHours(23, 59, 59, 999);

  const [
    totalMembros,
    presencas,
    lideresTotalRows,
    lideresPreencheramRows,
  ] = await Promise.all([
    prisma.membro.count({
      where: {
        ativo: true,
        celula: celulaScope,
      },
    }),
    prisma.presenca.groupBy({
      by: ['tipo', 'status'],
      where: {
        relatorio: {
          dataEnvio: { gte: dataInicio, lte: fimDia },
          celula: celulaScope,
        },
      },
      _count: { _all: true },
    }),
    prisma.celula.groupBy({
      by: ['liderId'],
      where: celulaScope,
      _count: { _all: true },
    }),
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(DISTINCT c.lider_id)::int AS count
      FROM relatorios r
      INNER JOIN celulas c ON c.id = r.celula_id
      WHERE r.status = 1
        AND r.data_envio >= ${dataInicio}
        AND r.data_envio <= ${fimDia}
        AND c.account_id = ${accountId}
        AND c.ativo = true
        AND (${liderId}::integer IS NULL OR c.lider_id = ${liderId})
    `,
  ]);

  const totCel = countByTipoStatus(presencas, 0);
  const presCel = countByTipoStatus(presencas, 0, 1);
  const totCult = countByTipoStatus(presencas, 1);
  const presCult = countByTipoStatus(presencas, 1, 1);

  const pctCel = totCel > 0 ? Math.round((presCel / totCel) * 100) : 0;
  const pctCult = totCult > 0 ? Math.round((presCult / totCult) * 100) : 0;

  const lideresTotal = lideresTotalRows.length;
  const lideresPreencheram = lideresPreencheramRows[0]?.count ?? 0;
  const pendentes = Math.max(0, lideresTotal - lideresPreencheram);
  const percentualAdesao =
    lideresTotal > 0 ? Math.round((lideresPreencheram / lideresTotal) * 100) : 0;

  return {
    periodo: {
      inicio: dataInicio.toISOString().slice(0, 10),
      fim: dataFim.toISOString().slice(0, 10),
    },
    participacao: {
      totalMembros,
      culto: { presentes: presCult, total: totCult, percentual: pctCult },
      celula: { presentes: presCel, total: totCel, percentual: pctCel },
    },
    relatorios: {
      lideresTotal,
      lideresPreencheram,
      pendentes,
      percentualAdesao,
    },
    filtros: { liderId },
  };
}
