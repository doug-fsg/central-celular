import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Estendendo o tipo Request para incluir o usuário autenticado
interface AuthRequest extends Request {
  auth: {
    id: number;
    email: string;
    cargo: string;
  };
}

// Listar relatórios com base em célula e período
export const listarRelatorios = async (req: Request, res: Response) => {
    try {
        const { celulaId, dataInicio, dataFim, evento } = req.query;

        if (!celulaId || !dataInicio || !dataFim) {
            return res.status(400).json({ message: 'Parâmetros celulaId, dataInicio e dataFim são obrigatórios' });
        }

        const inicio = new Date(dataInicio as string);
        const fim = new Date(dataFim as string);

        const whereClause = {
            celulaId: Number(celulaId),
            dataInicio: {
                gte: inicio,
            },
            dataFim: {
                lte: fim,
            },
            ...(evento !== undefined ? { evento: Number(evento) } : {}),
        };

        const relatorios = await prisma.relatorio.findMany({
            where: whereClause,
            include: {
                celula: { select: { nome: true } },
                _count: { select: { presencas: true } },
            },
            orderBy: { dataInicio: 'asc' },
        });

        const relatoriosComContagem = await Promise.all(
            relatorios.map(async (rel) => {
                // Contagens por tipo (0 = célula, 1 = culto)
                const [
                  presentesCelula,
                  totalCelula,
                  presentesCulto,
                  totalCulto,
                ] = await Promise.all([
                  prisma.presenca.count({ where: { relatorioId: rel.id, status: 1, tipo: 0 } }),
                  prisma.presenca.count({ where: { relatorioId: rel.id,             tipo: 0 } }),
                  prisma.presenca.count({ where: { relatorioId: rel.id, status: 1, tipo: 1 } }),
                  prisma.presenca.count({ where: { relatorioId: rel.id,             tipo: 1 } }),
                ]);

                const { _count, ...resto } = rel;
                return {
                    ...resto,
                    // Mantém campos antigos para compatibilidade
                    presentes: presentesCelula + presentesCulto,
                    total: _count.presencas,
                    // Novos campos específicos por tipo
                    presentesCelula,
                    totalCelula,
                    presentesCulto,
                    totalCulto,
                };
            })
        );

        res.json(relatoriosComContagem);
    } catch (error) {
        console.error('Erro ao listar relatórios:', error);
        res.status(500).json({ message: 'Erro ao listar relatórios' });
    }
};

// Obter um único relatório por ID
export const obterRelatorio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
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
    const { celulaId, dataInicio, dataFim, evento, teveCelula, observacoes } = req.body;

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
    const { id } = req.params;
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
    const { id } = req.params; // Pegar o ID do relatório da URL
    const { membroId, status, tipo = 0 } = req.body;

    // Validar tipo
    const tipoNum = Number(tipo);
    if (tipoNum !== 0 && tipoNum !== 1) {
      return res.status(400).json({ message: 'Tipo de presença inválido. Use 0 para célula ou 1 para culto.' });
    }

    // Verificar se o relatório existe
    const relatorio = await prisma.relatorio.findUnique({
      where: { id: Number(id) }
    });

    if (!relatorio) {
      return res.status(404).json({ message: 'Relatório não encontrado' });
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
    const { id } = req.params;
    const { status } = req.body;

    const relatorio = await prisma.relatorio.findUnique({
      where: { id: Number(id) },
      select: { celula: { select: { membros: { where: { ativo: true } } } } },
    });

    if (!relatorio) {
      return res.status(404).json({ message: 'Relatório não encontrado' });
    }

    const membros = relatorio.celula.membros;

    const operacoes = membros.map(membro => 
        prisma.presenca.upsert({
            where: {
                relatorioId_membroId_tipo: {
                    relatorioId: Number(id),
                    membroId: membro.id,
                    tipo: 0, // Célula por padrão
                },
            },
            update: { status: Number(status) },
            create: {
                relatorioId: Number(id),
                membroId: membro.id,
                status: Number(status),
                tipo: 0, // Célula por padrão
            },
        })
    );

    await prisma.$transaction(operacoes);

    res.json({ message: 'Presenças atualizadas com sucesso' });
  } catch (error) {
    console.error('Erro ao marcar todos os membros:', error);
    res.status(500).json({ message: 'Erro ao marcar todos os membros' });
  }
};

