import { Router } from 'express';
import { 
  listarCelulas,
  obterCelula,
  criarCelula,
  atualizarCelula,
  desativarCelula,
  adicionarMembro,
  removerMembro,
  atualizarStatusMembro,
  marcarComoConsolidador
} from '../controllers/celulas.controller';
import { autenticacao } from '../middlewares/auth.middleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(autenticacao);

// Rotas para células
router.get('/', listarCelulas);
router.get('/:id', obterCelula);
router.post('/', criarCelula);
router.put('/:id', atualizarCelula);
router.patch('/:id/desativar', desativarCelula);

// Rotas para membros da célula
router.post('/:id/membros', adicionarMembro);
router.delete('/:id/membros/:membroId', removerMembro);
router.patch('/:id/membros/:membroId/status', atualizarStatusMembro);
router.patch('/:id/membros/:membroId/consolidador', marcarComoConsolidador);

export default router; 