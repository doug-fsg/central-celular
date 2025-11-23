import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authService } from '../services/authService';
import { passwordResetService } from '../services/passwordResetService';
import { otpService } from '../services/otpService';
import { whatsappService } from '../services/whatsappService';

// Schema de validação para login
const loginSchema = z.object({
  whatsapp: z.string().min(8, 'Número de WhatsApp inválido'),
  senha: z.string(),
  accountId: z.number().optional()
});

// Schema para solicitação de OTP
const requestOtpSchema = z.object({
  whatsapp: z.string().min(8, 'Número de WhatsApp inválido')
});

// Schema para verificação de OTP
const verifyOtpSchema = z.object({
  whatsapp: z.string().min(8, 'Número de WhatsApp inválido'),
  code: z.string().length(4, 'Código deve ter 4 dígitos')
});

// Schema para criação de senha
const createPasswordSchema = z.object({
  whatsapp: z.string().min(8, 'Número de WhatsApp inválido'),
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  dataNascimento: z.string().optional().refine((val) => {
    if (!val) return true;
    const date = new Date(val);
    const hoje = new Date();
    return date <= hoje;
  }, { message: 'A data de nascimento não pode ser no futuro' }),
});

// Schema para solicitação de reset de senha
const requestPasswordResetSchema = z.object({
  whatsapp: z.string().min(8, 'Número de WhatsApp inválido'),
  dataNascimento: z.string().refine((val) => {
    const date = new Date(val);
    const hoje = new Date();
    return date <= hoje;
  }, { message: 'A data de nascimento não pode ser no futuro' }),
});

// Schema para reset de senha
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  novaSenha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

// Schema de validação para registro
const registroSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  whatsapp: z.string().min(8, 'Número de WhatsApp inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  cargo: z.string().min(2, 'Cargo deve ter pelo menos 2 caracteres'),
  accountId: z.number().optional()
});

// Função auxiliar para gerar token JWT
const gerarToken = (userId: number): string => {
  const secret = process.env.JWT_SECRET || 'central-celular-secret';
  console.log('Gerando token JWT com secret:', secret ? 'Secret disponível' : 'Secret NÃO disponível');
  return jwt.sign({ id: userId }, secret, { expiresIn: '7d' });
};

