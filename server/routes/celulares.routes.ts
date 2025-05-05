import { Router } from 'express';
import { 
  listarCelulares,
  obterCelular,
  criarCelular,
  atualizarCelular,
  atualizarStatusCelular,
  deletarCelular,
  atribuirCelularUsuario,
  removerCelularUsuario
} from '../controllers/celulares.controller';
import { autenticacao } from '../middlewares/auth.middleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(autenticacao);

// Rotas para celulares
router.get('/', listarCelulares);
router.get('/:id', obterCelular);
router.post('/', criarCelular);
router.put('/:id', atualizarCelular);
router.patch('/:id/status', atualizarStatusCelular);
router.delete('/:id', deletarCelular);

// Rotas para atribuição de celulares
router.post('/:id/atribuir/:usuarioId', atribuirCelularUsuario);
router.post('/:id/remover', removerCelularUsuario);

export default router; 