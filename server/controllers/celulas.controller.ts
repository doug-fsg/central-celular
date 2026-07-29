import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, format } from 'date-fns';
import { isPublicoCelula, PUBLICO_CELULA_LABELS, PUBLICO_CELULA_VALUES, type PublicoCelula } from '../constants/publicoCelula';
import { getAccountId, assertCelulaBelongsToAccount } from '../lib/tenant';

async function requireCelulaForAccount(req: Request, res: Response, celulaId: number) {
  const accountId = getAccountId(req);
  if (!accountId) {
    res.status(401).json({ message: 'Conta não identificada' });
    return null;
  }
  const check = await assertCelulaBelongsToAccount(celulaId, accountId);
  if (!check.ok) {
    res.status(404).json({ message: 'Célula não encontrada' });
    return null;
  }
  return { accountId, celula: check.celula };
}

function calcularSemanasDoMes(referencia: Date): Array<{ inicio: Date; fim: Date }> {
  const inicioMes = startOfMonth(referencia);
  const fimMes = endOfMonth(referencia);
  const semanas: Array<{ inicio: Date; fim: Date }> = [];
  let semanaAtual = startOfWeek(inicioMes, { weekStartsOn: 1 });

  for (let i = 0; i < 4; i++) {
    const fimSemana = endOfWeek(semanaAtual, { weekStartsOn: 1 });
    semanas.push({
      inicio: semanaAtual,
      fim: fimSemana > fimMes ? fimMes : fimSemana,
    });
    semanaAtual = addWeeks(semanaAtual, 1);
  }

  return semanas;
}

const publicoCelulaSchema = z.enum(PUBLICO_CELULA_VALUES);

type SortDirection = 'asc' | 'desc';

function buildCelulaOrderBy(sortBy: string, dir: SortDirection) {
  switch (sortBy) {
    case 'lider':
      return { lider: { nome: dir } };
    case 'nome':
      return { nome: dir };
    case 'publico':
      return { publico: dir };
    case 'supervisor':
      return { supervisor: { nome: dir } };
    case 'colider':
      return { coLider: { nome: dir } };
    case 'membros':
      return { membros: { _count: dir } };
    case 'dia':
      return { diaSemana: dir };
    case 'horario':
      return { horario: dir };
    case 'endereco':
      return { endereco: dir };
    case 'status':
      return { ativo: dir };
    default:
      return { nome: 'asc' as const };
  }
}

function buildMembroOrderBy(sortBy: string, dir: SortDirection) {
  switch (sortBy) {
    case 'nome':
      return { nome: dir };
    case 'celula':
      return { celula: { nome: dir } };
    case 'lider':
      return { celula: { lider: { nome: dir } } };
    case 'status':
      return { ativo: dir };
    default:
      return { nome: 'asc' as const };
  }
}

// Schema de validação para células
const celulaSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  publico: publicoCelulaSchema.optional().default('nao_informado'),
  endereco: z.string().optional(),
  diaSemana: z.string(), 
  horario: z.string(), 
  liderId: z.number(),
  coLiderId: z.number().optional(),
  supervisorId: z.number().optional(),
  regiaoId: z.number().optional()
});

// Schema para validação de membro
const membroSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  telefone: z.string().optional(),
  dataNascimento: z.string().optional()
    .refine(val => {
      if (!val) return true;
      
      // Extrai apenas a parte da data, removendo o timezone se existir
      const dataLimpa = val.split('T')[0];
      
      // Verifica se está no formato correto YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dataLimpa)) return false;
      
      const [year, month, day] = dataLimpa.split('-').map(Number);
      
      // Verifica se os números são válidos
      if (year < 1900 || year > 2100) return false;
      if (month < 1 || month > 12) return false;
      if (day < 1 || day > 31) return false;
      
      // Verifica se é uma data válida
      const date = new Date(year, month - 1, day);
      if (isNaN(date.getTime())) return false;
      
      // Verifica se os componentes da data correspondem ao que foi passado
      return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
      );
    }, 'Data de nascimento inválida')
    .transform(val => {
      if (!val) return null;
      // Retorna apenas a parte da data YYYY-MM-DD
      return val.split('T')[0];
    }),
  ehConsolidador: z.boolean().optional(),
  ehCoLider: z.boolean().optional(),
  ehAnfitriao: z.boolean().optional(),
  observacoes: z.string().optional()
});

