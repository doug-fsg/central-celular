import { Request, Response, NextFunction } from 'express';

// Middleware para verificar se o usuário é administrador
export const verificarAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Verificar primeiro o formato novo
  if (req.user) {
    // TODO: Verificar o cargo no formato novo quando implementado
    // Por enquanto, permitir se for super admin
    if (req.user.isSuperAdmin) {
      console.log('[verificarAdmin] Usuário é super admin');
      return next();
    }
  }
  
  // Verificar formato antigo
  const usuario = req.usuario;

  if (!usuario) {
    console.log('[verificarAdmin] Usuário não autenticado');
    return res.status(401).json({ message: 'Usuário não autenticado' });
  }

  console.log('[verificarAdmin] Cargo do usuário:', usuario.cargo);
  
  if (usuario.cargo !== 'ADMINISTRADOR' && usuario.cargo !== 'PASTOR') {
    console.log('[verificarAdmin] Acesso negado - cargo inválido');
    return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar este recurso.' });
  }

  console.log('[verificarAdmin] Usuário tem permissão de admin');
  next();
}; 