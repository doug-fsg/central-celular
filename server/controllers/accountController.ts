import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const accountController = {
  async create(req: Request, res: Response) {
    try {
      const { nome } = req.body;

      const account = await prisma.account.create({
        data: {
          nome,
          ativo: true
        }
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
        select: {
          id: true,
          nome: true,
          ativo: true,
          createdAt: true,
          _count: {
            select: {
              usuarios: true
            }
          }
        }
      });

      return res.json(accounts);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar contas' });
    }
  },

  async toggleActive(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { ativo } = req.body;

      const account = await prisma.account.update({
        where: { id: Number(id) },
        data: { ativo }
      });

      return res.json(account);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar status da conta' });
    }
  }
}; 