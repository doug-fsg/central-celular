import { Router } from 'express';
import {
  listarUsuarios,
  obterUsuario,
  criarUsuario,
  atualizarUsuario,
  ativarDesativarUsuario,
  alterarSenha,
  listarCelularesUsuario
} from '../controllers/usuarios.controller';
import { autenticacao } from '../middlewares/auth.middleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(autenticacao);

// Rotas para usuários
router.get('/', listarUsuarios);
router.get('/:id', obterUsuario);
router.post('/', criarUsuario);
router.put('/:id', atualizarUsuario);
router.patch('/:id/status', ativarDesativarUsuario);
router.post('/:id/senha', alterarSenha);

// Rotas para celulares do usuário
router.get('/:id/celulares', listarCelularesUsuario);

export default router; 