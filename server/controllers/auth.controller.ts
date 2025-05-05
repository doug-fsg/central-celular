import { Request, Response } from 'express';
import { prisma } from '../index';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// Schema de validação para login
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
});

// Schema de validação para registro
const registroSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  cargo: z.string().min(2, 'Cargo deve ter pelo menos 2 caracteres')
});

// Função auxiliar para gerar token JWT
const gerarToken = (userId: number): string => {
  const secret = process.env.JWT_SECRET || 'central-celular-secret';
  return jwt.sign({ id: userId }, secret, { expiresIn: '24h' });
};

// Controller de login
export const login = async (req: Request, res: Response) => {
  try {
    // Validar dados de entrada
    const { email, senha } = loginSchema.parse(req.body);

    // Buscar usuário pelo email
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Verificar se o usuário está ativo
    if (!usuario.ativo) {
      return res.status(403).json({ message: 'Usuário desativado' });
    }

    // Verificar senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Gerar token JWT
    const token = gerarToken(usuario.id);

    // Retornar dados do usuário (sem a senha) e token
    const { senha: _, ...usuarioSemSenha } = usuario;
    res.json({
      usuario: usuarioSemSenha,
      token
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ message: 'Erro ao processar login' });
  }
};

// Controller de registro
export const registrar = async (req: Request, res: Response) => {
  try {
    // Verificar se está em ambiente de desenvolvimento
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'Registro não permitido em produção' });
    }

    // Validar dados de entrada
    const { nome, email, senha, cargo } = registroSchema.parse(req.body);

    // Verificar se email já existe
    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExistente) {
      return res.status(400).json({ message: 'Email já está em uso' });
    }

    // Hash da senha
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    // Criar usuário
    const novoUsuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        cargo,
        ativo: true
      }
    });

    // Gerar token JWT
    const token = gerarToken(novoUsuario.id);

    // Retornar dados do usuário (sem a senha) e token
    const { senha: _, ...usuarioSemSenha } = novoUsuario;
    res.status(201).json({
      usuario: usuarioSemSenha,
      token
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    
    console.error('Erro ao registrar:', error);
    res.status(500).json({ message: 'Erro ao processar registro' });
  }
};

// Controller para verificar token
export const verificarToken = async (req: Request, res: Response) => {
  // O middleware de autenticação já verificou o token
  // e adicionou o usuário na requisição
  res.json({ 
    message: 'Token válido', 
    usuario: (req as any).usuario 
  });
}; 