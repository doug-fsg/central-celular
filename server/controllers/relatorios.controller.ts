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
                const presentes = await prisma.presenca.count({
                    where: { 
                        relatorioId: rel.id,
                        status: 1,
                    },
                });
                const { _count, ...resto } = rel;
                return {
                    ...resto,
                    presentes,
                    total: _count.presencas,
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
                relatorioId_membroId: {
                    relatorioId: Number(id),
                    membroId: membro.id,
                },
            },
            update: { status: Number(status) },
            create: {
                relatorioId: Number(id),
                membroId: membro.id,
                status: Number(status),
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