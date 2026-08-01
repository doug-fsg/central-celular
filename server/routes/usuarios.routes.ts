import { Router, json } from 'express';
import {
  listarUsuarios,
  obterUsuario,
  alterarSenha,
  listarCelularesUsuario,
  uploadAvatarProprio,
  removerAvatarProprio,
} from '../controllers/usuarios.controller';
import { autenticacao } from '../middlewares/auth.middleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(autenticacao);

// Avatar do usuário logado (parser dedicado para acomodar imagens base64)
router.post('/me/avatar', json({ limit: '5mb' }), uploadAvatarProprio);
router.delete('/me/avatar', removerAvatarProprio);

// Rotas para usuários
router.get('/', listarUsuarios);
router.get('/:id', obterUsuario);
router.post('/:id/senha', alterarSenha);

// Rotas para celulares do usuário
router.get('/:id/celulares', listarCelularesUsuario);

export default router;
