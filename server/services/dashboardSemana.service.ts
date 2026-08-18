import { prisma } from '../lib/prisma';

export interface ParticipacaoMembroItem {
  membroId: number;
  membroNome: string;
  liderNome: string;
  cuidadorNome: string | null;
}

export interface LiderRelatorioItem {
  liderId: number;
  liderNome: string;
  celulas: string[];
}

export interface DashboardSemanaResponse {
  periodo: { inicio: string; fim: string };
  participacao: {
    totalMembros: number;
    culto: { presentes: number; total: number; percentual: number };
    celula: { presentes: number; total: number; percentual: number };
    listas: {
      culto: ParticipacaoMembroItem[];
      celula: ParticipacaoMembroItem[];
    };
  };
  relatorios: {
    lideresTotal: number;
    lideresPreencheram: number;
    pendentes: number;
    percentualAdesao: number;
    listas: {
      preencheram: LiderRelatorioItem[];
      pendentes: LiderRelatorioItem[];
    };
  };
  filtros: { liderId: number | null };
}

type RowParticipacao = {
  membro_id: number;
  membro_nome: string;
  lider_nome: string;
  cuidador_nome: string | null;
};

function countByTipoStatus(
  rows: Array<{ tipo: number; status: number; _count: { _all: number } }>,
  tipo: number,
  status?: number,
) {
  return rows
    .filter((p) => p.tipo === tipo && (status === undefined || p.status === status))
    .reduce((sum, p) => sum + p._count._all, 0);
}

function mapParticipacaoRows(rows: RowParticipacao[]): ParticipacaoMembroItem[] {
  return rows.map((r) => ({
    membroId: r.membro_id,
    membroNome: r.membro_nome,
    liderNome: r.lider_nome,
    cuidadorNome: r.cuidador_nome,
  }));
}

async function listarPresentesPorTipo(
  accountId: number,
  dataInicio: Date,
  fimDia: Date,
  liderId: number | null,
  tipo: number,
): Promise<ParticipacaoMembroItem[]> {
  const rows = await prisma.$queryRaw<RowParticipacao[]>`
    SELECT DISTINCT ON (m.id)
      m.id AS membro_id,
      m.nome AS membro_nome,
      u.nome AS lider_nome,
      mc.nome AS cuidador_nome
    FROM presencas p
    INNER JOIN relatorios r ON r.id = p.relatorio_id
    INNER JOIN membros m ON m.id = p.membro_id
    INNER JOIN celulas c ON c.id = m.celula_id
    INNER JOIN usuarios u ON u.id = c.lider_id
    LEFT JOIN atribuicoes_cuidado ac ON ac.membro_id = m.id
    LEFT JOIN membros mc ON mc.id = ac.consolidador_id AND mc.ativo = true
    WHERE p.tipo = ${tipo}
      AND p.status = 1
      AND r.status = 1
      AND r.data_envio >= ${dataInicio}
      AND r.data_envio <= ${fimDia}
      AND c.account_id = ${accountId}
      AND c.ativo = true
      AND m.ativo = true
      AND (${liderId}::integer IS NULL OR c.lider_id = ${liderId})
    ORDER BY m.id, m.nome ASC
  `;

  return mapParticipacaoRows(rows).sort((a, b) =>
    a.membroNome.localeCompare(b.membroNome, 'pt-BR'),
  );
}

function montarListasRelatorios(
  celulasComLider: Array<{
    id: number;
    nome: string;
    liderId: number;
    lider: { nome: string };
  }>,
  celulasComRelatorioEnviado: Set<number>,
): { preencheram: LiderRelatorioItem[]; pendentes: LiderRelatorioItem[] } {
  const byLeader = new Map<
    number,
    { liderNome: string; celulas: string[]; temEnviado: boolean }
  >();

  for (const celula of celulasComLider) {
    const existing = byLeader.get(celula.liderId) ?? {
      liderNome: celula.lider.nome,
      celulas: [],
      temEnviado: false,
    };
    existing.celulas.push(celula.nome);
    if (celulasComRelatorioEnviado.has(celula.id)) {
      existing.temEnviado = true;
    }
    byLeader.set(celula.liderId, existing);
  }

  const preencheram: LiderRelatorioItem[] = [];
  const pendentes: LiderRelatorioItem[] = [];

  for (const [id, data] of byLeader) {
    const item: LiderRelatorioItem = {
      liderId: id,
      liderNome: data.liderNome,
      celulas: data.celulas.sort((a, b) => a.localeCompare(b, 'pt-BR')),
    };
    if (data.temEnviado) {
      preencheram.push(item);
    } else {
      pendentes.push(item);
    }
  }

  const byNome = (a: LiderRelatorioItem, b: LiderRelatorioItem) =>
    a.liderNome.localeCompare(b.liderNome, 'pt-BR');

  return {
    preencheram: preencheram.sort(byNome),
    pendentes: pendentes.sort(byNome),
  };
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
    presentesCulto,
    presentesCelula,
    celulasComLider,
    relatoriosEnviados,
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
    listarPresentesPorTipo(accountId, dataInicio, fimDia, liderId, 1),
    listarPresentesPorTipo(accountId, dataInicio, fimDia, liderId, 0),
    prisma.celula.findMany({
      where: celulaScope,
      select: {
        id: true,
        nome: true,
        liderId: true,
        lider: { select: { nome: true } },
      },
    }),
    prisma.relatorio.findMany({
      where: {
        status: 1,
        dataEnvio: { gte: dataInicio, lte: fimDia },
        celula: celulaScope,
      },
      select: { celulaId: true },
      distinct: ['celulaId'],
    }),
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

  const celulasComRelatorioEnviado = new Set(relatoriosEnviados.map((r) => r.celulaId));
  const listasRelatorios = montarListasRelatorios(celulasComLider, celulasComRelatorioEnviado);

  return {
    periodo: {
      inicio: dataInicio.toISOString().slice(0, 10),
      fim: dataFim.toISOString().slice(0, 10),
    },
    participacao: {
      totalMembros,
      culto: { presentes: presCult, total: totCult, percentual: pctCult },
      celula: { presentes: presCel, total: totCel, percentual: pctCel },
      listas: {
        culto: presentesCulto,
        celula: presentesCelula,
      },
    },
    relatorios: {
      lideresTotal,
      lideresPreencheram,
      pendentes,
      percentualAdesao,
      listas: listasRelatorios,
    },
    filtros: { liderId },
  };
}
