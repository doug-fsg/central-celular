import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

// Interface para tipo do token decodificado
interface TokenPayload {
  id?: number;       // formato antigo
  userId?: number;   // formato novo
  accountId?: number; // formato novo
  isSuperAdmin?: boolean; // formato novo
}

// Adicionar type para o request
declare global {
  namespace Express {
    interface Request {
      usuario?: any;
      user?: {
        id: number;
        accountId: number;
        isSuperAdmin: boolean;
      };
    }
  }
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

    // Determinar o ID do usuário (compatível com ambos os formatos)
    const userId = decoded.userId || decoded.id;
    const accountId = decoded.accountId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Token não contém ID do usuário' });
    }
    
    // Buscar usuário pelo ID no token
    const queryWhere = accountId 
      ? { id: userId, accountId } 
      : { id: userId };
      
    const usuario = await prisma.usuario.findFirst({ 
      where: queryWhere,
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

    // Verificar se o usuário existe e está ativo
    if (!usuario) {
      return res.status(401).json({ message: 'Usuário não encontrado' });
    }

    if (!usuario.ativo) {
      return res.status(403).json({ message: 'Usuário desativado' });
    }

    // Verificar se a account está ativa
    if (usuario.account && !usuario.account.ativo) {
      return res.status(403).json({ message: 'Account desativada' });
    }

    // Adicionar o usuário à requisição (compatível com ambos os formatos)
    const { senha, ...usuarioSemSenha } = usuario;
    
    // Formato antigo - para compatibilidade
    req.usuario = usuarioSemSenha;
    
    // Formato novo
    req.user = {
      id: usuario.id,
      accountId: usuario.accountId,
      isSuperAdmin: usuario.isSuperAdmin || false
    };

    // Continuar para o próximo middleware/controller
    return next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Token inválido' });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expirado' });
    }
    
    return res.status(500).json({ message: 'Erro na autenticação' });
  }
}; 