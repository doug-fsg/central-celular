import { prisma } from '../lib/prisma';
import crypto from 'crypto';
import { addDays, startOfWeek, endOfWeek, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { authService } from './authService';

// URL do frontend
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://central-celular.vercel.app';

export const ssoLinkService = {
  // Gerar um token único
  generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  },

  // Obter a configuração da conta
  async getAccountConfig(accountId: number) {
    let config = await prisma.accountConfig.findUnique({
      where: { accountId }
    });

    if (!config) {
      // Criar configuração padrão
      config = await prisma.accountConfig.create({
        data: {
          accountId,
          envioLinkSsoAtivo: false
        }
      });
    }

    return config;
  },

  // Atualizar configuração da conta
  async updateAccountConfig(accountId: number, data: { envioLinkSsoAtivo?: boolean }) {
    const configExists = await prisma.accountConfig.findUnique({
      where: { accountId }
    });

    if (configExists) {
      return prisma.accountConfig.update({
        where: { accountId },
        data
      });
    } else {
      return prisma.accountConfig.create({
        data: {
          accountId,
          ...data
        }
      });
    }
  },

  // Criar um link SSO para um líder
  async createSsoLink(usuarioId: number) {
    // Calcular período da semana atual (segunda a domingo)
    const hoje = new Date();
    const dataInicio = startOfWeek(hoje, { weekStartsOn: 1 }); // Segunda-feira
    const dataFim = endOfWeek(hoje, { weekStartsOn: 1 }); // Domingo
    
    // Data de expiração: quarta-feira às 23:59
    const quartaFeira = new Date(dataFim);
    quartaFeira.setDate(dataInicio.getDate() + 2); // +2 dias a partir de segunda = quarta
    quartaFeira.setHours(23, 59, 59, 999);

    // Verificar se já existe um link para este usuário nesta semana
    const existingLink = await prisma.ssoLink.findFirst({
      where: {
        usuarioId,
        dataInicio: {
          gte: dataInicio
        },
        dataFim: {
          lte: dataFim
        }
      }
    });

    if (existingLink) {
      // Se já existe um link, retornar o existente
      return existingLink;
    }

    // Criar novo link
    const token = this.generateToken();
    
    return prisma.ssoLink.create({
      data: {
        token,
        usuarioId,
        dataInicio,
        dataFim,
        expiresAt: quartaFeira,
        usado: false
      }
    });
  },

  // Verificar se um link SSO é válido
  async validateSsoLink(token: string) {
    const link = await prisma.ssoLink.findUnique({
      where: { token },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            cargo: true,
            accountId: true,
            isSuperAdmin: true,
            celulasLideradas: {
              select: {
                id: true
              }
            }
          }
        }
      }
    });

    // Se o link não existe ou já expirou
    if (!link || new Date() > new Date(link.expiresAt)) {
      return { valid: false, message: 'Link expirado ou inválido', usuario: null, token: null };
    }

    // Marcar como usado
    await prisma.ssoLink.update({
      where: { id: link.id },
      data: { usado: true }
    });

    // Gerar um token JWT para o usuário
    const authToken = authService.generateJwtToken({
      userId: link.usuario.id,
      accountId: link.usuario.accountId,
      isSuperAdmin: link.usuario.isSuperAdmin || false
    });

    // Retornar informações do usuário e o token de autenticação
    return {
      valid: true,
      message: 'Link válido',
      usuario: {
        id: link.usuario.id,
        nome: link.usuario.nome,
        cargo: link.usuario.cargo,
        accountId: link.usuario.accountId,
        celulaId: link.usuario.celulasLideradas[0]?.id || null,
        isSuperAdmin: link.usuario.isSuperAdmin || false
      },
      token: authToken
    };
  },

  // Enviar link SSO via WhatsApp
  async enviarLinkSsoWhatsApp(usuarioId: number, accountId: number) {
    try {
      // Buscar o usuário
      const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: {
          nome: true,
          whatsapp: true,
          cargo: true,
          celulasLideradas: {
            select: {
              id: true,
              nome: true
            }
          }
        }
      });

      if (!usuario) {
        throw new Error('Usuário não encontrado');
      }

      // Verificar se é líder
      if (usuario.cargo.toUpperCase() !== 'LIDER') {
        throw new Error('Apenas líderes podem receber links SSO');
      }

      // Verificar se tem célula
      if (!usuario.celulasLideradas || usuario.celulasLideradas.length === 0) {
        throw new Error('Usuário não lidera nenhuma célula');
      }

      // Criar link SSO
      const ssoLink = await this.createSsoLink(usuarioId);

      // Buscar conexão WhatsApp ativa da account
      const whatsappConnection = await prisma.whatsAppConnection.findFirst({
        where: {
          accountId,
          status: 'connected'
        }
      });
      
      if (!whatsappConnection) {
        throw new Error('Nenhuma conexão WhatsApp ativa encontrada');
      }

      // Formatar período do relatório
      const dataInicio = new Date(ssoLink.dataInicio);
      const dataFim = new Date(ssoLink.dataFim);
      const periodoFormatado = `${format(dataInicio, 'dd/MM', { locale: ptBR })} - ${format(dataFim, 'dd/MM', { locale: ptBR })}`;

      // Extrair primeiro nome
      const primeiroNome = usuario.nome.split(' ')[0];

      // Montar a mensagem
      const mensagem = `🔔 *Olá ${primeiroNome}!*\n\n` +
        `Chegou a hora de preencher o relatório semanal da sua célula *${usuario.celulasLideradas[0].nome}*.\n\n` +
        `📅 *Período:* ${periodoFormatado}\n` +
        `⏰ *Link válido até:* Quarta-feira às 23:59\n\n` +
        `Clique no link abaixo para acessar diretamente o formulário:\n` +
        `${FRONTEND_URL}/sso/${ssoLink.token}\n\n` +
        `_Este é um link de acesso único e seguro. Não compartilhe com outras pessoas._\n\n` +
        `------------`;

      // Enviar mensagem via WhatsApp
      const response = await fetch(`http://173.249.22.227:31000/v3/bot/${whatsappConnection.token}/sendText/${usuario.whatsapp}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: mensagem
        })
      });
      
      // Verificar se a requisição foi bem-sucedida
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao enviar mensagem: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Falha ao enviar mensagem via WhatsApp');
      }

      return {
        success: true,
        message: 'Link SSO enviado com sucesso',
        ssoLink
      };
    } catch (error) {
      console.error('[SsoLinkService] Erro ao enviar link SSO via WhatsApp:', error);
      throw error;
    }
  },

  // Executar job de envio automático de links SSO
  async executarJobEnvioLinks(accountId: number) {
    try {
      // Verificar se o envio automático está ativo
      const config = await this.getAccountConfig(accountId);
      
      if (!config.envioLinkSsoAtivo) {
        console.log(`[SsoLinkJob] Envio automático desativado para account ${accountId}`);
        return {
          success: true,
          message: 'Envio automático desativado',
          enviados: 0
        };
      }

      // Buscar todos os líderes ativos da account
      const lideres = await prisma.usuario.findMany({
        where: {
          accountId,
          ativo: true,
          cargo: {
            in: ['LIDER', 'lider', 'Lider']
          },
          celulasLideradas: {
            some: {
              ativo: true
            }
          }
        },
        select: {
          id: true,
          nome: true,
          whatsapp: true
        }
      });

      console.log(`[SsoLinkJob] Encontrados ${lideres.length} líderes ativos`);

      // Enviar link para cada líder
      let enviados = 0;
      const erros: Array<{ lider: string; erro: string }> = [];

      for (const lider of lideres) {
        try {
          await this.enviarLinkSsoWhatsApp(lider.id, accountId);
          enviados++;
          console.log(`[SsoLinkJob] Link enviado com sucesso para ${lider.nome} (${lider.whatsapp})`);
        } catch (error) {
          console.error(`[SsoLinkJob] Erro ao enviar link para ${lider.nome}:`, error);
          erros.push({
            lider: lider.nome,
            erro: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

      return {
        success: true,
        message: `Links SSO enviados com sucesso para ${enviados} de ${lideres.length} líderes`,
        enviados,
        total: lideres.length,
        erros: erros.length > 0 ? erros : undefined
      };
    } catch (error) {
      console.error('[SsoLinkJob] Erro ao executar job de envio de links:', error);
      throw error;
    }
  }
}; 