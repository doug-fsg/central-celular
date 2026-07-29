import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { otpService } from './otpService';
import { whatsappService } from './whatsappService';
import {
  signAccessToken,
  signRefreshToken,
  signSetupToken,
  verifyRefreshToken,
  verifySetupToken,
} from '../lib/jwt';
import { otpLockout } from '../lib/otpLockout';

interface LoginData {
  whatsapp: string;
  senha: string;
  accountId?: number;
}

export interface AuthTokensResult {
  accessToken: string;
  refreshToken: string;
  usuario: Record<string, unknown>;
  token: string;
}

interface RequestOtpResult {
  success: boolean;
  message: string;
  expiresAt?: Date;
}

interface VerifyOtpResult {
  success: boolean;
  message: string;
  setupToken?: string;
}

interface CreatePasswordData {
  whatsapp: string;
  senha: string;
  nome: string;
  dataNascimento?: string;
  accountId: number;
  setupToken: string;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function normalizeWhatsAppDigits(whatsapp: string): string {
  const digits = whatsapp.replace(/\D/g, '');
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  if (digits.length <= 11) {
    return `55${digits}`;
  }
  return digits;
}

async function issueTokens(user: {
  id: number;
  accountId: number;
  isSuperAdmin: boolean;
}): Promise<{ accessToken: string; refreshToken: string }> {
  const payload = {
    userId: user.id,
    accountId: user.accountId,
    isSuperAdmin: user.isSuperAdmin || false,
  };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      usuarioId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

export const authService = {
  generateJwtToken(payload: {
    userId: number;
    accountId: number;
    isSuperAdmin: boolean;
  }): string {
    return signAccessToken(payload);
  },

  formatWhatsApp(whatsapp: string): string {
    return whatsappService.formatFullPhoneNumber(whatsapp);
  },

  async login({ whatsapp, senha, accountId }: LoginData): Promise<AuthTokensResult> {
    const whatsappNormalizado = normalizeWhatsAppDigits(whatsapp);
    const whatsappVariacoes = [whatsappNormalizado];

    if (whatsappNormalizado.length === 12 && whatsappNormalizado.startsWith('55')) {
      const ddd = whatsappNormalizado.substring(2, 4);
      const numero = whatsappNormalizado.substring(4);
      whatsappVariacoes.push(`55${ddd}9${numero}`);
    }

    if (whatsappNormalizado.length === 13 && whatsappNormalizado.startsWith('55')) {
      const ddd = whatsappNormalizado.substring(2, 4);
      const numero = whatsappNormalizado.substring(5);
      whatsappVariacoes.push(`55${ddd}${numero}`);
    }

    const user = await prisma.usuario.findFirst({
      where: {
        whatsapp: { in: whatsappVariacoes },
        ...(accountId ? { accountId } : {}),
        ativo: true,
      },
      include: {
        account: {
          select: { id: true, nome: true, ativo: true },
        },
      },
    });

    if (!user || !user.senha) {
      throw new Error('Credenciais inválidas');
    }

    if (!user.account.ativo) {
      throw new Error('Account inativa');
    }

    const isValidPassword = await bcrypt.compare(senha, user.senha);
    if (!isValidPassword) {
      throw new Error('Credenciais inválidas');
    }

    const { accessToken, refreshToken } = await issueTokens(user);
    const { senha: _, ...userWithoutPassword } = user;

    return {
      accessToken,
      refreshToken,
      token: accessToken,
      usuario: userWithoutPassword,
    };
  },

  async requestOtp(whatsapp: string): Promise<RequestOtpResult> {
    try {
      if (!/^\+\d{10,15}$/.test(whatsapp)) {
        return {
          success: false,
          message: 'Número de WhatsApp inválido. Use o formato internacional (+XXXXXXXXXXX).',
        };
      }

      const whatsappFormatado = this.formatWhatsApp(whatsapp);
      const defaultAccount = await prisma.account.findFirst({
        where: { ativo: true },
        orderBy: { id: 'asc' },
      });

      if (!defaultAccount) {
        return { success: false, message: 'Não foi possível encontrar uma conta ativa' };
      }

      if (otpLockout.isLocked(whatsappFormatado, defaultAccount.id)) {
        return {
          success: false,
          message: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.',
        };
      }

      const existingUser = await prisma.usuario.findFirst({
        where: {
          whatsapp: whatsappFormatado,
          accountId: defaultAccount.id,
          OR: [{ senha: null }, { senha: '' }],
        },
      });

      if (!existingUser) {
        const userWithPassword = await prisma.usuario.findFirst({
          where: {
            whatsapp: whatsappFormatado,
            accountId: defaultAccount.id,
            NOT: { OR: [{ senha: null }, { senha: '' }] },
          },
        });

        if (userWithPassword) {
          return {
            success: false,
            message: 'Este número já possui senha cadastrada. Por favor, faça login normalmente.',
          };
        }

        return {
          success: false,
          message: 'Número de WhatsApp não encontrado. Entre em contato com o administrador.',
        };
      }

      const { code, expiresAt } = await otpService.createOtp({
        whatsapp: whatsappFormatado,
        accountId: defaultAccount.id,
      });

      const sent = await otpService.sendOtpWhatsApp(whatsappFormatado, code, defaultAccount.id);
      if (!sent) {
        return {
          success: false,
          message: 'Não foi possível enviar o código via WhatsApp. Tente novamente.',
        };
      }

      return { success: true, message: 'Código enviado com sucesso', expiresAt };
    } catch (error) {
      console.error('[AuthService] Erro ao solicitar OTP:', error);
      return { success: false, message: 'Erro ao processar solicitação. Tente novamente.' };
    }
  },

  async verifyOtp(whatsapp: string, code: string): Promise<VerifyOtpResult> {
    try {
      const whatsappFormatado = this.formatWhatsApp(whatsapp);
      const defaultAccount = await prisma.account.findFirst({
        where: { ativo: true },
        orderBy: { id: 'asc' },
      });

      if (!defaultAccount) {
        return { success: false, message: 'Não foi possível encontrar uma conta ativa' };
      }

      if (otpLockout.isLocked(whatsappFormatado, defaultAccount.id)) {
        return {
          success: false,
          message: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.',
        };
      }

      const isValid = await otpService.verifyOtp(whatsappFormatado, code, defaultAccount.id);
      if (!isValid) {
        otpLockout.recordFailure(whatsappFormatado, defaultAccount.id);
        return { success: false, message: 'Código inválido ou expirado' };
      }

      otpLockout.reset(whatsappFormatado, defaultAccount.id);
      const setupToken = signSetupToken({
        purpose: 'setup-password',
        whatsapp: whatsappFormatado,
        accountId: defaultAccount.id,
      });

      return {
        success: true,
        message: 'Código verificado com sucesso',
        setupToken,
      };
    } catch (error) {
      console.error('[AuthService] Erro ao verificar OTP:', error);
      return { success: false, message: 'Erro ao verificar código. Tente novamente.' };
    }
  },

  createSetupTokenForInvite(whatsapp: string, accountId: number): string {
    return signSetupToken({
      purpose: 'setup-password',
      whatsapp,
      accountId,
    });
  },

  async createPassword({
    whatsapp,
    senha,
    nome,
    dataNascimento,
    accountId,
    setupToken,
  }: CreatePasswordData): Promise<AuthTokensResult> {
    const setup = verifySetupToken(setupToken);
    const whatsappFormatado = normalizeWhatsAppDigits(whatsapp);

    if (setup.accountId !== accountId) {
      throw new Error('Token de configuração inválido');
    }

    if (setup.whatsapp !== whatsappFormatado && setup.whatsapp !== this.formatWhatsApp(whatsapp)) {
      throw new Error('Token de configuração inválido para este WhatsApp');
    }

    const existingUser = await prisma.usuario.findFirst({
      where: {
        whatsapp: whatsappFormatado,
        accountId,
        OR: [{ senha: null }, { senha: '' }],
      },
    });

    if (!existingUser) {
      throw new Error('Usuário não encontrado ou já possui senha cadastrada');
    }

    const hashedPassword = await bcrypt.hash(senha, 10);
    const updateData: {
      senha: string;
      nome: string;
      ativo: boolean;
      dataNascimento?: Date;
    } = {
      senha: hashedPassword,
      nome,
      ativo: true,
    };

    if (dataNascimento) {
      updateData.dataNascimento = new Date(dataNascimento);
    }

    const updatedUser = await prisma.usuario.update({
      where: { id: existingUser.id },
      data: updateData,
      include: {
        account: { select: { id: true, nome: true, ativo: true } },
      },
    });

    const { accessToken, refreshToken } = await issueTokens(updatedUser);
    const { senha: _, ...userWithoutPassword } = updatedUser;

    return {
      accessToken,
      refreshToken,
      token: accessToken,
      usuario: userWithoutPassword,
    };
  },

  async refresh(refreshToken: string): Promise<AuthTokensResult> {
    const decoded = verifyRefreshToken(refreshToken);
    const tokenHash = hashToken(refreshToken);

    const stored = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        usuarioId: decoded.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!stored) {
      throw new Error('Refresh token inválido');
    }

    const user = await prisma.usuario.findFirst({
      where: { id: decoded.userId, accountId: decoded.accountId, ativo: true },
      include: { account: { select: { id: true, nome: true, ativo: true } } },
    });

    if (!user || !user.account.ativo) {
      throw new Error('Usuário inválido');
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await issueTokens(user);
    const { senha: _, ...userWithoutPassword } = user;

    return {
      ...tokens,
      token: tokens.accessToken,
      usuario: userWithoutPassword,
    };
  },

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};
