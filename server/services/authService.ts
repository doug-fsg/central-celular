import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { otpService } from './otpService';

interface LoginData {
  email?: string;
  whatsapp?: string;
  senha: string;
  accountId?: number;
}

interface LoginResult {
  user?: any;
  usuario?: any;
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
}

interface CreatePasswordData {
  whatsapp: string;
  senha: string;
  nome: string;
  accountId: number;
}

export const authService = {
  // Função para padronizar o formato do número
  formatWhatsApp(whatsapp: string): string {
    // Remove o + se existir e quaisquer caracteres não numéricos
    return whatsapp.replace(/^\+/, '').replace(/\D/g, '');
  },

  async login({ email, whatsapp, senha, accountId }: LoginData): Promise<LoginResult> {
    console.log(`[AuthService] Iniciando login - ${email ? 'Email: ' + email : 'WhatsApp: ' + whatsapp}, AccountId: ${accountId || 'não fornecido'}`);
    
    // Se não for fornecido accountId, busca o usuário em qualquer account
    const whereClause: any = accountId ? { accountId } : {};
    
    // Adicionar critério de busca por email ou whatsapp
    if (email) {
      whereClause.email = email;
    } else if (whatsapp) {
      whereClause.whatsapp = this.formatWhatsApp(whatsapp);
    } else {
      throw new Error('Email ou WhatsApp deve ser fornecido');
    }
    
    console.log('[AuthService] Buscando usuário com:', whereClause);
    
    const user = await prisma.usuario.findFirst({
      where: {
        ...whereClause,
        ativo: true
      },
      include: {
        account: {
          select: {
            id: true,
            nome: true,
            ativo: true
          }
        }
      }
    });

    if (!user) {
      console.log('[AuthService] Usuário não encontrado');
      throw new Error('Usuário não encontrado');
    }

    console.log(`[AuthService] Usuário encontrado: ID=${user.id}, AccountID=${user.accountId}`);

    if (!user.account.ativo) {
      console.log('[AuthService] Account inativa');
      throw new Error('Account inativa');
    }

    console.log('[AuthService] Verificando senha');
    const isValidPassword = await bcrypt.compare(senha, user.senha);

    if (!isValidPassword) {
      console.log('[AuthService] Senha inválida');
      throw new Error('Senha inválida');
    }

    console.log('[AuthService] Gerando token JWT');
    const jwtSecret = process.env.JWT_SECRET || 'central-celular-secret';
    console.log('[AuthService] JWT Secret disponível:', !!jwtSecret);
    
    const token = jwt.sign(
      {
        userId: user.id,
        accountId: user.accountId,
        isSuperAdmin: user.isSuperAdmin
      },
      jwtSecret,
      {
        expiresIn: '1d'
      }
    );

    console.log('[AuthService] Token gerado com sucesso');
    
    // Formatar resposta para ser compatível com o formato antigo
    const { senha: _, ...userWithoutPassword } = user;
    
    return {
      usuario: userWithoutPassword,
      token
    };
  },
  
  // Solicitar código OTP para primeiro acesso
  async requestOtp(whatsapp: string): Promise<RequestOtpResult> {
    try {
      console.log(`[AuthService] Iniciando solicitação de OTP para WhatsApp: ${whatsapp}`);
      
      // Validar formato do número de WhatsApp (formato E.164)
      if (!/^\+\d{10,15}$/.test(whatsapp)) {
        console.log(`[AuthService] WhatsApp inválido (não está no formato E.164): ${whatsapp}`);
        return { 
          success: false, 
          message: 'Número de WhatsApp inválido. Use o formato internacional (+XXXXXXXXXXX).' 
        };
      }
      
      // Formatar o número
      const whatsappFormatado = this.formatWhatsApp(whatsapp);
      
      // Buscar a primeira account ativa
      console.log('[AuthService] Buscando account ativa...');
      const defaultAccount = await prisma.account.findFirst({
        where: { ativo: true },
        orderBy: { id: 'asc' }
      });
      
      console.log('[AuthService] Account encontrada:', defaultAccount);
      
      if (!defaultAccount) {
        console.log('[AuthService] Nenhuma account ativa encontrada');
        return { 
          success: false, 
          message: 'Não foi possível encontrar uma conta ativa' 
        };
      }

      // Verificar se o usuário existe e não tem senha
      console.log(`[AuthService] Buscando usuário com WhatsApp ${whatsappFormatado} na account ${defaultAccount.id}`);
      const existingUser = await prisma.usuario.findFirst({
        where: { 
          whatsapp: whatsappFormatado,
          accountId: defaultAccount.id,
          OR: [
            { senha: null },
            { senha: '' }
          ]
        }
      });
      
      console.log('[AuthService] Usuário encontrado:', existingUser);
      
      if (!existingUser) {
        // Vamos verificar se o usuário existe mas já tem senha
        const userWithPassword = await prisma.usuario.findFirst({
          where: { 
            whatsapp: whatsappFormatado,
            accountId: defaultAccount.id,
            NOT: {
              OR: [
                { senha: null },
                { senha: '' }
              ]
            }
          }
        });
        
        console.log('[AuthService] Usuário com senha encontrado:', userWithPassword);
        
        if (userWithPassword) {
          console.log('[AuthService] Usuário já possui senha cadastrada');
          return { 
            success: false, 
            message: 'Este número já possui senha cadastrada. Por favor, faça login normalmente.' 
          };
        } else {
          console.log('[AuthService] Usuário não encontrado na account');
          return { 
            success: false, 
            message: 'Número de WhatsApp não encontrado. Entre em contato com o administrador.' 
          };
        }
      }
      
      // Gerar e enviar o código OTP
      console.log('[AuthService] Gerando código OTP...');
      const { code, expiresAt } = await otpService.createOtp({
        whatsapp: whatsappFormatado,
        accountId: defaultAccount.id
      });
      
      // Enviar o código via WhatsApp
      console.log('[AuthService] Enviando código via WhatsApp...');
      const sent = await otpService.sendOtpWhatsApp(whatsappFormatado, code, defaultAccount.id);
      
      if (!sent) {
        console.log('[AuthService] Falha ao enviar código via WhatsApp');
        return {
          success: false,
          message: 'Não foi possível enviar o código via WhatsApp. Tente novamente.'
        };
      }
      
      console.log('[AuthService] Código enviado com sucesso');
      return {
        success: true,
        message: 'Código enviado com sucesso',
        expiresAt
      };
    } catch (error) {
      console.error('[AuthService] Erro ao solicitar OTP:', error);
      return {
        success: false,
        message: 'Erro ao processar solicitação. Tente novamente.'
      };
    }
  },
  
  // Verificar código OTP
  async verifyOtp(whatsapp: string, code: string): Promise<VerifyOtpResult> {
    try {
      console.log(`[AuthService] Verificando OTP para WhatsApp: ${whatsapp}, Código: ${code}`);
      
      // Formatar o número
      const whatsappFormatado = this.formatWhatsApp(whatsapp);
      
      // Buscar a primeira account ativa
      const defaultAccount = await prisma.account.findFirst({
        where: { ativo: true },
        orderBy: { id: 'asc' }
      });
      
      if (!defaultAccount) {
        console.log('[AuthService] Nenhuma account ativa encontrada');
        return {
          success: false,
          message: 'Não foi possível encontrar uma conta ativa'
        };
      }
      
      // Verificar o código OTP
      const isValid = await otpService.verifyOtp(whatsappFormatado, code, defaultAccount.id);
      
      if (!isValid) {
        console.log('[AuthService] Código OTP inválido');
        return {
          success: false,
          message: 'Código inválido ou expirado'
        };
      }
      
      console.log('[AuthService] Código OTP verificado com sucesso');
      return {
        success: true,
        message: 'Código verificado com sucesso'
      };
    } catch (error) {
      console.error('[AuthService] Erro ao verificar OTP:', error);
      return {
        success: false,
        message: 'Erro ao verificar código. Tente novamente.'
      };
    }
  },
  
  // Criar senha após verificação de OTP
  async createPassword({ whatsapp, senha, nome, accountId }: CreatePasswordData): Promise<LoginResult> {
    try {
      console.log(`[AuthService] Definindo senha para usuário com WhatsApp: ${whatsapp}`);
      
      // Formatar o número
      const whatsappFormatado = this.formatWhatsApp(whatsapp);
      
      // Verificar se o usuário existe e não tem senha
      const existingUser = await prisma.usuario.findFirst({
        where: { 
          whatsapp: whatsappFormatado,
          accountId,
          OR: [
            { senha: null },
            { senha: '' }
          ]
        }
      });
      
      if (!existingUser) {
        console.log('[AuthService] Usuário não encontrado ou já possui senha');
        throw new Error('Usuário não encontrado ou já possui senha cadastrada');
      }
      
      // Hash da senha
      const hashedPassword = await bcrypt.hash(senha, 10);
      
      // Atualizar o usuário com a nova senha
      const updatedUser = await prisma.usuario.update({
        where: { id: existingUser.id },
        data: {
          senha: hashedPassword,
          nome: nome // Atualizar também o nome do usuário
        },
        include: {
          account: {
            select: {
              id: true,
              nome: true,
              ativo: true
            }
          }
        }
      });
      
      // Gerar token JWT
      const jwtSecret = process.env.JWT_SECRET || 'central-celular-secret';
      
      const token = jwt.sign(
        {
          userId: updatedUser.id,
          accountId: updatedUser.accountId,
          isSuperAdmin: updatedUser.isSuperAdmin
        },
        jwtSecret,
        {
          expiresIn: '1d'
        }
      );
      
      // Remover senha do objeto de resposta
      const { senha: _, ...userWithoutPassword } = updatedUser;
      
      return {
        usuario: userWithoutPassword,
        token
      };
    } catch (error) {
      console.error('[AuthService] Erro ao definir senha:', error);
      throw error;
    }
  }
}; 