// Controller de autenticação
export const authController = {
  // Login com email/whatsapp e senha
  async login(req: Request, res: Response) {
    try {
      // Validar dados
      const validatedData = loginSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        return res.status(400).json({ errors: validatedData.error.errors });
      }
      
      const { whatsapp, senha, accountId } = validatedData.data;
      
      try {
        // Tentar login
        const result = await authService.login({
          whatsapp,
          senha,
          accountId
        });
        
        return res.json(result);
      } catch (error: any) {
        console.error('Erro no login:', error);
        return res.status(401).json({ message: error.message || 'Credenciais inválidas' });
      }
    } catch (error) {
      console.error('Erro ao processar login:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      
      return res.status(500).json({ message: 'Erro ao processar requisição' });
    }
  },

  // Solicitar código OTP para primeiro acesso
  async requestOtp(req: Request, res: Response) {
    try {
      console.log('[AuthController] Recebendo requisição de OTP:', req.body);
      
      // Validar dados
      const validatedData = requestOtpSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        console.log('[AuthController] Dados inválidos:', validatedData.error.errors);
        return res.status(400).json({ errors: validatedData.error.errors });
      }
      
      const { whatsapp } = validatedData.data;
      console.log('[AuthController] WhatsApp validado:', whatsapp);
      
      // Solicitar OTP
      const result = await authService.requestOtp(whatsapp);
      console.log('[AuthController] Resultado da solicitação:', result);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      return res.json(result);
    } catch (error) {
      console.error('[AuthController] Erro ao processar requisição de OTP:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      
      return res.status(500).json({ message: 'Erro ao processar requisição' });
    }
  },
  
  // Verificar código OTP
  async verifyOtp(req: Request, res: Response) {
    try {
      // Validar dados
      const validatedData = verifyOtpSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        return res.status(400).json({ errors: validatedData.error.errors });
      }
      
      const { whatsapp, code } = validatedData.data;
      
      // Verificar OTP
      const result = await authService.verifyOtp(whatsapp, code);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      return res.json(result);
    } catch (error) {
      console.error('Erro ao verificar OTP:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      
      return res.status(500).json({ message: 'Erro ao processar requisição' });
    }
  },
  
  // Criar senha após verificação de OTP
  async createPassword(req: Request, res: Response) {
    try {
      // Validar dados
      const validatedData = createPasswordSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        return res.status(400).json({ errors: validatedData.error.errors });
      }
      
      const { whatsapp, nome, senha, dataNascimento } = validatedData.data;
      
      // Buscar account padrão
      const defaultAccount = await prisma.account.findFirst({
        where: { ativo: true },
        orderBy: { id: 'asc' }
      });
      
      if (!defaultAccount) {
        return res.status(400).json({ message: 'Nenhuma account ativa encontrada' });
      }
      
      try {
        // Criar usuário e retornar token
        const result = await authService.createPassword({
          whatsapp,
          nome,
          senha,
          dataNascimento: dataNascimento || undefined,
          accountId: defaultAccount.id
        });
        
        return res.status(201).json(result);
      } catch (error: any) {
        console.error('Erro ao criar usuário:', error);
        return res.status(400).json({ message: error.message || 'Erro ao criar usuário' });
      }
    } catch (error) {
      console.error('Erro ao processar criação de senha:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      
      return res.status(500).json({ message: 'Erro ao processar requisição' });
    }
  },

  async registrar(req: Request, res: Response) {
    try {
      // Verificar se está em ambiente de desenvolvimento
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Registro não permitido em produção' });
      }

      const dados = registroSchema.parse(req.body);
      
      // Se não for fornecido accountId, usar a primeira account
      if (!dados.accountId) {
        const defaultAccount = await prisma.account.findFirst({
          where: { ativo: true },
          orderBy: { id: 'asc' }
        });
        
        if (!defaultAccount) {
          return res.status(400).json({ error: 'Nenhuma account ativa encontrada' });
        }
        
        dados.accountId = defaultAccount.id;
      }

      // Verificar se email já existe na mesma account
      if (dados.email) {
        const emailExistente = await prisma.usuario.findFirst({
          where: {
            email: dados.email,
            accountId: dados.accountId
          }
        });

        if (emailExistente) {
          return res.status(400).json({ error: 'Email já está em uso nesta account' });
        }
      }
      
      // Verificar se whatsapp já existe na mesma account
      if (dados.whatsapp) {
        const whatsappExistente = await prisma.usuario.findFirst({
          where: {
            whatsapp: dados.whatsapp,
            accountId: dados.accountId
          }
        });

        if (whatsappExistente) {
          return res.status(400).json({ error: 'WhatsApp já está em uso nesta account' });
        }
      }

      // Verificar se a account existe e está ativa
      const account = await prisma.account.findFirst({
        where: {
          id: dados.accountId,
          ativo: true
        }
      });

      if (!account) {
        return res.status(400).json({ error: 'Account não encontrada ou inativa' });
      }

      // Hash da senha
      const senhaHash = await bcrypt.hash(dados.senha, 10);

      // Criar usuário
      const novoUsuario = await prisma.usuario.create({
        data: {
          nome: dados.nome,
          email: dados.email,
          whatsapp: dados.whatsapp,
          senha: senhaHash,
          cargo: dados.cargo,
          accountId: dados.accountId,
          ativo: true,
          isSuperAdmin: false
        }
      });

      // Gerar token
      const jwtSecret = process.env.JWT_SECRET || 'central-celular-secret';
      
      const token = jwt.sign(
        {
          userId: novoUsuario.id,
          accountId: novoUsuario.accountId,
          isSuperAdmin: novoUsuario.isSuperAdmin
        },
        jwtSecret,
        { expiresIn: '7d' }
      );

      // Retornar dados do usuário (sem a senha) e token
      const { senha: _, ...usuarioSemSenha } = novoUsuario;
      return res.status(201).json({
        user: usuarioSemSenha,
        token
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Dados inválidos', details: error.errors });
      }
      
      console.error('Erro ao registrar:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  },

  verificarToken(req: Request, res: Response) {
    return res.json({ 
      message: 'Token válido', 
      user: req.user 
    });
  },

  // Solicitar reset de senha
  async requestPasswordReset(req: Request, res: Response) {
    try {
      console.log('[AuthController] Recebendo requisição de reset de senha:', req.body);
      
      // Validar dados
      const validatedData = requestPasswordResetSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        console.log('[AuthController] Dados inválidos:', validatedData.error.errors);
        return res.status(400).json({ errors: validatedData.error.errors });
      }
      
      const { whatsapp, dataNascimento } = validatedData.data;
      console.log('[AuthController] WhatsApp e data de nascimento validados');

      // Buscar account padrão
      const defaultAccount = await prisma.account.findFirst({
        where: { ativo: true },
        orderBy: { id: 'asc' }
      });
      
      if (!defaultAccount) {
        return res.status(400).json({ message: 'Nenhuma account ativa encontrada' });
      }

      // Solicitar reset
      const result = await passwordResetService.requestPasswordReset(
        whatsapp,
        dataNascimento,
        defaultAccount.id
      );
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      return res.json(result);
    } catch (error) {
      console.error('[AuthController] Erro ao processar requisição de reset de senha:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      
      return res.status(500).json({ message: 'Erro ao processar requisição' });
    }
  },

  // Verificar token de reset
  async verifyResetToken(req: Request, res: Response) {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ message: 'Token não fornecido' });
      }

      // Buscar account padrão
      const defaultAccount = await prisma.account.findFirst({
        where: { ativo: true },
        orderBy: { id: 'asc' }
      });
      
      if (!defaultAccount) {
        return res.status(400).json({ message: 'Nenhuma account ativa encontrada' });
      }

      // Verificar token
      const result = await passwordResetService.verifyResetToken(token, defaultAccount.id);
      
      if (!result.valid) {
        return res.status(400).json({ message: result.message });
      }
      
      return res.json(result);
    } catch (error) {
      console.error('[AuthController] Erro ao verificar token de reset:', error);
      return res.status(500).json({ message: 'Erro ao processar requisição' });
    }
  },

  // Redefinir senha
  async resetPassword(req: Request, res: Response) {
    try {
      // Validar dados
      const validatedData = resetPasswordSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        return res.status(400).json({ errors: validatedData.error.errors });
      }
      
      const { token, novaSenha } = validatedData.data;

      // Buscar account padrão
      const defaultAccount = await prisma.account.findFirst({
        where: { ativo: true },
        orderBy: { id: 'asc' }
      });
      
      if (!defaultAccount) {
        return res.status(400).json({ message: 'Nenhuma account ativa encontrada' });
      }

      // Redefinir senha
      const result = await passwordResetService.resetPassword(token, novaSenha, defaultAccount.id);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      return res.json(result);
    } catch (error) {
      console.error('[AuthController] Erro ao redefinir senha:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      
      return res.status(500).json({ message: 'Erro ao processar requisição' });
    }
  },

  // Verificar token de convite (link direto)
  async verifyInviteToken(req: Request, res: Response) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ message: 'Token não fornecido' });
      }

      console.log('[AuthController] Verificando token de convite:', token.substring(0, 8) + '...');

      // Buscar account padrão
      const defaultAccount = await prisma.account.findFirst({
        where: { ativo: true },
        orderBy: { id: 'asc' }
      });

      if (!defaultAccount) {
        return res.status(400).json({ message: 'Nenhuma account ativa encontrada' });
      }

      // Buscar OTP pelo token (token é único, não precisa de WhatsApp)
      const otpRecord = await prisma.otpCode.findFirst({
        where: {
          code: token,
          expiresAt: { gt: new Date() },
          used: false,
          accountId: defaultAccount.id
        }
      });

      if (!otpRecord) {
        console.log('[AuthController] Token de convite inválido ou expirado');
        return res.status(400).json({ message: 'Link de convite inválido ou expirado' });
      }

      console.log('[AuthController] WhatsApp do OTP (original):', otpRecord.whatsapp);

      // Normalizar WhatsApp do OTP usando a mesma função usada ao criar o usuário
      const digits = otpRecord.whatsapp.replace(/\D/g, '');
      const whatsappNormalizado = digits.startsWith('55') && (digits.length === 12 || digits.length === 13)
        ? digits
        : digits.length <= 11
          ? `55${digits}`
          : digits;

      console.log('[AuthController] WhatsApp normalizado:', whatsappNormalizado);
      console.log('[AuthController] Buscando usuário na account:', defaultAccount.id);

      // Buscar usuário pelo WhatsApp normalizado
      const usuario = await prisma.usuario.findFirst({
        where: {
          whatsapp: whatsappNormalizado,
          accountId: defaultAccount.id,
          ativo: true
        },
        select: {
          id: true,
          nome: true,
          whatsapp: true,
          cargo: true,
          dataNascimento: true
        }
      });

      if (!usuario) {
        console.log('[AuthController] Usuário não encontrado para o token');
        // Debug: listar alguns usuários para ver o formato
        const usuariosDebug = await prisma.usuario.findMany({
          where: { accountId: defaultAccount.id, ativo: true },
          select: { id: true, nome: true, whatsapp: true },
          take: 5
        });
        console.log('[AuthController] Usuários na account (primeiros 5):', usuariosDebug);
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      console.log('[AuthController] Usuário encontrado:', usuario.nome, 'WhatsApp:', usuario.whatsapp);

      // Verificar se usuário já tem senha
      const usuarioCompleto = await prisma.usuario.findUnique({
        where: { id: usuario.id },
        select: { senha: true }
      });

      if (usuarioCompleto?.senha) {
        console.log('[AuthController] Usuário já possui senha cadastrada');
        return res.status(400).json({ message: 'Este link já foi utilizado. Você já possui senha cadastrada.' });
      }

      console.log('[AuthController] Token de convite válido para usuário:', usuario.nome);

      return res.json({
        success: true,
        message: 'Token válido',
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          whatsapp: usuario.whatsapp,
          cargo: usuario.cargo,
          dataNascimento: usuario.dataNascimento
        }
      });
    } catch (error) {
      console.error('Erro ao verificar token de convite:', error);
      return res.status(500).json({ message: 'Erro ao processar requisição' });
    }
  }
}; 