// Listar células (com filtros e paginação)
export const listarCelulas = async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '10', lider, ativo, diaSemana, search, publico, sortBy, sortDir } = req.query;
    const perPage = Math.min(Math.max(1, Number(limit) || 10), 500);
    const currentPage = Math.max(1, Number(page) || 1);
    const skip = (currentPage - 1) * perPage;
    const direction = sortDir === 'desc' ? 'desc' : 'asc';

    const orderBy = buildCelulaOrderBy(
      typeof sortBy === 'string' ? sortBy : '',
      direction,
    );
    
    // Obter o accountId do usuário autenticado
    const accountId = (req as any).user?.accountId || (req as any).usuario?.accountId;
    
    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    // Construir where clause com os filtros
    const where: any = {
      accountId
    };
    
    if (lider) {
      where.liderId = Number(lider);
    }
    
    if (ativo !== undefined) {
      where.ativo = ativo === 'true';
    }
    
    if (diaSemana) {
      where.diaSemana = diaSemana as string;
    }

    if (typeof publico === 'string' && isPublicoCelula(publico)) {
      where.publico = publico;
    }

    const searchTerm = typeof search === 'string' ? search.trim() : '';
    if (searchTerm) {
      where.OR = [
        { nome: { contains: searchTerm, mode: 'insensitive' } },
        { endereco: { contains: searchTerm, mode: 'insensitive' } },
        { lider: { nome: { contains: searchTerm, mode: 'insensitive' } } },
        { supervisor: { nome: { contains: searchTerm, mode: 'insensitive' } } },
      ];
    }

    // Buscar total de registros, membros e página em paralelo
    const [total, totalMembros, semPublico, celulas] = await Promise.all([
      prisma.celula.count({ where }),
      prisma.membro.count({ where: { celula: where } }),
      prisma.celula.count({
        where: {
          accountId,
          ...(ativo !== undefined ? { ativo: ativo === 'true' } : {}),
          publico: 'nao_informado',
        },
      }),
      prisma.celula.findMany({
        where,
        include: {
          lider: {
            select: {
              id: true,
              nome: true,
              email: true,
              cargo: true
            }
          },
          coLider: {
            select: {
              id: true,
              nome: true,
              email: true,
              cargo: true
            }
          },
          supervisor: {
            select: {
              id: true,
              nome: true,
              email: true,
              cargo: true
            }
          },
          regiao: true,
          _count: {
            select: { membros: true }
          }
        },
        skip,
        take: perPage,
        orderBy,
      }),
    ]);

    // Retornar no formato esperado pelo frontend
    res.json({
      celulas,
      pagination: {
        total,
        pages: Math.ceil(total / perPage),
        currentPage,
        perPage,
      },
      totais: {
        celulas: total,
        membros: totalMembros,
        semPublico,
      },
    });
  } catch (error) {
    console.error('Erro ao listar células:', error);
    res.status(500).json({ 
      celulas: [],
      pagination: {
        total: 0,
        pages: 0,
        currentPage: 1,
        perPage: 10
      },
      totais: {
        celulas: 0,
        membros: 0,
        semPublico: 0,
      },
    });
  }
};

// Status de relatórios enviados por célula e semana do mês (bulk)
export const statusRelatoriosCelulas = async (req: Request, res: Response) => {
  try {
    const { ids, mes, ano } = req.query;
    const accountId = (req as any).user?.accountId || (req as any).usuario?.accountId;

    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    if (!ids || typeof ids !== 'string' || !ids.trim()) {
      return res.status(400).json({ message: 'Parâmetro ids é obrigatório' });
    }

    const celulaIds = ids
      .split(',')
      .map((id) => Number(id.trim()))
      .filter((id) => !isNaN(id) && id > 0);

    if (celulaIds.length === 0) {
      return res.status(400).json({ message: 'Nenhum ID de célula válido' });
    }

    const celulasValidas = await prisma.celula.findMany({
      where: { id: { in: celulaIds }, accountId },
      select: { id: true },
    });

    if (celulasValidas.length !== celulaIds.length) {
      return res.status(403).json({ message: 'Uma ou mais células não pertencem à sua conta' });
    }

    const hoje = new Date();
    const referencia =
      mes !== undefined && ano !== undefined
        ? new Date(Number(ano), Number(mes) - 1, 1)
        : hoje;

    const semanas = calcularSemanasDoMes(referencia);
    const porCelula: Record<string, boolean[]> = {};

    for (const id of celulaIds) {
      porCelula[String(id)] = [false, false, false, false];
    }

    const relatorios = await prisma.relatorio.findMany({
      where: {
        celulaId: { in: celulaIds },
        dataInicio: { gte: semanas[0].inicio },
        dataFim: { lte: semanas[3].fim },
      },
      select: { celulaId: true, dataInicio: true, dataFim: true, status: true },
    });

    for (const rel of relatorios) {
      if (rel.status !== 1) continue;

      for (let i = 0; i < semanas.length; i++) {
        const semana = semanas[i];
        if (rel.dataInicio >= semana.inicio && rel.dataFim <= semana.fim) {
          porCelula[String(rel.celulaId)][i] = true;
          break;
        }
      }
    }

    res.json({
      semanas: semanas.map((s) => format(s.inicio, 'yyyy-MM-dd')),
      porCelula,
    });
  } catch (error) {
    console.error('Erro ao obter status de relatórios:', error);
    res.status(500).json({ message: 'Erro ao obter status de relatórios' });
  }
};

