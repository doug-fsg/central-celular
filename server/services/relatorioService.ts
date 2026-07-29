import { prisma } from '../lib/prisma';

type PresencaCountKey = `${number}:${number}:${number}`;

export function buildPresencaCountMap(
  rows: Array<{ relatorioId: number; tipo: number; status: number; _count: { _all: number } }>,
): Map<PresencaCountKey, number> {
  const map = new Map<PresencaCountKey, number>();
  for (const row of rows) {
    map.set(`${row.relatorioId}:${row.tipo}:${row.status}`, row._count._all);
  }
  return map;
}

export function getPresencaCount(map: Map<PresencaCountKey, number>, relatorioId: number, tipo: number, status?: number): number {
  if (status === undefined) {
    return (
      (map.get(`${relatorioId}:${tipo}:0`) ?? 0) +
      (map.get(`${relatorioId}:${tipo}:1`) ?? 0) +
      (map.get(`${relatorioId}:${tipo}:2`) ?? 0)
    );
  }
  return map.get(`${relatorioId}:${tipo}:${status}`) ?? 0;
}

export const relatorioService = {
  async listarComContagens(params: {
    celulaId: number;
    dataInicio: Date;
    dataFim: Date;
    evento?: number;
  }) {
    const whereClause = {
      celulaId: params.celulaId,
      dataInicio: { gte: params.dataInicio },
      dataFim: { lte: params.dataFim },
      ...(params.evento !== undefined ? { evento: params.evento } : {}),
    };

    const relatorios = await prisma.relatorio.findMany({
      where: whereClause,
      include: {
        celula: { select: { nome: true } },
        _count: { select: { presencas: true } },
      },
      orderBy: { dataInicio: 'asc' },
    });

    if (relatorios.length === 0) {
      return [];
    }

    const relatorioIds = relatorios.map((r) => r.id);
    const grouped = await prisma.presenca.groupBy({
      by: ['relatorioId', 'tipo', 'status'],
      where: { relatorioId: { in: relatorioIds } },
      _count: { _all: true },
    });

    const countMap = buildPresencaCountMap(grouped);

    return relatorios.map((rel) => {
      const presentesCelula = getPresencaCount(countMap, rel.id, 0, 1);
      const totalCelula = getPresencaCount(countMap, rel.id, 0);
      const presentesCulto = getPresencaCount(countMap, rel.id, 1, 1);
      const totalCulto = getPresencaCount(countMap, rel.id, 1);
      const { _count, ...resto } = rel;

      return {
        ...resto,
        presentes: presentesCelula + presentesCulto,
        total: _count.presencas,
        presentesCelula,
        totalCelula,
        presentesCulto,
        totalCulto,
      };
    });
  },
};
