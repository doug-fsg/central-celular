import { prisma } from '../lib/prisma';
import crypto from 'crypto';
import { addDays, startOfWeek, endOfWeek, format, subHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { authService } from './authService';
import { whatsappService } from './whatsappService';

// URL do frontend
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://central-celular.vercel.app';
const TIMEZONE_OFFSET = 3; // UTC-3 (São Paulo)

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
    const hoje = subHours(new Date(), TIMEZONE_OFFSET); // Ajusta para horário de Brasília
    const dataInicio = startOfWeek(hoje, { weekStartsOn: 1 }); // Segunda-feira
    const dataFim = endOfWeek(hoje, { weekStartsOn: 1 }); // Domingo
    
    // Data de expiração: quarta-feira às 23:59 horário de Brasília
    const quartaFeira = new Date(dataInicio);
    quartaFeira.setDate(quartaFeira.getDate() + 2); // Adicionar 2 dias para chegar na quarta
    quartaFeira.setHours(23, 59, 59, 999);

    console.log('[SsoLinkService] Criando novo link:', {
      hoje: format(hoje, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
      dataInicio: format(dataInicio, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
      dataFim: format(dataFim, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
      quartaFeira: format(quartaFeira, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })
    });

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
      // Se já existe um link, atualiza com um novo token e data de expiração
      console.log('[SsoLinkService] Link existente encontrado. Atualizando com novo token e data de expiração.');
      const token = this.generateToken();
      
      return prisma.ssoLink.update({
        where: { id: existingLink.id },
        data: {
          token,
          expiresAt: quartaFeira,
          usado: false
        }
      });
    }

    // Criar novo link
    console.log('[SsoLinkService] Nenhum link existente para esta semana. Criando um novo.');
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
    console.log('[SsoLinkService] Iniciando validação do token:', token);
    
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

    if (!link) {
      console.log('[SsoLinkService] Link não encontrado no banco de dados');
      return { valid: false, message: 'Link expirado ou inválido', usuario: null, token: null };
    }

    console.log('[SsoLinkService] Link encontrado:', {
      id: link.id,
      usuarioId: link.usuarioId,
      expiresAt: format(link.expiresAt, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
      usado: link.usado,
      dataInicio: format(link.dataInicio, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
      dataFim: format(link.dataFim, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })
    });

    const agora = subHours(new Date(), TIMEZONE_OFFSET); // Ajusta para horário de Brasília
    const dataExpiracao = new Date(link.expiresAt);
    
    console.log('[SsoLinkService] Verificando expiração:', {
      agora: format(agora, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
      dataExpiracao: format(dataExpiracao, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
      expirado: agora > dataExpiracao
    });

    if (agora > dataExpiracao) {
      console.log('[SsoLinkService] Link expirado');
      return { valid: false, message: 'Link expirado ou inválido', usuario: null, token: null };
    }

    if (link.usado) {
      console.log('[SsoLinkService] Link já foi utilizado anteriormente');
      return { valid: false, message: 'Este link já foi utilizado', usuario: null, token: null };
    }

    // Marcar como usado
    await prisma.ssoLink.update({
      where: { id: link.id },
      data: { usado: true }
    });

    console.log('[SsoLinkService] Link validado com sucesso para usuário:', link.usuario.nome);

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
          accountId: true,
          nome: true,
          whatsapp: true,
          cargo: true,
          ativo: true,
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

      if (usuario.accountId !== accountId) {
        throw new Error('Usuário não pertence a esta conta');
      }

      if (!usuario.ativo) {
        throw new Error('Usuário inativo não pode receber link SSO');
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

      // Formatar o número antes de enviar
      const whatsappFormatado = whatsappService.formatFullPhoneNumber(usuario.whatsapp);
      console.log('[SsoLinkService] Número original:', usuario.whatsapp);
      console.log('[SsoLinkService] Número formatado para API:', whatsappFormatado);

      // Enviar mensagem via WhatsApp
      const response = await fetch(`http://173.249.22.227:31000/v3/bot/${whatsappConnection.token}/sendText/${whatsappFormatado}`, {
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

  /** Envio em sequência (evita sobrecarga na API do WhatsApp). */
  async enviarLinksSsoWhatsAppEmLote(usuarioIds: number[], accountId: number) {
    const deduped = [...new Set(usuarioIds)].filter((id) => Number.isFinite(id) && id > 0);
    const detalhes: { usuarioId: number; ok: boolean; erro?: string }[] = [];

    for (const usuarioId of deduped) {
      try {
        await this.enviarLinkSsoWhatsApp(usuarioId, accountId);
        detalhes.push({ usuarioId, ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro desconhecido';
        detalhes.push({ usuarioId, ok: false, erro: msg });
        console.error(`[SsoLinkService] Falha no lote para usuário ${usuarioId}:`, msg);
      }
    }

    const enviados = detalhes.filter((d) => d.ok).length;
    const falhas = detalhes.length - enviados;

    return {
      success: falhas === 0,
      total: detalhes.length,
      enviados,
      falhas,
      detalhes,
    };
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