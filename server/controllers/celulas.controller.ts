import { Request, Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

// Schema de validação para células
const celulaSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  endereco: z.string().optional(),
  diaSemana: z.string(), 
  horario: z.string(), 
  liderId: z.number(),
  coLiderId: z.number().optional(),
  regiaoId: z.number().optional()
});

// Schema para validação de membro
const membroSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional(),
  ehConsolidador: z.boolean().optional(),
  observacoes: z.string().optional()
});

// Listar células (com filtros)
export const listarCelulas = async (req: Request, res: Response) => {
  try {
    const { lider, regiao, ativo } = req.query;

    const filtro: any = {};
    
    if (lider) filtro.liderId = Number(lider);
    if (regiao) filtro.regiaoId = Number(regiao);
    if (ativo !== undefined) filtro.ativo = ativo === 'true';

    const celulas = await prisma.celula.findMany({
      where: filtro,
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
      }
    });

    res.json(celulas);
  } catch (error) {
    console.error('Erro ao listar células:', error);
    res.status(500).json({ message: 'Erro ao listar células' });
  }
};

// Obter célula por ID
export const obterCelula = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const celula = await prisma.celula.findUnique({
      where: { id: Number(id) },
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
        membros: {
          where: {
            ativo: true
          }
        }
      }
    });

    if (!celula) {
      return res.status(404).json({ message: 'Célula não encontrada' });
    }

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

    // Verificar região se fornecida
    if (data.regiaoId) {
      const regiao = await prisma.regiao.findUnique({
        where: { id: data.regiaoId }
      });

      if (!regiao) {
        return res.status(400).json({ message: 'Região não encontrada' });
      }
    }

    const novaCelula = await prisma.celula.create({
      data: {
        ...data,
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
    const data = membroSchema.parse(req.body);

    // Verificar se a célula existe
    const celula = await prisma.celula.findUnique({
      where: { id: Number(id) }
    });

    if (!celula) {
      return res.status(404).json({ message: 'Célula não encontrada' });
    }
    
    // Se o email for fornecido, verificar se já existe um membro com este email nesta célula
    if (data.email) {
      const membroExistente = await prisma.$queryRaw`
        SELECT * FROM membros 
        WHERE celula_id = ${Number(id)} 
        AND email = ${data.email}
      `;

      if (Array.isArray(membroExistente) && membroExistente.length > 0) {
        return res.status(400).json({ message: 'Já existe um membro com este email nesta célula' });
      }
    }

    // Adicionar novo membro usando executeRaw para contornar o problema temporário com o modelo não reconhecido
    const novoMembro = await prisma.$queryRaw`
      INSERT INTO membros (celula_id, nome, email, telefone, eh_consolidador, observacoes)
      VALUES (${Number(id)}, ${data.nome}, ${data.email}, ${data.telefone}, ${data.ehConsolidador || false}, ${data.observacoes})
      RETURNING *
    `;

    res.status(201).json(Array.isArray(novoMembro) ? novoMembro[0] : novoMembro);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    
    console.error('Erro ao adicionar membro:', error);
    res.status(500).json({ message: 'Erro ao adicionar membro' });
  }
};

// Remover membro
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

    // Em vez de excluir, marcamos como inativo
    await prisma.$executeRaw`
      UPDATE membros 
      SET ativo = false 
      WHERE id = ${Number(membroId)}
    `;

    res.status(200).json({ message: 'Membro removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover membro:', error);
    res.status(500).json({ message: 'Erro ao remover membro' });
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