// Obter célula por ID
export const obterCelula = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Obter o accountId do usuário autenticado
    const accountId = (req as any).user?.accountId || (req as any).usuario?.accountId;
    
    if (!accountId) {
      console.error('[obterCelula] accountId não encontrado no token');
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    console.log('[obterCelula] Buscando célula:', { id, accountId });

    const celula = await prisma.celula.findFirst({
      where: { 
        id: Number(id),
        accountId
      },
      include: {
        lider: {
          select: {
            id: true,
            nome: true,
            cargo: true
          }
        },
        coLider: {
          select: {
            id: true,
            nome: true,
            cargo: true
          }
        },
        regiao: true,
        membros: {
          select: {
            id: true,
            nome: true,
            telefone: true,
            dataNascimento: true,
            ehConsolidador: true,
            ehCoLider: true,
            ehAnfitriao: true,
            ativo: true,
            observacoes: true,
            dataCadastro: true
          }
        }
      }
    });

    if (!celula) {
      console.log('[obterCelula] Célula não encontrada:', { id, accountId });
      return res.status(404).json({ message: 'Célula não encontrada' });
    }

    console.log('[obterCelula] Célula encontrada:', celula.id);
    res.json(celula);
  } catch (error) {
    console.error('Erro ao obter célula:', error);
    res.status(500).json({ message: 'Erro ao obter célula' });
  }
};

// Criar célula
export const criarCelula = async (req: Request, res: Response) => {
  try {
    const data = celulaSchema.parse(req.body);
    
    // Obter o accountId do usuário autenticado
    const accountId = (req as any).user?.accountId || (req as any).usuario?.accountId;
    
    if (!accountId) {
      console.error('[criarCelula] accountId não encontrado no token');
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    // Verificar se o líder existe e pertence à mesma conta
    const lider = await prisma.usuario.findFirst({
      where: { 
        id: data.liderId,
        accountId // Adicionar accountId ao filtro
      }
    });

    if (!lider) {
      return res.status(400).json({ message: 'Líder não encontrado ou não pertence à sua conta' });
    }

    // Verificar co-líder se fornecido
    if (data.coLiderId) {
      const colider = await prisma.usuario.findFirst({
        where: { 
          id: data.coLiderId,
          accountId // Adicionar accountId ao filtro
        }
      });

      if (!colider) {
        return res.status(400).json({ message: 'Co-líder não encontrado ou não pertence à sua conta' });
      }
    }

    // Verificar supervisor se fornecido
    if (data.supervisorId) {
      const supervisor = await prisma.usuario.findFirst({
        where: { 
          id: data.supervisorId,
          accountId, // Adicionar accountId ao filtro
          cargo: 'SUPERVISOR'
        }
      });

      if (!supervisor) {
        return res.status(400).json({ message: 'Supervisor não encontrado ou não pertence à sua conta' });
      }
    }

    // Verificar região se fornecida
    if (data.regiaoId) {
      const regiao = await prisma.regiao.findUnique({
        where: { id: data.regiaoId }
      });

      if (!regiao) {
        return res.status(400).json({ message: 'Região não encontrada' });
      }
    }

    // Criar célula com accountId
    const novaCelula = await prisma.celula.create({
      data: {
        ...data,
        accountId, // Adicionar accountId
        ativo: true
      },
      include: {
        lider: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        },
        coLider: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        },
        regiao: true
      }
    });

    res.status(201).json(novaCelula);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    
    console.error('Erro ao criar célula:', error);
    res.status(500).json({ message: 'Erro ao criar célula' });
  }
};

