import { Router, json } from 'express';
import {
  listarUsuarios,
  obterUsuario,
  alterarSenha,
  listarCelularesUsuario,
  uploadAvatarProprio,
  removerAvatarProprio,
  atualizarPerfilProprio,
  obterPerfilProprio,
} from '../controllers/usuarios.controller';
import { autenticacao } from '../middlewares/auth.middleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(autenticacao);

// Perfil do usuário logado
router.get('/me', obterPerfilProprio);
router.patch('/me', atualizarPerfilProprio);
router.post('/me/avatar', json({ limit: '5mb' }), uploadAvatarProprio);
router.delete('/me/avatar', removerAvatarProprio);

// Rotas para usuários
router.get('/', listarUsuarios);
router.get('/:id', obterUsuario);
router.post('/:id/senha', alterarSenha);

// Rotas para celulares do usuário
router.get('/:id/celulares', listarCelularesUsuario);

export default router;
