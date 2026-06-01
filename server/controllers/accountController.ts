import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const accountController = {
  async create(req: Request, res: Response) {
    try {
      const nome = String(req.body?.nome ?? '').trim();
      if (!nome) {
        return res.status(400).json({ error: 'Nome da igreja/empresa é obrigatório' });
      }

      const account = await prisma.account.create({
        data: {
          nome,
          ativo: true,
        },
      });

      return res.status(201).json(account);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar conta' });
    }
  },

  async list(req: Request, res: Response) {
    try {
      const accounts = await prisma.account.findMany({
        orderBy: { nome: 'asc' },
        select: {
          id: true,
          nome: true,
          ativo: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              usuarios: true,
              celulas: true,
              regioes: true,
            },
          },
        },
      });

      return res.json(accounts);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar contas' });
    }
  },

  async listUsuarios(req: Request, res: Response) {
    try {
      const accountId = Number(req.params.id);
      if (!Number.isFinite(accountId)) {
        return res.status(400).json({ error: 'ID da conta inválido' });
      }

      const account = await prisma.account.findUnique({
        where: { id: accountId },
        select: { id: true, nome: true },
      });

      if (!account) {
        return res.status(404).json({ error: 'Conta não encontrada' });
      }

      const usuarios = await prisma.usuario.findMany({
        where: { accountId },
        select: {
          id: true,
          nome: true,
          whatsapp: true,
          cargo: true,
          ativo: true,
          isSuperAdmin: true,
          createdAt: true,
        },
        orderBy: [{ cargo: 'asc' }, { nome: 'asc' }],
      });

      return res.json({ account, usuarios });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar usuários da conta' });
    }
  },

  async toggleActive(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { ativo } = req.body;

      if (typeof ativo !== 'boolean') {
        return res.status(400).json({ error: 'Campo ativo deve ser boolean' });
      }

      const account = await prisma.account.update({
        where: { id: Number(id) },
        data: { ativo },
      });

      return res.json(account);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar status da conta' });
    }
  },
};
