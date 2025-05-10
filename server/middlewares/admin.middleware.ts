import { Request, Response, NextFunction } from 'express';

// Middleware para verificar se o usuário é administrador
export const verificarAdmin = (req: Request, res: Response, next: NextFunction) => {
  const usuario = (req as any).usuario;

  if (!usuario) {
    return res.status(401).json({ message: 'Usuário não autenticado' });
  }

  if (usuario.cargo !== 'ADMINISTRADOR' && usuario.cargo !== 'PASTOR') {
    return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar este recurso.' });
  }

  next();
}; 