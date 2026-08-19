import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import {
  getAccountId,
  assertCelulaBelongsToAccount,
  assertRelatorioBelongsToAccount,
} from '../lib/tenant';
import { relatorioService } from '../services/relatorioService';

// Listar relatórios com base em célula e período
export const listarRelatorios = async (req: Request, res: Response) => {
    try {
        const accountId = getAccountId(req);
        if (!accountId) {
            return res.status(401).json({ message: 'Conta não identificada' });
        }

        const { celulaId, dataInicio, dataFim, evento } = req.query;

        if (!celulaId || !dataInicio || !dataFim) {
            return res.status(400).json({ message: 'Parâmetros celulaId, dataInicio e dataFim são obrigatórios' });
        }

        const celulaCheck = await assertCelulaBelongsToAccount(Number(celulaId), accountId);
        if (!celulaCheck.ok) {
            return res.status(404).json({ message: 'Célula não encontrada' });
        }

        const relatoriosComContagem = await relatorioService.listarComContagens({
            celulaId: Number(celulaId),
            dataInicio: new Date(dataInicio as string),
            dataFim: new Date(dataFim as string),
            evento: evento !== undefined ? Number(evento) : undefined,
        });

        res.json(relatoriosComContagem);
    } catch (error) {
        console.error('Erro ao listar relatórios:', error);
        res.status(500).json({ message: 'Erro ao listar relatórios' });
    }
};

// Obter um único relatório por ID
export const obterRelatorio = async (req: Request, res: Response) => {
  try {
    const accountId = getAccountId(req);
    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    const { id } = req.params;
    const relatorioCheck = await assertRelatorioBelongsToAccount(Number(id), accountId);
    if (!relatorioCheck.ok) {
      return res.status(404).json({ message: 'Relatório não encontrado' });
    }

    const relatorio = await prisma.relatorio.findUnique({
      where: { id: Number(id) },
      include: {
        celula: {
          select: {
            id: true,
            nome: true,
            membros: { where: { ativo: true }, orderBy: { nome: 'asc' } },
          },
        },
        presencas: true,
      },
    });

    if (!relatorio) {
      return res.status(404).json({ message: 'Relatório não encontrado' });
    }
    
    const membrosComPresenca = relatorio.celula.membros.map(membro => {
        const presenca = relatorio.presencas.find(p => p.membroId === membro.id);
        return {
            ...membro,
            status: presenca?.status,
        };
    });
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { celula, ...restoDoRelatorio } = relatorio;

    res.json({ ...restoDoRelatorio, membros: membrosComPresenca });

  } catch (error) {
    console.error('Erro ao obter relatório:', error);
    res.status(500).json({ message: 'Erro ao obter relatório' });
  }
};

// Criar um novo relatório
export const criarRelatorio = async (req: Request, res: Response) => {
  try {
    const accountId = getAccountId(req);
    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    const { celulaId, dataInicio, dataFim, evento, teveCelula, observacoes } = req.body;

    const celulaCheck = await assertCelulaBelongsToAccount(Number(celulaId), accountId);
    if (!celulaCheck.ok) {
      return res.status(404).json({ message: 'Célula não encontrada' });
    }

    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

    const relatorioExistente = await prisma.relatorio.findFirst({
      where: {
        celulaId: Number(celulaId),
        dataInicio: inicio,
        dataFim: fim,
        evento: Number(evento),
      },
    });

    if(relatorioExistente) {
      return res.status(409).json({ message: "Já existe um relatório para esta semana e tipo de evento.", relatorio: relatorioExistente });
    }

    const novoRelatorio = await prisma.relatorio.create({
      data: {
        celulaId: Number(celulaId),
        dataInicio: inicio,
        dataFim: fim,
        evento: Number(evento),
        status: 0, // Rascunho
        teveCelula: teveCelula !== undefined ? teveCelula : true,
        observacoes,
      },
    });

    res.status(201).json(novoRelatorio);
  } catch (error) {
    console.error('Erro ao criar relatório:', error);
    res.status(500).json({ message: 'Erro ao criar relatório' });
  }
};

