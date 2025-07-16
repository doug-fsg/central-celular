import { Request, Response } from 'express';
import { ssoLinkService } from '../services/ssoLinkService';

// Estender a interface Request para incluir o user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        accountId: number;
        cargo: string;
      };
    }
  }
}

export const ssoLinkController = {
  // Obter configuração de envio de links SSO
  async getConfig(req: Request, res: Response) {
    try {
      const accountId = req.user?.accountId;
      
      if (!accountId) {
        return res.status(401).json({ message: 'Conta não identificada' });
      }

      const config = await ssoLinkService.getAccountConfig(accountId);
      return res.json(config);
    } catch (error) {
      console.error('Erro ao obter configuração de links SSO:', error);
      return res.status(500).json({ message: 'Erro ao obter configuração de links SSO' });
    }
  },

  // Atualizar configuração de envio de links SSO
  async updateConfig(req: Request, res: Response) {
    try {
      const accountId = req.user?.accountId;
      
      if (!accountId) {
        return res.status(401).json({ message: 'Conta não identificada' });
      }

      const { envioLinkSsoAtivo } = req.body;
      
      if (typeof envioLinkSsoAtivo !== 'boolean') {
        return res.status(400).json({ message: 'O campo envioLinkSsoAtivo deve ser um booleano' });
      }

      const config = await ssoLinkService.updateAccountConfig(accountId, { envioLinkSsoAtivo });
      return res.json(config);
    } catch (error) {
      console.error('Erro ao atualizar configuração de links SSO:', error);
      return res.status(500).json({ message: 'Erro ao atualizar configuração de links SSO' });
    }
  },

  // Gerar e enviar link SSO para um líder
  async gerarEnviarLink(req: Request, res: Response) {
    try {
      const accountId = req.user?.accountId;
      const { usuarioId } = req.params;
      
      if (!accountId) {
        return res.status(401).json({ message: 'Conta não identificada' });
      }

      if (!usuarioId) {
        return res.status(400).json({ message: 'ID do usuário não fornecido' });
      }

      const resultado = await ssoLinkService.enviarLinkSsoWhatsApp(Number(usuarioId), accountId);
      return res.json(resultado);
    } catch (error) {
      console.error('Erro ao gerar e enviar link SSO:', error);
      return res.status(500).json({ 
        message: 'Erro ao gerar e enviar link SSO', 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    }
  },

  // Validar link SSO
  async validarLink(req: Request, res: Response) {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ message: 'Token não fornecido' });
      }

      const resultado = await ssoLinkService.validateSsoLink(token);
      return res.json(resultado);
    } catch (error) {
      console.error('Erro ao validar link SSO:', error);
      return res.status(500).json({ message: 'Erro ao validar link SSO' });
    }
  },

  // Executar job de envio de links manualmente (para testes)
  async executarJob(req: Request, res: Response) {
    try {
      const accountId = req.user?.accountId;
      
      if (!accountId) {
        return res.status(401).json({ message: 'Conta não identificada' });
      }

      // Verificar se estamos em ambiente de desenvolvimento
      if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ message: 'Esta funcionalidade só está disponível em ambiente de desenvolvimento' });
      }

      const resultado = await ssoLinkService.executarJobEnvioLinks(accountId);
      return res.json(resultado);
    } catch (error) {
      console.error('Erro ao executar job de envio de links SSO:', error);
      return res.status(500).json({ message: 'Erro ao executar job de envio de links SSO' });
    }
  }
}; 