import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authService } from '../services/authService';

// Schema de validação para login
const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string(),
  accountId: z.number().optional()
});

// Schema de validação para registro
const registroSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  cargo: z.string().min(2, 'Cargo deve ter pelo menos 2 caracteres'),
  accountId: z.number().optional()
});

// Função auxiliar para gerar token JWT
const gerarToken = (userId: number): string => {
  const secret = process.env.JWT_SECRET || 'central-celular-secret';
  console.log('Gerando token JWT com secret:', secret ? 'Secret disponível' : 'Secret NÃO disponível');
  return jwt.sign({ id: userId }, secret, { expiresIn: '24h' });
};

// Controller de autenticação
export const authController = {
  async login(req: Request, res: Response) {
    try {
      // Manter compatibilidade com o formato antigo
      const { email, senha, accountId } = req.body;
      console.log(`Tentativa de login - Email: ${email}, AccountId: ${accountId || 'não fornecido'}`);
      
      // Se não for fornecido accountId, buscar account padrão
      if (!accountId) {
        console.log('AccountId não fornecido, buscando account padrão');
        // Buscar a primeira account ativa para compatibilidade
        const defaultAccount = await prisma.account.findFirst({
          where: { ativo: true },
          orderBy: { id: 'asc' }
        });
        
        console.log('Account padrão encontrada:', defaultAccount);
        
        if (!defaultAccount) {
          return res.status(400).json({ message: 'Nenhuma account ativa encontrada' });
        }
        
        try {
          console.log(`Tentando login com accountId padrão: ${defaultAccount.id}`);
          const result = await authService.login({
            email,
            senha,
            accountId: defaultAccount.id
          });
          
          console.log('Login bem-sucedido com account padrão');
          return res.json(result);
        } catch (error) {
          console.log('Erro no login com account padrão, tentando formato antigo', error);
          // Tentar o formato antigo em caso de erro
          const usuario = await prisma.usuario.findFirst({ 
            where: { email, ativo: true },
            include: {
              account: true
            }
          });
          
          if (!usuario) {
            console.log('Usuário não encontrado');
            return res.status(401).json({ message: 'Credenciais inválidas' });
          }
          
          console.log('Usuário encontrado, verificando senha');
          const senhaValida = await bcrypt.compare(senha, usuario.senha);
          if (!senhaValida) {
            console.log('Senha inválida');
            return res.status(401).json({ message: 'Credenciais inválidas' });
          }
          
          console.log('Gerando token JWT para o formato antigo');
          const jwtSecret = process.env.JWT_SECRET || 'central-celular-secret';
          console.log('JWT Secret disponível:', !!jwtSecret);
          
          const token = jwt.sign(
            {
              userId: usuario.id,
              accountId: usuario.accountId,
              isSuperAdmin: usuario.isSuperAdmin
            },
            jwtSecret,
            { expiresIn: '1d' }
          );
          
          console.log('Token gerado com sucesso');
          const { senha: _, ...usuarioSemSenha } = usuario;
          return res.json({
            usuario: usuarioSemSenha,
            token
          });
        }
      } else {
        // Usar o novo formato quando accountId for fornecido
        console.log(`Usando formato novo com accountId: ${accountId}`);
        const result = await authService.login({
          email,
          senha,
          accountId
        });
        
        console.log('Login bem-sucedido com formato novo');
        return res.json(result);
      }
    } catch (error) {
      console.error('Erro ao processar login:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      
      return res.status(401).json({ message: 'Erro ao processar requisição' });
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
      const usuarioExistente = await prisma.usuario.findFirst({
        where: {
          email: dados.email,
          accountId: dados.accountId
        }
      });

      if (usuarioExistente) {
        return res.status(400).json({ error: 'Email já está em uso nesta account' });
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