// Atualizar observações de um relatório
export const atualizarRelatorio = async (req: Request, res: Response) => {
  try {
    const accountId = getAccountId(req);
    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    const { id } = req.params;
    const relatorioCheck = await assertRelatorioBelongsToAccount(Number(id), accountId);
    if (!relatorioCheck.ok) {
      return res.status(404).json({ message: 'Relatório não encontrado' });
    }

    const { observacoes, teveCelula } = req.body;
    
    const relatorioAtualizado = await prisma.relatorio.update({
      where: { id: Number(id) },
      data: { 
        observacoes,
        ...(teveCelula !== undefined ? { teveCelula } : {})
      },
    });

    res.json(relatorioAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar relatório:', error);
    res.status(500).json({ message: 'Erro ao atualizar relatório' });
  }
};

// Registrar ou atualizar presença de um membro
export const registrarPresenca = async (req: Request, res: Response) => {
  try {
    const accountId = getAccountId(req);
    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    const { id } = req.params;
    const relatorioCheck = await assertRelatorioBelongsToAccount(Number(id), accountId);
    if (!relatorioCheck.ok) {
      return res.status(404).json({ message: 'Relatório não encontrado' });
    }

    const { membroId, status, tipo = 0 } = req.body;

    const tipoNum = Number(tipo);
    if (tipoNum !== 0 && tipoNum !== 1) {
      return res.status(400).json({ message: 'Tipo de presença inválido. Use 0 para célula ou 1 para culto.' });
    }

    if (membroId === undefined || status === undefined) {
      return res.status(400).json({ message: 'membroId e status são obrigatórios' });
    }

    const membro = await prisma.membro.findFirst({
      where: {
        id: Number(membroId),
        celulaId: relatorioCheck.relatorio.celulaId,
        ativo: true,
      },
    });

    if (!membro) {
      return res.status(404).json({ message: 'Membro não encontrado nesta célula' });
    }

    // Usar INSERT ... ON CONFLICT para garantir a atomicidade da operação (evita duplicatas)
    const presenca = await prisma.$queryRaw`
      INSERT INTO presencas (relatorio_id, membro_id, status, tipo)
      VALUES (${Number(id)}, ${Number(membroId)}, ${Number(status)}, ${tipoNum})
      ON CONFLICT (relatorio_id, membro_id, tipo) 
      DO UPDATE SET status = ${Number(status)}
      RETURNING *
    `;

    res.status(201).json(Array.isArray(presenca) ? presenca[0] : presenca);
  } catch (error) {
    console.error('Erro ao registrar presença:', error);
    res.status(500).json({ message: 'Erro ao registrar presença' });
  }
};

// Marcar todos os membros de um relatório com um status (presente/ausente)
export const marcarTodosMembros = async (req: Request, res: Response) => {
  try {
    const accountId = getAccountId(req);
    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    const { id } = req.params;
    const relatorioCheck = await assertRelatorioBelongsToAccount(Number(id), accountId);
    if (!relatorioCheck.ok) {
      return res.status(404).json({ message: 'Relatório não encontrado' });
    }

    const { status, tipo } = req.body;

    if (status === undefined) {
      return res.status(400).json({ message: 'status é obrigatório' });
    }

    const relatorio = await prisma.relatorio.findUnique({
      where: { id: Number(id) },
      select: { evento: true, celula: { select: { membros: { where: { ativo: true } } } } },
    });

    if (!relatorio) {
      return res.status(404).json({ message: 'Relatório não encontrado' });
    }

    const tipoPresenca = tipo !== undefined ? Number(tipo) : relatorio.evento;
    if (tipoPresenca !== 0 && tipoPresenca !== 1) {
      return res.status(400).json({ message: 'Tipo de presença inválido' });
    }

    const membros = relatorio.celula.membros;
    const relatorioId = Number(id);
    const statusNum = Number(status);
    const membroIds = membros.map((m) => m.id);

    if (membroIds.length > 0) {
      await prisma.$executeRaw`
        INSERT INTO presencas (relatorio_id, membro_id, status, tipo)
        SELECT ${relatorioId}, unnest(${membroIds}::int[]), ${statusNum}, ${tipoPresenca}
        ON CONFLICT (relatorio_id, membro_id, tipo)
        DO UPDATE SET status = ${statusNum}
      `;
    }

    res.json({ message: 'Presenças atualizadas com sucesso' });
  } catch (error) {
    console.error('Erro ao marcar todos os membros:', error);
    res.status(500).json({ message: 'Erro ao marcar todos os membros' });
  }
};

// Enviar o relatório (mudar status para "enviado")
export const enviarRelatorio = async (req: Request, res: Response) => {
  try {
    const accountId = getAccountId(req);
    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    const { id } = req.params;
    const relatorioCheck = await assertRelatorioBelongsToAccount(Number(id), accountId);
    if (!relatorioCheck.ok) {
      return res.status(404).json({ message: 'Relatório não encontrado' });
    }

    const relatorio = await prisma.relatorio.findUnique({
      where: { id: Number(id) },
      include: {
        presencas: { select: { membroId: true, tipo: true } },
        celula: { select: { membros: { where: { ativo: true }, select: { id: true } } } },
      },
    });

    if (!relatorio) {
      return res.status(404).json({ message: 'Relatório não encontrado' });
    }

    if (relatorio.status === 1) {
      return res.status(400).json({ message: 'Este relatório já foi enviado' });
    }

    const tipoEsperado = relatorio.evento;
    const membrosAtivosIds = new Set(relatorio.celula.membros.map(m => m.id));
    const membrosComPresencaIds = new Set(
      relatorio.presencas
        .filter((p) => p.tipo === tipoEsperado)
        .map((p) => p.membroId),
    );

    const membrosSemPresenca = [...membrosAtivosIds].filter(id => !membrosComPresencaIds.has(id));
    
    if (membrosSemPresenca.length > 0) {
      const operacoes = membrosSemPresenca.map(membroId => 
        prisma.presenca.create({
          data: {
            relatorioId: Number(id),
            membroId: membroId,
            status: 0,
            tipo: tipoEsperado,
          },
        })
      );
      await prisma.$transaction(operacoes);
    }

    const relatorioAtualizado = await prisma.relatorio.update({
      where: { id: Number(id) },
      data: {
        status: 1, // Enviado
        dataEnvio: new Date(),
      },
    });

    res.json(relatorioAtualizado);
  } catch (error) {
    console.error('Erro ao enviar relatório:', error);
    res.status(500).json({ message: 'Erro ao enviar relatório' });
  }
};

// Obter relatório de frequência por data (Célula x Culto)
export const obterFrequenciaPorData = async (req: Request, res: Response) => {
  try {
    const accountId = getAccountId(req);
    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    const { dataInicio, dataFim, celulaId } = req.query;

    if (!dataInicio || !dataFim) {
      return res.status(400).json({ message: 'Parâmetros dataInicio e dataFim são obrigatórios' });
    }

    if (celulaId) {
      const celulaCheck = await assertCelulaBelongsToAccount(Number(celulaId), accountId);
      if (!celulaCheck.ok) {
        return res.status(404).json({ message: 'Célula não encontrada' });
      }
    }

    const inicio = new Date(dataInicio as string);
    const fim = new Date(dataFim as string);

    const celulaFilter = celulaId ? Number(celulaId) : null;

    const rows = await prisma.$queryRaw<
      Array<{
        data_key: string;
        celula_presentes: number;
        celula_total: number;
        culto_presentes: number;
        culto_total: number;
      }>
    >`
      SELECT
        r.data_inicio::date::text AS data_key,
        COALESCE(SUM(CASE WHEN p.tipo = 0 AND p.status = 1 THEN 1 ELSE 0 END), 0)::int AS celula_presentes,
        COALESCE(SUM(CASE WHEN p.tipo = 0 THEN 1 ELSE 0 END), 0)::int AS celula_total,
        COALESCE(SUM(CASE WHEN p.tipo = 1 AND p.status = 1 THEN 1 ELSE 0 END), 0)::int AS culto_presentes,
        COALESCE(SUM(CASE WHEN p.tipo = 1 THEN 1 ELSE 0 END), 0)::int AS culto_total
      FROM relatorios r
      INNER JOIN presencas p ON p.relatorio_id = r.id
      WHERE r.status = 1
        AND r.data_inicio >= ${inicio}
        AND r.data_inicio <= ${fim}
        AND (${celulaFilter}::integer IS NULL OR r.celula_id = ${celulaFilter})
      GROUP BY r.data_inicio::date
      ORDER BY r.data_inicio::date ASC
    `;

    const resultado = rows.map((row) => ({
      data: row.data_key,
      formatDate: new Date(row.data_key).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      }),
      celula: row.celula_presentes,
      culto: row.culto_presentes,
      totalCelula: row.celula_total,
      totalCulto: row.culto_total,
    }));

    res.json(resultado);
  } catch (error) {
    console.error('Erro ao obter frequência por data:', error);
    res.status(500).json({ message: 'Erro ao obter frequência por data' });
  }
};

