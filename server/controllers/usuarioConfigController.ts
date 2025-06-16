import { Request, Response } from 'express';
import { usuarioConfigService } from '../services/usuarioConfigService';
import { verificarAniversariantes } from '../jobs/aniversarioNotification';

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

export const usuarioConfigController = {
  // Obter configurações do usuário atual
  async getConfig(req: Request, res: Response) {
    try {
      const usuarioId = req.user?.id;
      
      if (!usuarioId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const config = await usuarioConfigService.getUsuarioConfig(usuarioId);
      return res.status(200).json(config);
    } catch (error) {
      console.error('Erro ao obter configurações do usuário:', error);
      return res.status(500).json({ error: 'Erro ao obter configurações do usuário' });
    }
  },

  // Atualizar configurações do usuário atual
  async updateConfig(req: Request, res: Response) {
    try {
      const usuarioId = req.user?.id;
      
      if (!usuarioId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Validar dados de entrada
      const { notificacaoAniversarioAtiva, diasAntecedencia1, diasAntecedencia2 } = req.body;

      // Validar os dias de antecedência
      if (diasAntecedencia1 !== undefined && (isNaN(diasAntecedencia1) || diasAntecedencia1 < 0 || diasAntecedencia1 > 30)) {
        return res.status(400).json({ error: 'Dias de antecedência 1 deve ser um número entre 0 e 30' });
      }

      if (diasAntecedencia2 !== undefined && (isNaN(diasAntecedencia2) || diasAntecedencia2 < 0 || diasAntecedencia2 > 30)) {
        return res.status(400).json({ error: 'Dias de antecedência 2 deve ser um número entre 0 e 30' });
      }

      const config = await usuarioConfigService.updateUsuarioConfig(usuarioId, {
        notificacaoAniversarioAtiva,
        diasAntecedencia1,
        diasAntecedencia2
      });

      return res.status(200).json(config);
    } catch (error) {
      console.error('Erro ao atualizar configurações do usuário:', error);
      return res.status(500).json({ error: 'Erro ao atualizar configurações do usuário' });
    }
  },

  // Testar notificação de aniversário (apenas em ambiente de desenvolvimento)
  async testAniversarioNotification(req: Request, res: Response) {
    try {
      // Verificar se estamos em ambiente de desenvolvimento
      if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ error: 'Esta funcionalidade só está disponível em ambiente de desenvolvimento' });
      }

      const usuarioId = req.user?.id;
      
      if (!usuarioId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Mostrar informações da data atual
      const agora = new Date();
      const fuso = agora.getTimezoneOffset() / -60;
      const fusoStr = fuso >= 0 ? `GMT+${fuso}` : `GMT${fuso}`;
      console.log(`[Test] Data e hora atual do servidor: ${agora.toISOString()}`);
      console.log(`[Test] Fuso horário do servidor: ${fusoStr}`);
      console.log(`[Test] Data local: ${agora.getDate()}/${agora.getMonth() + 1}/${agora.getFullYear()}`);
      
      // Executar o job de verificação de aniversariantes
      console.log(`[Test] Executando job de aniversariantes para teste solicitado pelo usuário ${usuarioId}`);
      await verificarAniversariantes();
      
      return res.status(200).json({ 
        success: true, 
        message: 'Job de notificação de aniversário executado com sucesso. Verifique os logs do servidor para mais detalhes.',
        dataAtual: {
          iso: agora.toISOString(),
          fusoHorario: fusoStr,
          dataLocal: `${agora.getDate()}/${agora.getMonth() + 1}/${agora.getFullYear()}`
        }
      });
    } catch (error) {
      console.error('Erro ao testar notificação de aniversário:', error);
      return res.status(500).json({ error: 'Erro ao testar notificação de aniversário' });
    }
  }
}; 