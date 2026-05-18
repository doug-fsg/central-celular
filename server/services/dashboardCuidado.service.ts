import { prisma } from '../lib/prisma';
import {
  COBERTURA_BAIXA_PCT,
  LIMITE_FEED_MEMBROS,
  MAX_CUIDADOS_POR_CONSOLIDADOR,
  SEMAFORO_CRITICO_LT,
  SEMAFORO_OK_GTE,
} from '../constants/dashboardCuidado.constants';

export type StatusSemafaro = 'ok' | 'atencao' | 'critico';

export interface DashboardCuidadoResponse {
  resumo: {
    totalCelulas: number;
    totalMembros: number;
    comCuidador: number;
    semCuidador: number;
    percentualCobertura: number;
    statusSemafaro: StatusSemafaro;
    consolidadoresSobrecarregados: number;
  };
  celulas: Array<{
    celulaId: number;
    nome: string;
    liderNome: string;
    totalMembros: number;
    comCuidador: number;
    semCuidador: number;
    percentualCobertura: number;
    qtdConsolidadores: number;
  }>;
  alertas: {
    membrosSemCuidador: Array<{
      membroId: number;
      nome: string;
      celulaId: number;
      celulaNome: string;
    }>;
    celulasBaixaCobertura: Array<{
      celulaId: number;
      nome: string;
      percentualCobertura: number;
      semCuidador: number;
    }>;
    consolidadoresSobrecarregados: Array<{
      consolidadorId: number;
      nome: string;
      celulaId: number;
      celulaNome: string;
      qtdCuidados: number;
    }>;
  };
  filtros: {
    liderId: number | null;
  };
}

function calcularStatusSemafaro(
  percentualCobertura: number,
  qtdSobrecarga: number,
): StatusSemafaro {
  if (percentualCobertura < SEMAFORO_CRITICO_LT) return 'critico';
  if (percentualCobertura < SEMAFORO_OK_GTE || qtdSobrecarga > 0) return 'atencao';
  return 'ok';
}

interface RowQ1 {
  celula_id: number;
  celula_nome: string;
  lider_nome: string;
  total_membros: number;
  com_cuidador: number;
  qtd_consolidadores: number;
}

interface RowQ2 {
  id: number;
  nome: string;
  celula_id: number;
  celula_nome: string;
}

interface RowQ3 {
  consolidador_id: number;
  consolidador_nome: string;
  celula_id: number;
  celula_nome: string;
  qtd_cuidados: number;
}