// Enviar o relatório (mudar status para "enviado")
export const enviarRelatorio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const relatorio = await prisma.relatorio.findUnique({
      where: { id: Number(id) },
      include: {
        presencas: { select: { membroId: true } },
        celula: { select: { membros: { where: { ativo: true }, select: { id: true } } } },
      },
    });

    if (!relatorio) {
      return res.status(404).json({ message: 'Relatório não encontrado' });
    }

    if (relatorio.status === 1) { // 1 = Enviado
      return res.status(400).json({ message: 'Este relatório já foi enviado' });
    }

    const membrosAtivosIds = new Set(relatorio.celula.membros.map(m => m.id));
    const membrosComPresencaIds = new Set(relatorio.presencas.map(p => p.membroId));

    const membrosSemPresenca = [...membrosAtivosIds].filter(id => !membrosComPresencaIds.has(id));
    
    if (membrosSemPresenca.length > 0) {
      const operacoes = membrosSemPresenca.map(membroId => 
        prisma.presenca.create({
          data: {
            relatorioId: Number(id),
            membroId: membroId,
            status: 0, // Ausente
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
    const { dataInicio, dataFim, celulaId } = req.query;

    console.log('[DEBUG] obterFrequenciaPorData - Parâmetros:', { dataInicio, dataFim, celulaId });

    if (!dataInicio || !dataFim) {
      return res.status(400).json({ message: 'Parâmetros dataInicio e dataFim são obrigatórios' });
    }

    const inicio = new Date(dataInicio as string);
    const fim = new Date(dataFim as string);

    console.log('[DEBUG] obterFrequenciaPorData - Datas convertidas:', { inicio, fim });

    // Primeiro vamos verificar se há relatórios de qualquer status
    const todosRelatorios = await prisma.relatorio.findMany({
      where: {
        dataInicio: { gte: inicio },
        dataFim: { lte: fim }
      },
      select: { id: true, status: true, evento: true, dataInicio: true, celulaId: true }
    });

    console.log('[DEBUG] obterFrequenciaPorData - Todos os relatórios:', todosRelatorios);

    const whereClause: any = {
      // Apenas relatórios enviados (status = 1)
      status: 1,
      // Filtrar relatórios cuja dataInicio esteja dentro do período
      dataInicio: { 
        gte: inicio,
        lte: fim
      }
    };

    // Filtrar por célula específica se fornecido
    if (celulaId) {
      whereClause.celulaId = Number(celulaId);
    }

    console.log('[DEBUG] obterFrequenciaPorData - Where clause:', whereClause);

    const relatorios = await prisma.relatorio.findMany({
      where: whereClause,
      include: {
        celula: { select: { nome: true } },
        presencas: true
      },
      orderBy: { dataInicio: 'asc' }
    });

    console.log('[DEBUG] obterFrequenciaPorData - Relatórios encontrados:', relatorios.length);

    // Agrupar dados por data
    const dadosPorData = new Map();

    for (const relatorio of relatorios) {
      const dataKey = relatorio.dataInicio.toISOString().split('T')[0];
      
      if (!dadosPorData.has(dataKey)) {
        dadosPorData.set(dataKey, {
          data: dataKey,
          celula: { presentes: 0, total: 0 },
          culto: { presentes: 0, total: 0 }
        });
      }

      const dadosData = dadosPorData.get(dataKey);
      
      // Contar presenças por tipo (independente do evento do relatório)
      // Um relatório pode ter presenças de ambos os tipos (célula e culto)
      const presencasCelula = relatorio.presencas.filter(p => p.tipo === 0);
      const presencasCulto = relatorio.presencas.filter(p => p.tipo === 1);

      // Contar presenças de célula (tipo === 0)
      dadosData.celula.presentes += presencasCelula.filter(p => p.status === 1).length;
      dadosData.celula.total += presencasCelula.length;

      // Contar presenças de culto (tipo === 1)
      dadosData.culto.presentes += presencasCulto.filter(p => p.status === 1).length;
      dadosData.culto.total += presencasCulto.length;
    }

    // Converter para array e ordenar por data
    const resultado = Array.from(dadosPorData.values()).map(dados => ({
      data: dados.data,
      formatDate: new Date(dados.data).toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
      }),
      celula: dados.celula.presentes,
      culto: dados.culto.presentes,
      totalCelula: dados.celula.total,
      totalCulto: dados.culto.total
    })).sort((a, b) => a.data.localeCompare(b.data));

    console.log('[DEBUG] obterFrequenciaPorData - Resultado final:', resultado);
    console.log('[DEBUG] obterFrequenciaPorData - Enviando resposta...');

    res.json(resultado);
  } catch (error) {
    console.error('Erro ao obter frequência por data:', error);
    res.status(500).json({ message: 'Erro ao obter frequência por data' });
  }
};

// Obter estatísticas de uma célula
export const obterEstatisticas = async (req: Request, res: Response) => {
  try {
    const { celulaId } = req.params;

    const celula = await prisma.celula.findUnique({
      where: { id: Number(celulaId) },
      include: { _count: { select: { membros: { where: { ativo: true } } } } },
    });

    if (!celula) {
      return res.status(404).json({ message: 'Célula não encontrada' });
    }

    const totalMembros = celula._count.membros;
    if (totalMembros === 0) {
      return res.json({ totalMembros: 0, presencaCelula: 0, presencaCulto: 0, taxaPresenca: 0 });
    }

    const tresMesesAtras = new Date();
    tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);

    const relatorios = await prisma.relatorio.findMany({
      where: {
        celulaId: Number(celulaId),
        status: 1, // Enviado
        dataInicio: { gte: tresMesesAtras },
      },
      include: {
        _count: {
          select: {
            presencas: { where: { status: 1 } },
          },
        },
      },
    });
    
    const relatoriosCelula = relatorios.filter(r => r.evento === 0);
    const relatoriosCulto = relatorios.filter(r => r.evento === 1);
    
    let presencaCelula = 0;
    if (relatoriosCelula.length > 0) {
      const totalPresencasCelula = relatoriosCelula.reduce((acc, rel) => acc + rel._count.presencas, 0);
      const totalPossivelPresencas = relatoriosCelula.length * totalMembros;
      presencaCelula = totalPossivelPresencas > 0 ? Math.round((totalPresencasCelula / totalPossivelPresencas) * 100) : 0;
    }
    
    let presencaCulto = 0;
    if (relatoriosCulto.length > 0) {
      const totalPresencasCulto = relatoriosCulto.reduce((acc, rel) => acc + rel._count.presencas, 0);
      const totalPossivelPresencas = relatoriosCulto.length * totalMembros;
      presencaCulto = totalPossivelPresencas > 0 ? Math.round((totalPresencasCulto / totalPossivelPresencas) * 100) : 0;
    }
    
    const taxaPresenca = relatorios.length > 0 
      ? Math.round((presencaCelula * relatoriosCelula.length + presencaCulto * relatoriosCulto.length) / relatorios.length) 
      : 0;

    res.json({
      totalMembros,
      presencaCelula,
      presencaCulto,
      taxaPresenca,
    });
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ message: 'Erro ao obter estatísticas' });
  }
};

// Obter últimos relatórios de um membro específico
export const obterFrequenciaMembro = async (req: Request, res: Response) => {
  try {
    const { membroId, celulaId } = req.params;

    if (!membroId || !celulaId) {
      return res.status(400).json({ message: 'Parâmetros membroId e celulaId são obrigatórios' });
    }

    // Buscar os últimos 4 relatórios enviados da célula (de ambos os tipos)
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
      const presenca = rel.presencas.find(p => p.membroId === Number(membroId));
      const presente = presenca ? presenca.status === 1 : false;

      if (rel.evento === 0) {
        periodo.celula = {
          id: rel.id,
          dataEnvio: rel.dataEnvio,
          presente: presente,
        };
      } else {
        periodo.culto = {
          id: rel.id,
          dataEnvio: rel.dataEnvio,
          presente: presente,
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