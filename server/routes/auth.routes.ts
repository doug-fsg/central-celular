import { Router } from 'express';
import { login, registrar, verificarToken } from '../controllers/auth.controller';
import { autenticacao } from '../middlewares/auth.middleware';

const router = Router();

// Rota para login
router.post('/login', login);

// Rota para registro (disponível apenas em ambiente de desenvolvimento)
router.post('/registrar', registrar);

// Rota para verificar token
router.get('/verificar', autenticacao, verificarToken);

export default router; 