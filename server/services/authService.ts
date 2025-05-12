import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

interface LoginData {
  email: string;
  senha: string;
  accountId?: number;
}

interface LoginResult {
  user?: any;
  usuario?: any;
  token: string;
}

export const authService = {
  async login({ email, senha, accountId }: LoginData): Promise<LoginResult> {
    console.log(`[AuthService] Iniciando login - Email: ${email}, AccountId: ${accountId || 'não fornecido'}`);
    
    // Se não for fornecido accountId, busca o usuário em qualquer account
    const whereClause = accountId 
      ? { email, accountId } 
      : { email };

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
    
    console.log('[AuthService] Login concluído com sucesso');
    
    return {
      // Novo formato
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        cargo: user.cargo,
        accountId: user.accountId,
        isSuperAdmin: user.isSuperAdmin,
        account: {
          id: user.account.id,
          nome: user.account.nome
        }
      },
      // Formato antigo (para compatibilidade)
      usuario: userWithoutPassword,
      token
    };
  }
}; 