// Obter estatísticas de uma célula
export const obterEstatisticas = async (req: Request, res: Response) => {
  try {
    const accountId = getAccountId(req);
    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    const { celulaId } = req.params;

    const celulaCheck = await assertCelulaBelongsToAccount(Number(celulaId), accountId);
    if (!celulaCheck.ok) {
      return res.status(404).json({ message: 'Célula não encontrada' });
    }

    const celula = await prisma.celula.findUnique({
      where: { id: Number(celulaId), accountId },
      include: { _count: { select: { membros: { where: { ativo: true } } } } },
    });

    if (!celula) {
      return res.status(404).json({ message: 'Célula não encontrada' });
    }

    const totalMembros = celula._count.membros;
    const vazioSemanal = {
      ultimaSemana: 0,
      penultimaSemana: 0,
      media: 0,
    };
    if (totalMembros === 0) {
      return res.json({
        totalMembros: 0,
        presencaCelula: 0,
        presencaCulto: 0,
        taxaPresenca: 0,
        celula: { ...vazioSemanal },
        culto: { ...vazioSemanal },
        series: [] as number[],
        seriesSemanas: [] as string[],
      });
    }

    const tresMesesAtras = new Date();
    tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);

    const celId = Number(celulaId);

    type AggRow = {
      total_rel_celula: number;
      total_rel_culto: number;
      presentes_celula: number;
      presentes_culto: number;
      possiveis_celula: number;
      possiveis_culto: number;
    };

    type WeekRow = {
      semana_inicio: string;
      evento: number;
      presentes: number;
      total: number;
    };

    const [aggRows, weekRows] = await Promise.all([
      prisma.$queryRaw<AggRow[]>`
        SELECT
          COUNT(DISTINCT CASE WHEN r.evento = 0 THEN r.id END)::int AS total_rel_celula,
          COUNT(DISTINCT CASE WHEN r.evento = 1 THEN r.id END)::int AS total_rel_culto,
          COALESCE(SUM(CASE WHEN p.tipo = 0 AND p.status = 1 THEN 1 ELSE 0 END), 0)::int AS presentes_celula,
          COALESCE(SUM(CASE WHEN p.tipo = 1 AND p.status = 1 THEN 1 ELSE 0 END), 0)::int AS presentes_culto,
          COALESCE(SUM(CASE WHEN p.tipo = 0 THEN 1 ELSE 0 END), 0)::int AS possiveis_celula,
          COALESCE(SUM(CASE WHEN p.tipo = 1 THEN 1 ELSE 0 END), 0)::int AS possiveis_culto
        FROM relatorios r
        LEFT JOIN presencas p ON p.relatorio_id = r.id
        WHERE r.celula_id = ${celId}
          AND r.status = 1
          AND r.data_inicio >= ${tresMesesAtras}
      `,
      prisma.$queryRaw<WeekRow[]>`
        SELECT
          to_char(date_trunc('week', r.data_inicio), 'YYYY-MM-DD') AS semana_inicio,
          r.evento,
          COALESCE(SUM(CASE WHEN p.status = 1 THEN 1 ELSE 0 END), 0)::int AS presentes,
          COUNT(p.id)::int AS total
        FROM relatorios r
        LEFT JOIN presencas p ON p.relatorio_id = r.id AND p.tipo = r.evento
        WHERE r.celula_id = ${celId}
          AND r.status = 1
          AND r.data_inicio >= ${tresMesesAtras}
        GROUP BY date_trunc('week', r.data_inicio), r.evento
        ORDER BY semana_inicio ASC
      `,
    ]);

    const agg = aggRows[0] ?? {
      total_rel_celula: 0, total_rel_culto: 0,
      presentes_celula: 0, presentes_culto: 0,
      possiveis_celula: 0, possiveis_culto: 0,
    };

    const possiveisCel = agg.total_rel_celula * totalMembros;
    const possiveisCul = agg.total_rel_culto * totalMembros;
    const presencaCelula = possiveisCel > 0 ? Math.round((agg.presentes_celula / possiveisCel) * 100) : 0;
    const presencaCulto = possiveisCul > 0 ? Math.round((agg.presentes_culto / possiveisCul) * 100) : 0;
    const totalRel = agg.total_rel_celula + agg.total_rel_culto;
    const taxaPresenca = totalRel > 0
      ? Math.round((presencaCelula * agg.total_rel_celula + presencaCulto * agg.total_rel_culto) / totalRel)
      : 0;

    function buildWeekStats(rows: WeekRow[], evento: number) {
      const filtered = rows.filter((r) => r.evento === evento);
      const series = filtered.map((r) => (r.total > 0 ? Math.round((r.presentes / r.total) * 100) : 0));
      const semanasInicioISO = filtered.map((r) => r.semana_inicio);
      const n = series.length;
      return {
        ultimaSemana: n > 0 ? series[n - 1] : 0,
        penultimaSemana: n > 1 ? series[n - 2] : 0,
        media: n > 0 ? Math.round(series.reduce((s, v) => s + v, 0) / n) : 0,
        series,
        semanasInicioISO,
      };
    }

    const statsCelula = buildWeekStats(weekRows, 0);
    const statsCulto = buildWeekStats(weekRows, 1);

    res.json({
      totalMembros,
      presencaCelula,
      presencaCulto,
      taxaPresenca,
      celula: {
        ultimaSemana: statsCelula.ultimaSemana,
        penultimaSemana: statsCelula.penultimaSemana,
        media: statsCelula.media,
      },
      culto: {
        ultimaSemana: statsCulto.ultimaSemana,
        penultimaSemana: statsCulto.penultimaSemana,
        media: statsCulto.media,
      },
      series: statsCelula.series,
      seriesSemanas: statsCelula.semanasInicioISO,
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ message: 'Erro ao obter estatísticas' });
  }
};

