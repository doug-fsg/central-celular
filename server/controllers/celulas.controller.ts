import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// Schema de validação para células
const celulaSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
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
    const { page = '1', limit = '10', lider, ativo } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
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

    // Buscar total de registros com filtros
    const total = await prisma.celula.count({ where });

    // Buscar células com paginação e filtros
    const celulas = await prisma.celula.findMany({
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
        regiao: true,
        _count: {
          select: { membros: true }
        }
      },
      skip,
      take: Number(limit),
      orderBy: {
        nome: 'asc'
      }
    });

    // Retornar no formato esperado pelo frontend
    res.json({
      celulas,
      pagination: {
        total,
        pages: Math.ceil(total / Number(limit)),
        currentPage: Number(page),
        perPage: Number(limit)
      }
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
      }
    });
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
    const data = celulaSchema.parse(req.body);

    // Verificar se a célula existe
    const celulaExistente = await prisma.celula.findUnique({
      where: { id: Number(id) }
    });

    if (!celulaExistente) {
      return res.status(404).json({ message: 'Célula não encontrada' });
    }

    // Verificar se o líder existe
    const lider = await prisma.usuario.findUnique({
      where: { id: data.liderId }
    });

    if (!lider) {
      return res.status(400).json({ message: 'Líder não encontrado' });
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
      data,
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
    const { ativo } = req.body;

    // Verificar se a célula existe
    const celulaExistente = await prisma.celula.findUnique({
      where: { id: Number(id) }
    });

    if (!celulaExistente) {
      return res.status(404).json({ message: 'Célula não encontrada' });
    }

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

// Adicionar membro
export const adicionarMembro = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // ID da célula
    console.log('[adicionarMembro] Dados recebidos:', req.body);
    
    const data = membroSchema.parse(req.body);
    console.log('[adicionarMembro] Dados após parse:', data);
    console.log('[adicionarMembro] Data de nascimento:', {
      original: req.body.dataNascimento,
      parsed: data.dataNascimento,
      type: data.dataNascimento ? typeof data.dataNascimento : 'null/undefined'
    });

    // Verificar se a célula existe
    const celula = await prisma.celula.findUnique({
      where: { id: Number(id) }
    });

    if (!celula) {
      return res.status(404).json({ message: 'Célula não encontrada' });
    }

    // Adicionar novo membro usando executeRaw para contornar o problema temporário com o modelo não reconhecido
    console.log('[adicionarMembro] Executando query SQL com params:', {
      celulaId: Number(id),
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

// Remover membro (deletar permanentemente)
export const removerMembro = async (req: Request, res: Response) => {
  try {
    const { id, membroId } = req.params;

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