// Atualizar célula
export const atualizarCelula = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const accountId = getAccountId(req);
    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    const celulaCheck = await assertCelulaBelongsToAccount(Number(id), accountId);
    if (!celulaCheck.ok) {
      return res.status(404).json({ message: 'Célula não encontrada' });
    }

    const data = celulaSchema.parse(req.body);
    const celulaExistente = celulaCheck.celula;

    // Verificar se o líder existe
    const lider = await prisma.usuario.findUnique({
      where: { id: data.liderId }
    });

    if (!lider) {
      return res.status(400).json({ message: 'Líder não encontrado' });
    }

    const cargo = ((req as any).usuario?.cargo ?? '').toUpperCase();
    const isAdminUser =
      cargo === 'PASTOR' || (req as any).user?.isSuperAdmin === true;
    const updateData = { ...data };
    if (!isAdminUser) {
      updateData.publico = celulaExistente.publico;
    }

    // Verificar co-líder se fornecido
    if (data.coLiderId) {
      const colider = await prisma.usuario.findUnique({
        where: { id: data.coLiderId }
      });

      if (!colider) {
        return res.status(400).json({ message: 'Co-líder não encontrado' });
      }
    }

    const celulaAtualizada = await prisma.celula.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        lider: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        },
        coLider: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        },
        regiao: true
      }
    });

    res.json(celulaAtualizada);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    
    console.error('Erro ao atualizar célula:', error);
    res.status(500).json({ message: 'Erro ao atualizar célula' });
  }
};

// Desativar/ativar célula
export const desativarCelula = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const accountId = getAccountId(req);
    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    const celulaCheck = await assertCelulaBelongsToAccount(Number(id), accountId);
    if (!celulaCheck.ok) {
      return res.status(404).json({ message: 'Célula não encontrada' });
    }

    const { ativo } = req.body;

    const celulaAtualizada = await prisma.celula.update({
      where: { id: Number(id) },
      data: { ativo: ativo === true || ativo === 'true' }
    });

    res.json({
      message: celulaAtualizada.ativo ? 'Célula ativada com sucesso' : 'Célula desativada com sucesso',
      ativo: celulaAtualizada.ativo
    });
  } catch (error) {
    console.error('Erro ao atualizar status da célula:', error);
    res.status(500).json({ message: 'Erro ao atualizar status da célula' });
  }
};

// Deletar célula permanentemente
export const deletarCelula = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const celulaId = Number(id);
    const accountId = getAccountId(req);
    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    const celulaCheck = await assertCelulaBelongsToAccount(celulaId, accountId);
    if (!celulaCheck.ok) {
      return res.status(404).json({ message: 'Célula não encontrada' });
    }

    // Deletar célula e todos os dados relacionados em uma transação
    await prisma.$transaction(async (tx) => {
      // 1) Deletar relatórios (presenças cairão por cascade via onDelete: Cascade em Presenca.relatorio)
      await tx.relatorio.deleteMany({ where: { celulaId } });

      // 2) Deletar membros (presenças já foram deletadas acima)
      await tx.membro.deleteMany({ where: { celulaId } });

      // 3) Deletar a célula
      await tx.celula.delete({ where: { id: celulaId } });
    });

    res.json({ message: 'Célula excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar célula:', error);
    res.status(500).json({ message: 'Erro ao deletar célula' });
  }
};

// Adicionar membro
export const adicionarMembro = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const celulaId = Number(id);
    const scope = await requireCelulaForAccount(req, res, celulaId);
    if (!scope) return;

    console.log('[adicionarMembro] Dados recebidos:', req.body);
    
    const data = membroSchema.parse(req.body);
    console.log('[adicionarMembro] Dados após parse:', data);
    console.log('[adicionarMembro] Data de nascimento:', {
      original: req.body.dataNascimento,
      parsed: data.dataNascimento,
      type: data.dataNascimento ? typeof data.dataNascimento : 'null/undefined'
    });

    // Adicionar novo membro usando executeRaw para contornar o problema temporário com o modelo não reconhecido
    console.log('[adicionarMembro] Executando query SQL com params:', {
      celulaId,
      nome: data.nome,
      telefone: data.telefone,
      dataNascimento: data.dataNascimento,
      ehConsolidador: data.ehConsolidador || false,
      ehCoLider: data.ehCoLider || false,
      ehAnfitriao: data.ehAnfitriao || false,
      observacoes: data.observacoes
    });

    const novoMembro = await prisma.$queryRaw`
      INSERT INTO membros (
        celula_id, 
        nome, 
        telefone, 
        data_nascimento,
        eh_consolidador, 
        eh_colider, 
        eh_anfitriao, 
        observacoes
      )
      VALUES (
        ${Number(id)},
        ${data.nome},
        ${data.telefone},
        ${data.dataNascimento}::date,
        ${data.ehConsolidador || false},
        ${data.ehCoLider || false},
        ${data.ehAnfitriao || false},
        ${data.observacoes}
      )
      RETURNING *
    `;

    console.log('[adicionarMembro] Membro criado:', novoMembro);
    res.status(201).json(Array.isArray(novoMembro) ? novoMembro[0] : novoMembro);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[adicionarMembro] Erro de validação:', error.errors);
      return res.status(400).json({ errors: error.errors });
    }
    
    console.error('[adicionarMembro] Erro ao adicionar membro:', error);
    res.status(500).json({ message: 'Erro ao adicionar membro' });
  }
};

