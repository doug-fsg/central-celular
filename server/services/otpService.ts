import { prisma } from '../lib/prisma';
import { whatsappService } from './whatsappService';
import crypto from 'crypto';

interface CreateOtpParams {
  whatsapp: string;
  accountId: number;
  isInvite?: boolean;
}

/** Código numérico de login — curto, expira rápido. */
const OTP_CODE_TTL_MS = 10 * 60 * 1000;
/** Token do link /first-access — mais longo; convites costumam ser abertos com atraso (ex.: WhatsApp). */
const INVITE_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

async function sendQuepasaText(token: string, phone: string, text: string): Promise<boolean> {
  try {
    await whatsappService.sendText(token, phone, text);
    return true;
  } catch (error) {
    console.error('[OtpService] Erro ao enviar mensagem:', error);
    return false;
  }
}

export const otpService = {
  formatWhatsApp(whatsapp: string): string {
    return whatsappService.formatFullPhoneNumber(whatsapp);
  },

  generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  generateInviteToken(): string {
    return crypto.randomBytes(32).toString('hex');
  },

  async createOtp({ whatsapp, accountId, isInvite = false }: CreateOtpParams): Promise<{ code: string; expiresAt: Date }> {
    const formattedWhatsApp = isInvite ? whatsapp : this.formatWhatsApp(whatsapp);
    const code = isInvite ? this.generateInviteToken() : this.generateOtpCode();
    const ttlMs = isInvite ? INVITE_TOKEN_TTL_MS : OTP_CODE_TTL_MS;
    const expiresAt = new Date(Date.now() + ttlMs);

    await prisma.otpCode.create({
      data: {
        whatsapp: formattedWhatsApp,
        code,
        expiresAt,
        used: false,
        accountId,
      },
    });

    return { code, expiresAt };
  },

  async verifyOtp(whatsapp: string, code: string, accountId: number): Promise<boolean> {
    const formattedWhatsApp = this.formatWhatsApp(whatsapp);
    const isToken = code.length > 10;

    const whereClause = isToken
      ? {
          code,
          expiresAt: { gt: new Date() },
          used: false,
          accountId,
        }
      : {
          whatsapp: formattedWhatsApp,
          code,
          expiresAt: { gt: new Date() },
          used: false,
          accountId,
        };

    const otpRecord = await prisma.otpCode.findFirst({ where: whereClause });
    if (!otpRecord) {
      return false;
    }

    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    return true;
  },

  async sendOtpWhatsApp(whatsapp: string, code: string, accountId: number): Promise<boolean> {
    const formattedWhatsApp = this.formatWhatsApp(whatsapp);

    try {
      const whatsappConnection = await prisma.whatsAppConnection.findFirst({
        where: {
          accountId,
          status: 'connected',
        },
      });

      if (!whatsappConnection) {
        console.error(`[OtpService] Nenhuma conexão WhatsApp ativa para account ${accountId}`);
        return false;
      }

      const message = `Código de verificação: ${code}\nEste código expira em 10 minutos.`;
      return sendQuepasaText(whatsappConnection.token, formattedWhatsApp, message);
    } catch (error) {
      console.error('[OtpService] Erro ao enviar OTP via WhatsApp:', error);
      return false;
    }
  },

  async sendCustomMessageWhatsApp(whatsapp: string, message: string, accountId: number): Promise<boolean> {
    const formattedWhatsApp = this.formatWhatsApp(whatsapp);

    try {
      const whatsappConnection = await prisma.whatsAppConnection.findFirst({
        where: {
          accountId,
          status: 'connected',
        },
      });

      if (!whatsappConnection) {
        console.error(`[OtpService] Nenhuma conexão WhatsApp ativa para account ${accountId}`);
        return false;
      }

      return sendQuepasaText(whatsappConnection.token, formattedWhatsApp, message);
    } catch (error) {
      console.error('[OtpService] Erro ao enviar mensagem customizada via WhatsApp:', error);
      return false;
    }
  },
};
