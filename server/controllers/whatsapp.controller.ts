import { Request, Response } from 'express';
import { whatsappService } from '../services/whatsappService';

export const whatsappController = {
  // Criar nova conexão
  async createConnection(req: Request, res: Response) {
    try {
      const { name, token } = req.body;
      const accountId = req.user?.accountId;

      if (!accountId) {
        return res.status(401).json({ message: 'Conta não identificada' });
      }

      const connection = await whatsappService.createConnection({
        name,
        token,
        accountId
      });

      return res.status(201).json(connection);
    } catch (error) {
      console.error('Erro ao criar conexão:', error);
      return res.status(500).json({ message: 'Erro ao criar conexão' });
    }
  },

  // Atualizar status da conexão
  async updateConnectionStatus(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const { status, phoneNumber } = req.body;

      const connection = await whatsappService.updateConnectionStatus(token, {
        status,
        phoneNumber,
        ...(status === 'connected' ? { connectedAt: new Date() } : {})
      });

      return res.json(connection);
    } catch (error) {
      console.error('Erro ao atualizar status da conexão:', error);
      return res.status(500).json({ message: 'Erro ao atualizar status da conexão' });
    }
  },

  // Listar conexões da account
  async listConnections(req: Request, res: Response) {
    try {
      const accountId = req.user?.accountId;

      if (!accountId) {
        return res.status(401).json({ message: 'Conta não identificada' });
      }

      const connections = await whatsappService.getAccountConnections(accountId);
      return res.json(connections);
    } catch (error) {
      console.error('Erro ao listar conexões:', error);
      return res.status(500).json({ message: 'Erro ao listar conexões' });
    }
  },

  // Verificar conexão específica
  async checkConnection(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const connection = await whatsappService.getConnectionByToken(token);

      if (!connection) {
        return res.status(404).json({ message: 'Conexão não encontrada' });
      }

      return res.json(connection);
    } catch (error) {
      console.error('Erro ao verificar conexão:', error);
      return res.status(500).json({ message: 'Erro ao verificar conexão' });
    }
  },

  // Verificar se tem conexão ativa
  async hasActiveConnection(req: Request, res: Response) {
    try {
      const accountId = req.user?.accountId;

      if (!accountId) {
        return res.status(401).json({ message: 'Conta não identificada' });
      }

      const hasActive = await whatsappService.hasActiveConnection(accountId);
      return res.json({ hasActive });
    } catch (error) {
      console.error('Erro ao verificar conexão ativa:', error);
      return res.status(500).json({ message: 'Erro ao verificar conexão ativa' });
    }
  },

  // Deletar uma conexão
  async deleteConnection(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const accountId = req.user?.accountId;

      if (!accountId) {
        return res.status(401).json({ message: 'Conta não identificada' });
      }

      // Verificar se a conexão existe e pertence à conta do usuário
      const connection = await whatsappService.getConnectionByToken(token);
      
      if (!connection) {
        return res.status(404).json({ message: 'Conexão não encontrada' });
      }

      if (connection.accountId !== accountId) {
        return res.status(403).json({ message: 'Usuário não tem permissão para deletar esta conexão' });
      }

      // Deletar a conexão
      await whatsappService.deleteConnection(token);

      return res.status(200).json({ success: true, message: 'Conexão deletada com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar conexão:', error);
      return res.status(500).json({ message: 'Erro ao deletar conexão' });
    }
  }
}; 