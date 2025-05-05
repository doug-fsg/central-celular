import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';

// Interface para tipo do token decodificado
interface TokenPayload {
  id: number;
}

// Middleware de autenticação
export const autenticacao = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    // Obter o token do header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    // Verificar formato do token (Bearer <token>)
    const parts = authHeader.split(' ');
    if (parts.length !== 2) {
      return res.status(401).json({ message: 'Erro no formato do token' });
    }

    const [scheme, token] = parts;
    if (!/^Bearer$/i.test(scheme)) {
      return res.status(401).json({ message: 'Formato de token inválido' });
    }

    // Verificar e decodificar o token
    const secret = process.env.JWT_SECRET || 'central-celular-secret';
    const decoded = jwt.verify(token, secret) as TokenPayload;

    // Buscar usuário pelo ID no token
    const usuario = await prisma.usuario.findUnique({ 
      where: { id: decoded.id } 
    });

    // Verificar se o usuário existe e está ativo
    if (!usuario) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    if (!usuario.ativo) {
      return res.status(403).json({ message: 'Usuário desativado' });
    }

    // Adicionar o usuário à requisição para uso em outros middlewares/controllers
    const { senha, ...usuarioSemSenha } = usuario;
    (req as any).usuario = usuarioSemSenha;

    // Continuar para o próximo middleware/controller
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Token inválido' });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expirado' });
    }
    
    console.error('Erro na autenticação:', error);
    return res.status(500).json({ message: 'Erro na autenticação' });
  }
}; 