// Obter últimos relatórios de um membro específico
export const obterFrequenciaMembro = async (req: Request, res: Response) => {
  try {
    const accountId = getAccountId(req);
    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    const { membroId, celulaId } = req.params;

    if (!membroId || !celulaId) {
      return res.status(400).json({ message: 'Parâmetros membroId e celulaId são obrigatórios' });
    }

    const celulaCheck = await assertCelulaBelongsToAccount(Number(celulaId), accountId);
    if (!celulaCheck.ok) {
      return res.status(404).json({ message: 'Célula não encontrada' });
    }

    const relatorios = await prisma.relatorio.findMany({
      where: {
        celulaId: Number(celulaId),
        status: 1, // Apenas relatórios enviados
      },
      include: {
        presencas: {
          where: {
            membroId: Number(membroId),
          },
        },
      },
      orderBy: {
        dataEnvio: 'desc',
      },
      take: 8, // Buscar mais para ter relatórios de ambos os tipos
    });

    // Agrupar por período (dataInicio + dataFim) e tipo
    const relatoriosPorPeriodo = new Map<string, { celula?: any; culto?: any }>();

    relatorios.forEach(rel => {
      const chave = `${rel.dataInicio.toISOString()}_${rel.dataFim.toISOString()}`;
      if (!relatoriosPorPeriodo.has(chave)) {
        relatoriosPorPeriodo.set(chave, {});
      }
      
      const periodo = relatoriosPorPeriodo.get(chave)!;
      
      // Buscar presenças por tipo (não por evento do relatório)
      const presencaCelula = rel.presencas.find(p => p.membroId === Number(membroId) && p.tipo === 0);
      const presencaCulto = rel.presencas.find(p => p.membroId === Number(membroId) && p.tipo === 1);
      
      const presenteCelula = presencaCelula ? presencaCelula.status === 1 : false;
      const presenteCulto = presencaCulto ? presencaCulto.status === 1 : false;

      // Atualizar período com presenças de célula e culto (se existirem)
      if (presencaCelula !== undefined) {
        periodo.celula = {
          id: rel.id,
          dataEnvio: rel.dataEnvio,
          presente: presenteCelula,
        };
      }
      
      if (presencaCulto !== undefined) {
        periodo.culto = {
          id: rel.id,
          dataEnvio: rel.dataEnvio,
          presente: presenteCulto,
        };
      }
    });

    // Converter para array e pegar os últimos 4 períodos
    const frequencia = Array.from(relatoriosPorPeriodo.entries())
      .slice(0, 4)
      .map(([chave, periodo]) => {
        const [dataInicioStr, dataFimStr] = chave.split('_');
        return {
          dataInicio: new Date(dataInicioStr),
          dataFim: new Date(dataFimStr),
          dataEnvio: periodo.celula?.dataEnvio || periodo.culto?.dataEnvio,
          presenteCelula: periodo.celula?.presente ?? false,
          presenteCulto: periodo.culto?.presente ?? false,
        };
      });

    res.json(frequencia);
  } catch (error) {
    console.error('Erro ao obter frequência do membro:', error);
    res.status(500).json({ message: 'Erro ao obter frequência do membro' });
  }
}; 