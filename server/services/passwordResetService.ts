import { prisma } from '../lib/prisma';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { whatsappService } from './whatsappService';

// URL do frontend
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://central-celular.vercel.app';

export const passwordResetService = {
  // Gerar um token único para reset de senha
  generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  },

  // Função para padronizar o formato do número
  formatWhatsApp(whatsapp: string): string {
    return whatsappService.formatFullPhoneNumber(whatsapp);
  },

  // Comparar datas de nascimento ignorando horas (apenas data)
  compareDates(date1: Date | null, date2: Date | null): boolean {
    if (!date1 || !date2) return false;
    
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    // Ajustar para UTC para evitar problemas de timezone
    const d1UTC = new Date(Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate()));
    const d2UTC = new Date(Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate()));
    
    // Comparar apenas ano, mês e dia
    return (
      d1UTC.getFullYear() === d2UTC.getFullYear() &&
      d1UTC.getMonth() === d2UTC.getMonth() &&
      d1UTC.getDate() === d2UTC.getDate()
    );
  },

  // Solicitar reset de senha
  async requestPasswordReset(whatsapp: string, dataNascimento: string, accountId: number): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`[PasswordResetService] Iniciando solicitação de reset - WhatsApp: ${whatsapp}, AccountId: ${accountId}`);
      
      // Formatar o número
      const whatsappFormatado = this.formatWhatsApp(whatsapp);
      
      // Buscar usuário que possui senha cadastrada
      const usuario = await prisma.usuario.findFirst({
        where: {
          whatsapp: whatsappFormatado,
          accountId,
          ativo: true,
          NOT: {
            OR: [
              { senha: null },
              { senha: '' }
            ]
          }
        }
      });

      if (!usuario) {
        console.log('[PasswordResetService] Usuário não encontrado ou sem senha cadastrada');
        return {
          success: false,
          message: 'Usuário não encontrado ou sem senha cadastrada'
        };
      }

      // Validar data de nascimento
      if (!usuario.dataNascimento) {
        console.log('[PasswordResetService] Usuário não possui data de nascimento cadastrada');
        return {
          success: false,
          message: 'Data de nascimento não cadastrada. Entre em contato com o administrador.'
        };
      }

      const dataNascimentoUsuario = new Date(usuario.dataNascimento);
      const dataNascimentoFornecida = new Date(dataNascimento);

      if (!this.compareDates(dataNascimentoUsuario, dataNascimentoFornecida)) {
        console.log('[PasswordResetService] Data de nascimento não confere');
        return {
          success: false,
          message: 'Data de nascimento incorreta'
        };
      }

      // Gerar token único
      const token = this.generateResetToken();
      
      // Definir validade para 10 minutos a partir de agora
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Salvar token na tabela OtpCode (reutilizando estrutura existente)
      await prisma.otpCode.create({
        data: {
          whatsapp: whatsappFormatado,
          code: token, // Armazenar token único no campo code
          expiresAt,
          used: false,
          accountId
        }
      });

      console.log(`[PasswordResetService] Token criado com sucesso - Expira em: ${expiresAt}`);

      // Enviar link via WhatsApp
      const linkEnviado = await this.sendResetLinkWhatsApp(whatsappFormatado, token, accountId);

      if (!linkEnviado) {
        console.log('[PasswordResetService] Falha ao enviar link via WhatsApp');
        return {
          success: false,
          message: 'Não foi possível enviar o link via WhatsApp. Tente novamente.'
        };
      }

      console.log('[PasswordResetService] Link enviado com sucesso');
      return {
        success: true,
        message: 'Link de recuperação enviado para seu WhatsApp. Verifique sua mensagem.'
      };
    } catch (error) {
      console.error('[PasswordResetService] Erro ao solicitar reset de senha:', error);
      return {
        success: false,
        message: 'Erro ao processar solicitação. Tente novamente.'
      };
    }
  },

  // Verificar se token de reset é válido
  async verifyResetToken(token: string, accountId: number): Promise<{ valid: boolean; message: string }> {
    try {
      console.log(`[PasswordResetService] Verificando token: ${token}, AccountId: ${accountId}`);

      const tokenRecord = await prisma.otpCode.findFirst({
        where: {
          code: token,
          accountId,
          expiresAt: { gt: new Date() },
          used: false
        }
      });

      if (!tokenRecord) {
        console.log('[PasswordResetService] Token não encontrado ou expirado');
        return {
          valid: false,
          message: 'Token inválido ou expirado'
        };
      }

      console.log('[PasswordResetService] Token válido');
      return {
        valid: true,
        message: 'Token válido'
      };
    } catch (error) {
      console.error('[PasswordResetService] Erro ao verificar token:', error);
      return {
        valid: false,
        message: 'Erro ao verificar token'
      };
    }
  },

  // Redefinir senha usando token
  async resetPassword(token: string, novaSenha: string, accountId: number): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`[PasswordResetService] Redefinindo senha com token: ${token}, AccountId: ${accountId}`);

      // Verificar token
      const tokenRecord = await prisma.otpCode.findFirst({
        where: {
          code: token,
          accountId,
          expiresAt: { gt: new Date() },
          used: false
        }
      });

      if (!tokenRecord) {
        console.log('[PasswordResetService] Token inválido ou expirado');
        return {
          success: false,
          message: 'Token inválido ou expirado'
        };
      }

      // Buscar usuário pelo WhatsApp do token
      const usuario = await prisma.usuario.findFirst({
        where: {
          whatsapp: tokenRecord.whatsapp,
          accountId,
          ativo: true
        }
      });

      if (!usuario) {
        console.log('[PasswordResetService] Usuário não encontrado');
        return {
          success: false,
          message: 'Usuário não encontrado'
        };
      }

      // Hash da nova senha
      const hashedPassword = await bcrypt.hash(novaSenha, 10);

      // Atualizar senha do usuário
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { senha: hashedPassword }
      });

      // Marcar token como usado
      await prisma.otpCode.update({
        where: { id: tokenRecord.id },
        data: { used: true }
      });

      console.log('[PasswordResetService] Senha redefinida com sucesso');
      return {
        success: true,
        message: 'Senha redefinida com sucesso'
      };
    } catch (error) {
      console.error('[PasswordResetService] Erro ao redefinir senha:', error);
      return {
        success: false,
        message: 'Erro ao redefinir senha. Tente novamente.'
      };
    }
  },

  // Enviar link de reset via WhatsApp
  async sendResetLinkWhatsApp(whatsapp: string, token: string, accountId: number): Promise<boolean> {
    try {
      console.log(`[PasswordResetService] Enviando link de reset via WhatsApp - WhatsApp: ${whatsapp}, AccountId: ${accountId}`);

      // Buscar conexão WhatsApp ativa da account
      const whatsappConnection = await prisma.whatsAppConnection.findFirst({
        where: {
          accountId,
          status: 'connected'
        }
      });

      if (!whatsappConnection) {
        console.error(`[PasswordResetService] Nenhuma conexão WhatsApp ativa encontrada para a account ${accountId}`);
        return false;
      }

      console.log(`[PasswordResetService] Conexão WhatsApp encontrada - Token: ${whatsappConnection.token}`);

      // Montar a mensagem com o link
      const resetLink = `${FRONTEND_URL}/reset-password/${token}`;
      const mensagem = `🔐 *Recuperação de Senha*\n\n` +
        `Você solicitou a recuperação de senha.\n\n` +
        `Clique no link abaixo para redefinir sua senha:\n` +
        `${resetLink}\n\n` +
        `⏰ *Este link expira em 10 minutos.*\n\n` +
        `_Se você não solicitou esta recuperação, ignore esta mensagem._\n\n` +
        `------------`;

      // Formatar o número antes de enviar
      const whatsappFormatado = this.formatWhatsApp(whatsapp);
      console.log('[PasswordResetService] Número formatado para API:', whatsappFormatado);

      const data = await whatsappService.sendText(
        whatsappConnection.token,
        whatsappFormatado,
        mensagem
      );
      console.log('[PasswordResetService] Resposta do envio de link:', data);
      return true;
    } catch (error) {
      console.error('[PasswordResetService] Erro ao enviar link via WhatsApp:', error);
      return false;
    }
  }
};