export async function montarDashboardCuidado(
  accountId: number,
  liderId: number | null,
): Promise<DashboardCuidadoResponse> {
  const lid = liderId ?? null;

  const [rowsQ1, rowsQ2, rowsQ3] = await Promise.all([
    prisma.$queryRaw<RowQ1[]>`
      SELECT
        c.id AS celula_id,
        c.nome AS celula_nome,
        u.nome AS lider_nome,
        COUNT(m.id)::int AS total_membros,
        COUNT(ac.id)::int AS com_cuidador,
        SUM(CASE WHEN m.eh_consolidador THEN 1 ELSE 0 END)::int AS qtd_consolidadores
      FROM celulas c
      INNER JOIN usuarios u ON u.id = c.lider_id
      LEFT JOIN membros m ON m.celula_id = c.id AND m.ativo = true
      LEFT JOIN atribuicoes_cuidado ac ON ac.membro_id = m.id
      WHERE c.account_id = ${accountId}
        AND c.ativo = true
        AND (${lid}::integer IS NULL OR c.lider_id = ${lid})
      GROUP BY c.id, c.nome, u.nome
      ORDER BY c.nome ASC
    `,
    prisma.$queryRaw<RowQ2[]>`
      SELECT m.id, m.nome, c.id AS celula_id, c.nome AS celula_nome
      FROM membros m
      INNER JOIN celulas c ON c.id = m.celula_id
      LEFT JOIN atribuicoes_cuidado ac ON ac.membro_id = m.id
      WHERE c.account_id = ${accountId}
        AND c.ativo = true
        AND m.ativo = true
        AND ac.id IS NULL
        AND (${lid}::integer IS NULL OR c.lider_id = ${lid})
      ORDER BY c.nome ASC, m.nome ASC
      LIMIT ${LIMITE_FEED_MEMBROS}
    `,
    prisma.$queryRaw<RowQ3[]>`
      SELECT
        ac.consolidador_id AS consolidador_id,
        mc.nome AS consolidador_nome,
        c.id AS celula_id,
        c.nome AS celula_nome,
        COUNT(*)::int AS qtd_cuidados
      FROM atribuicoes_cuidado ac
      INNER JOIN membros mc ON mc.id = ac.consolidador_id AND mc.ativo = true AND mc.eh_consolidador = true
      INNER JOIN celulas c ON c.id = ac.celula_id AND c.ativo = true
      WHERE c.account_id = ${accountId}
        AND ac.consolidador_id IS NOT NULL
        AND (${lid}::integer IS NULL OR c.lider_id = ${lid})
      GROUP BY ac.consolidador_id, mc.nome, c.id, c.nome
      HAVING COUNT(*) > ${MAX_CUIDADOS_POR_CONSOLIDADOR}
      ORDER BY qtd_cuidados DESC
    `,
  ]);

  const celulas = rowsQ1.map((r) => {
    const totalMembros = r.total_membros;
    const comCuidador = r.com_cuidador;
    const semCuidador = Math.max(0, totalMembros - comCuidador);
    const percentualCobertura =
      totalMembros > 0 ? Math.round((comCuidador / totalMembros) * 100) : 100;

    return {
      celulaId: r.celula_id,
      nome: r.celula_nome,
      liderNome: r.lider_nome,
      totalMembros,
      comCuidador,
      semCuidador,
      percentualCobertura,
      qtdConsolidadores: r.qtd_consolidadores,
    };
  });

  const sortedCelulas = [...celulas].sort(
    (a, b) => a.percentualCobertura - b.percentualCobertura || a.nome.localeCompare(b.nome, 'pt-BR'),
  );

  let totalMembros = 0;
  let comCuidador = 0;
  for (const c of celulas) {
    totalMembros += c.totalMembros;
    comCuidador += c.comCuidador;
  }
  const semCuidador = Math.max(0, totalMembros - comCuidador);
  const percentualCobertura =
    totalMembros > 0 ? Math.round((comCuidador / totalMembros) * 100) : 100;

  const qtdSobrecarga = rowsQ3.length;
  const statusSemafaro = calcularStatusSemafaro(percentualCobertura, qtdSobrecarga);

  const celulasBaixaCobertura = celulas
    .filter((c) => c.totalMembros > 0 && c.percentualCobertura < COBERTURA_BAIXA_PCT)
    .map((c) => ({
      celulaId: c.celulaId,
      nome: c.nome,
      percentualCobertura: c.percentualCobertura,
      semCuidador: c.semCuidador,
    }))
    .sort((a, b) => a.percentualCobertura - b.percentualCobertura);

  const consolidadoresSobrecarregados = rowsQ3.map((r) => ({
    consolidadorId: r.consolidador_id,
    nome: r.consolidador_nome,
    celulaId: r.celula_id,
    celulaNome: r.celula_nome,
    qtdCuidados: r.qtd_cuidados,
  }));

  const membrosSemCuidador = rowsQ2.map((r) => ({
    membroId: r.id,
    nome: r.nome,
    celulaId: r.celula_id,
    celulaNome: r.celula_nome,
  }));

  return {
    resumo: {
      totalCelulas: celulas.length,
      totalMembros,
      comCuidador,
      semCuidador,
      percentualCobertura,
      statusSemafaro,
      consolidadoresSobrecarregados: qtdSobrecarga,
    },
    celulas: sortedCelulas,
    alertas: {
      membrosSemCuidador,
      celulasBaixaCobertura,
      consolidadoresSobrecarregados,
    },
    filtros: {
      liderId: liderId ?? null,
    },
  };
}

/** Valida que o líder existe em ao menos uma célula ativa da account */
export async function liderPertenceAccount(
  accountId: number,
  liderId: number,
): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ n: number }[]>`
    SELECT 1::int AS n
    FROM celulas c
    WHERE c.account_id = ${accountId}
      AND c.ativo = true
      AND c.lider_id = ${liderId}
    LIMIT 1
  `;
  return rows.length > 0;
}
