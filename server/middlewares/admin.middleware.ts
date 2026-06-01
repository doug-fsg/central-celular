import { Request, Response, NextFunction } from 'express';
import { canAccessChurchAdminPanel, CARGO } from '../lib/roles';

/** Painel admin da igreja: PASTOR ou dono da plataforma (isSuperAdmin). */
export const verificarAdmin = (req: Request, res: Response, next: NextFunction) => {
  const isSuperAdmin = req.user?.isSuperAdmin === true;
  const cargo = (req.usuario?.cargo ?? '').toUpperCase();

  if (canAccessChurchAdminPanel(cargo, isSuperAdmin)) {
    return next();
  }

  if (cargo === CARGO.ADMINISTRADOR && !isSuperAdmin) {
    return res.status(403).json({
      message:
        'Este perfil é reservado ao dono da plataforma. Peça para ativar Super Admin na sua conta ou use o cargo Pastor para administrar a igreja.',
    });
  }

  return res.status(403).json({
    message: 'Acesso negado. Apenas pastores ou o dono da plataforma podem acessar este recurso.',
  });
};
