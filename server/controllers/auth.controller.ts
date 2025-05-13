import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authService } from '../services/authService';

// Schema de validação para login
const loginSchema = z.object({
  email: z.string().email().optional(),
  whatsapp: z.string().optional(),
  senha: z.string(),
  accountId: z.number().optional()
}).refine(data => data.email || data.whatsapp, {
  message: "Email ou WhatsApp deve ser fornecido",
  path: ['email']
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
});

// Schema de validação para registro
const registroSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido').optional(),
  whatsapp: z.string().optional(),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  cargo: z.string().min(2, 'Cargo deve ter pelo menos 2 caracteres'),
  accountId: z.number().optional()
}).refine(data => data.email || data.whatsapp, {
  message: "Email ou WhatsApp deve ser fornecido",
  path: ['email']
});

// Função auxiliar para gerar token JWT
const gerarToken = (userId: number): string => {
  const secret = process.env.JWT_SECRET || 'central-celular-secret';
  console.log('Gerando token JWT com secret:', secret ? 'Secret disponível' : 'Secret NÃO disponível');
  return jwt.sign({ id: userId }, secret, { expiresIn: '24h' });
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
      
      const { email, whatsapp, senha, accountId } = validatedData.data;
      
      try {
        // Tentar login
        const result = await authService.login({
          email,
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
      
      const { whatsapp, nome, senha } = validatedData.data;
      
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
        { expiresIn: '1d' }
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
  }
}; 