// Mover membro para outra célula
export const moverMembro = async (req: Request, res: Response) => {
  try {
    const { id, membroId } = req.params;
    const celulaOrigemId = Number(id);
    const celulaDestinoId = Number(req.body.celulaDestinoId);
    const accountId = getAccountId(req);

    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    if (!celulaDestinoId || Number.isNaN(celulaDestinoId)) {
      return res.status(400).json({ message: 'Célula de destino inválida' });
    }

    if (celulaOrigemId === celulaDestinoId) {
      return res.status(400).json({ message: 'A célula de destino deve ser diferente da atual' });
    }

    const [origemCheck, destinoCheck] = await Promise.all([
      assertCelulaBelongsToAccount(celulaOrigemId, accountId),
      assertCelulaBelongsToAccount(celulaDestinoId, accountId),
    ]);

    if (!origemCheck.ok || !destinoCheck.ok) {
      return res.status(404).json({ message: 'Célula não encontrada' });
    }

    const [membro] = await Promise.all([
      prisma.$queryRaw<{ id: number }[]>`
        SELECT id FROM membros
        WHERE id = ${Number(membroId)} AND celula_id = ${celulaOrigemId} AND ativo = true
        LIMIT 1
      `,
    ]);

    if (!Array.isArray(membro) || membro.length === 0) {
      return res.status(404).json({ message: 'Membro não encontrado nesta célula' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        DELETE FROM atribuicoes_cuidado
        WHERE membro_id = ${Number(membroId)} AND celula_id = ${celulaOrigemId}
      `;

      await tx.$executeRaw`
        UPDATE membros
        SET celula_id = ${celulaDestinoId}
        WHERE id = ${Number(membroId)} AND celula_id = ${celulaOrigemId}
      `;
    });

    const membroAtualizado = await prisma.$queryRaw`
      SELECT * FROM membros WHERE id = ${Number(membroId)}
    `;

    res.json(Array.isArray(membroAtualizado) ? membroAtualizado[0] : membroAtualizado);
  } catch (error) {
    console.error('Erro ao mover membro:', error);
    res.status(500).json({ message: 'Erro ao mover membro' });
  }
};

// Remover membro (deletar permanentemente)
export const removerMembro = async (req: Request, res: Response) => {
  try {
    const { id, membroId } = req.params;
    const scope = await requireCelulaForAccount(req, res, Number(id));
    if (!scope) return;

    // Verificar se o membro existe na célula
    const membro = await prisma.$queryRaw`
      SELECT * FROM membros 
      WHERE id = ${Number(membroId)} 
      AND celula_id = ${Number(id)}
    `;

    if (Array.isArray(membro) && membro.length === 0) {
      return res.status(404).json({ message: 'Membro não encontrado nesta célula' });
    }

    // Primeiro deletar todas as presenças do membro
    await prisma.$executeRaw`
      DELETE FROM presencas 
      WHERE membro_id = ${Number(membroId)}
    `;

    // Depois deletar o membro
    await prisma.$executeRaw`
      DELETE FROM membros 
      WHERE id = ${Number(membroId)}
    `;

    res.status(200).json({ message: 'Membro removido permanentemente' });
  } catch (error) {
    console.error('Erro ao remover membro:', error);
    res.status(500).json({ message: 'Erro ao remover membro' });
  }
};

// Ativar/Desativar membro
export const toggleAtivoMembro = async (req: Request, res: Response) => {
  try {
    const { id, membroId } = req.params;
    const { ativo } = req.body;
    const scope = await requireCelulaForAccount(req, res, Number(id));
    if (!scope) return;

    if (typeof ativo !== 'boolean') {
      return res.status(400).json({ message: 'Valor inválido para ativo' });
    }

    // Verificar se o membro existe na célula
    const membro = await prisma.$queryRaw`
      SELECT * FROM membros 
      WHERE id = ${Number(membroId)} 
      AND celula_id = ${Number(id)}
    `;

    if (Array.isArray(membro) && membro.length === 0) {
      return res.status(404).json({ message: 'Membro não encontrado nesta célula' });
    }

    // Atualizar status do membro
    await prisma.$executeRaw`
      UPDATE membros 
      SET ativo = ${ativo} 
      WHERE id = ${Number(membroId)}
    `;

    res.status(200).json({ 
      message: ativo ? 'Membro ativado com sucesso' : 'Membro desativado com sucesso',
      ativo 
    });
  } catch (error) {
    console.error('Erro ao atualizar status do membro:', error);
    res.status(500).json({ message: 'Erro ao atualizar status do membro' });
  }
};

// Atualizar status do membro
export const atualizarStatusMembro = async (req: Request, res: Response) => {
  try {
    const { id, membroId } = req.params;
    const { ativo } = req.body;
    const scope = await requireCelulaForAccount(req, res, Number(id));
    if (!scope) return;

    if (typeof ativo !== 'boolean') {
      return res.status(400).json({ message: 'Status inválido' });
    }

    // Verificar se o membro existe na célula
    const membro = await prisma.$queryRaw`
      SELECT * FROM membros 
      WHERE id = ${Number(membroId)} 
      AND celula_id = ${Number(id)}
    `;

    if (Array.isArray(membro) && membro.length === 0) {
      return res.status(404).json({ message: 'Membro não encontrado nesta célula' });
    }

    const membroAtualizado = await prisma.$executeRaw`
      UPDATE membros 
      SET ativo = ${ativo} 
      WHERE id = ${Number(membroId)}
    `;

    res.json({ id: Number(membroId), ativo });
  } catch (error) {
    console.error('Erro ao atualizar status do membro:', error);
    res.status(500).json({ message: 'Erro ao atualizar status do membro' });
  }
};

// Marcar membro como consolidador
export const marcarComoConsolidador = async (req: Request, res: Response) => {
  try {
    const { id, membroId } = req.params;
    const { ehConsolidador } = req.body;
    const scope = await requireCelulaForAccount(req, res, Number(id));
    if (!scope) return;

    if (typeof ehConsolidador !== 'boolean') {
      return res.status(400).json({ message: 'Valor inválido' });
    }

    // Verificar se o membro existe na célula
    const membro = await prisma.$queryRaw`
      SELECT * FROM membros 
      WHERE id = ${Number(membroId)} 
      AND celula_id = ${Number(id)}
    `;

    if (Array.isArray(membro) && membro.length === 0) {
      return res.status(404).json({ message: 'Membro não encontrado nesta célula' });
    }

    const membroAtualizado = await prisma.$executeRaw`
      UPDATE membros 
      SET eh_consolidador = ${ehConsolidador} 
      WHERE id = ${Number(membroId)}
    `;

    res.json({ id: Number(membroId), ehConsolidador });
  } catch (error) {
    console.error('Erro ao marcar membro como consolidador:', error);
    res.status(500).json({ message: 'Erro ao atualizar status de consolidador' });
  }
};

// Marcar membro como co-líder
export const marcarComoCoLider = async (req: Request, res: Response) => {
  try {
    const { id, membroId } = req.params;
    const { ehCoLider } = req.body;
    const scope = await requireCelulaForAccount(req, res, Number(id));
    if (!scope) return;

    if (typeof ehCoLider !== 'boolean') {
      return res.status(400).json({ message: 'Valor inválido' });
    }

    // Verificar se o membro existe na célula
    const membro = await prisma.$queryRaw`
      SELECT * FROM membros 
      WHERE id = ${Number(membroId)} 
      AND celula_id = ${Number(id)}
    `;

    if (Array.isArray(membro) && membro.length === 0) {
      return res.status(404).json({ message: 'Membro não encontrado nesta célula' });
    }

    const membroAtualizado = await prisma.$executeRaw`
      UPDATE membros 
      SET eh_colider = ${ehCoLider} 
      WHERE id = ${Number(membroId)}
    `;

    res.json({ id: Number(membroId), ehCoLider });
  } catch (error) {
    console.error('Erro ao marcar membro como co-líder:', error);
    res.status(500).json({ message: 'Erro ao atualizar status de co-líder' });
  }
};

// Marcar membro como anfitrião
export const marcarComoAnfitriao = async (req: Request, res: Response) => {
  try {
    const { id, membroId } = req.params;
    const { ehAnfitriao } = req.body;
    const scope = await requireCelulaForAccount(req, res, Number(id));
    if (!scope) return;

    if (typeof ehAnfitriao !== 'boolean') {
      return res.status(400).json({ message: 'Valor inválido' });
    }

    // Verificar se o membro existe na célula
    const membro = await prisma.$queryRaw`
      SELECT * FROM membros 
      WHERE id = ${Number(membroId)} 
      AND celula_id = ${Number(id)}
    `;

    if (Array.isArray(membro) && membro.length === 0) {
      return res.status(404).json({ message: 'Membro não encontrado nesta célula' });
    }

    const membroAtualizado = await prisma.$executeRaw`
      UPDATE membros 
      SET eh_anfitriao = ${ehAnfitriao} 
      WHERE id = ${Number(membroId)}
    `;

    res.json({ id: Number(membroId), ehAnfitriao });
  } catch (error) {
    console.error('Erro ao marcar membro como anfitrião:', error);
    res.status(500).json({ message: 'Erro ao atualizar status de anfitrião' });
  }
};

// Atualizar membro
export const atualizarMembro = async (req: Request, res: Response) => {
  try {
    const { id, membroId } = req.params;
    const scope = await requireCelulaForAccount(req, res, Number(id));
    if (!scope) return;

    console.log('[atualizarMembro] Dados recebidos:', req.body);
    
    const data = membroSchema.parse(req.body);
    console.log('[atualizarMembro] Dados após parse:', data);
    console.log('[atualizarMembro] Data de nascimento:', {
      original: req.body.dataNascimento,
      parsed: data.dataNascimento,
      type: data.dataNascimento ? typeof data.dataNascimento : 'null/undefined'
    });

    // Verificar se o membro existe na célula
    const membro = await prisma.$queryRaw`
      SELECT * FROM membros 
      WHERE id = ${Number(membroId)} 
      AND celula_id = ${Number(id)}
    `;

    if (Array.isArray(membro) && membro.length === 0) {
      return res.status(404).json({ message: 'Membro não encontrado nesta célula' });
    }

    // Atualizar membro usando executeRaw para contornar o problema temporário com o modelo não reconhecido
    const membroAtualizado = await prisma.$queryRaw`
      UPDATE membros 
      SET 
        nome = ${data.nome},
        telefone = ${data.telefone},
        data_nascimento = ${data.dataNascimento}::date,
        eh_consolidador = ${data.ehConsolidador || false},
        eh_colider = ${data.ehCoLider || false},
        eh_anfitriao = ${data.ehAnfitriao || false},
        observacoes = ${data.observacoes}
      WHERE id = ${Number(membroId)} AND celula_id = ${Number(id)}
      RETURNING *
    `;

    // Buscar o membro atualizado para retornar
    const membroRetorno = await prisma.$queryRaw`
      SELECT * FROM membros 
      WHERE id = ${Number(membroId)}
    `;

    res.json(Array.isArray(membroRetorno) ? membroRetorno[0] : membroRetorno);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[atualizarMembro] Erro de validação:', error.errors);
      return res.status(400).json({ errors: error.errors });
    }
    
    console.error('[atualizarMembro] Erro ao atualizar membro:', error);
    res.status(500).json({ message: 'Erro ao atualizar membro' });
  }
}; 

// Listar membros de uma célula
export const listarMembros = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const scope = await requireCelulaForAccount(req, res, Number(id));
    if (!scope) return;

    const celula = await prisma.celula.findFirst({
      where: { id: Number(id), accountId: scope.accountId },
      include: {
        membros: {
          where: { ativo: true },
          orderBy: { nome: 'asc' }
        }
      }
    });

    if (!celula) {
      return res.status(404).json({ message: 'Célula não encontrada' });
    }

    res.json(celula.membros);
  } catch (error) {
    console.error('Erro ao listar membros:', error);
    res.status(500).json({ message: 'Erro ao listar membros' });
  }
};

// Listar todos os membros (admin) com paginação
export const listarTodosMembros = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const perPage = Math.min(Math.max(1, Number(req.query.limit) || 20), 500);
    const currentPage = Math.max(1, page);
    const skip = (currentPage - 1) * perPage;
    const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : '';
    const sortDir = req.query.sortDir === 'desc' ? 'desc' : 'asc';
    const searchTerm = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const orderBy = buildMembroOrderBy(sortBy, sortDir);

    // Obter o accountId do usuário autenticado
    const accountId = (req as any).user?.accountId || (req as any).usuario?.accountId;
    
    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    const where: any = {
      celula: {
        accountId: accountId
      }
    };

    if (searchTerm) {
      where.OR = [
        { nome: { contains: searchTerm, mode: 'insensitive' } },
        { telefone: { contains: searchTerm, mode: 'insensitive' } },
        { celula: { nome: { contains: searchTerm, mode: 'insensitive' } } },
        { celula: { lider: { nome: { contains: searchTerm, mode: 'insensitive' } } } },
      ];
    }

    // Buscar total de membros filtrado por accountId (através das células)
    const total = await prisma.membro.count({ where });

    // Buscar membros com paginação, incluindo celula e lider
    const membros = await prisma.membro.findMany({
      where,
      include: {
        celula: {
          select: {
            id: true,
            nome: true,
            lider: {
              select: {
                id: true,
                nome: true
              }
            }
          }
        }
      },
      orderBy,
      skip,
      take: perPage
    });

    // Formatar resposta
    const membrosFormatados = membros.map(membro => ({
      id: membro.id,
      nome: membro.nome,
      telefone: membro.telefone,
      celulaId: membro.celulaId,
      ativo: membro.ativo,
      ehConsolidador: membro.ehConsolidador,
      ehCoLider: membro.ehCoLider,
      ehAnfitriao: membro.ehAnfitriao,
      celula: {
        id: membro.celula.id,
        nome: membro.celula.nome,
        lider: membro.celula.lider ? {
          id: membro.celula.lider.id,
          nome: membro.celula.lider.nome
        } : null
      }
    }));

    res.json({
      membros: membrosFormatados,
      pagination: {
        total,
        pages: Math.ceil(total / perPage),
        currentPage,
        perPage,
      }
    });
  } catch (error) {
    console.error('Erro ao listar todos os membros:', error);
    res.status(500).json({ message: 'Erro ao listar membros' });
  }
};

function csvEscape(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Exportar células e status de relatórios do mês (CSV)
export const exportarCelulasCsv = async (req: Request, res: Response) => {
  try {
    const accountId = (req as any).user?.accountId || (req as any).usuario?.accountId;
    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    const { publico, mes, ano, diaSemana, search } = req.query;
    const where: any = { accountId, ativo: true };

    if (typeof publico === 'string' && isPublicoCelula(publico)) {
      where.publico = publico;
    }
    if (typeof diaSemana === 'string' && diaSemana.trim()) {
      where.diaSemana = diaSemana;
    }
    const searchTerm = typeof search === 'string' ? search.trim() : '';
    if (searchTerm) {
      where.OR = [
        { nome: { contains: searchTerm, mode: 'insensitive' } },
        { endereco: { contains: searchTerm, mode: 'insensitive' } },
        { lider: { nome: { contains: searchTerm, mode: 'insensitive' } } },
      ];
    }

    const hoje = new Date();
    const referencia =
      mes !== undefined && ano !== undefined
        ? new Date(Number(ano), Number(mes) - 1, 1)
        : hoje;
    const semanas = calcularSemanasDoMes(referencia);

    const celulas = await prisma.celula.findMany({
      where,
      include: {
        lider: { select: { nome: true } },
        _count: { select: { membros: true } },
      },
      orderBy: { nome: 'asc' },
    });

    const relatorios = celulas.length
      ? await prisma.relatorio.findMany({
          where: {
            celulaId: { in: celulas.map((c) => c.id) },
            dataInicio: { gte: semanas[0].inicio },
            dataFim: { lte: semanas[3].fim },
            status: 1,
          },
          select: { celulaId: true, dataInicio: true, dataFim: true },
        })
      : [];

    const statusPorCelula = new Map<number, boolean[]>();
    for (const celula of celulas) {
      statusPorCelula.set(celula.id, [false, false, false, false]);
    }
    for (const rel of relatorios) {
      const arr = statusPorCelula.get(rel.celulaId);
      if (!arr) continue;
      for (let i = 0; i < semanas.length; i++) {
        const semana = semanas[i];
        if (rel.dataInicio >= semana.inicio && rel.dataFim <= semana.fim) {
          arr[i] = true;
          break;
        }
      }
    }

    const header = [
      'Célula',
      'Público',
      'Líder',
      'Dia',
      'Horário',
      'Endereço',
      'Membros',
      'Semana 1',
      'Semana 2',
      'Semana 3',
      'Semana 4',
    ];

    const rows = celulas.map((celula) => {
      const status = statusPorCelula.get(celula.id) || [false, false, false, false];
      return [
        celula.nome,
        PUBLICO_CELULA_LABELS[celula.publico as PublicoCelula] ?? celula.publico,
        celula.lider?.nome ?? '',
        celula.diaSemana,
        celula.horario,
        celula.endereco ?? '',
        celula._count.membros,
        status[0] ? 'Enviado' : 'Pendente',
        status[1] ? 'Enviado' : 'Pendente',
        status[2] ? 'Enviado' : 'Pendente',
        status[3] ? 'Enviado' : 'Pendente',
      ]
        .map(csvEscape)
        .join(',');
    });

    const csv = '\uFEFF' + [header.join(','), ...rows].join('\n');
    const filename = `celulas-${format(referencia, 'yyyy-MM')}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error) {
    console.error('Erro ao exportar células:', error);
    res.status(500).json({ message: 'Erro ao exportar células' });
  }
};