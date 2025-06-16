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
  toggleAtivoMembro,
  marcarComoConsolidador,
  marcarComoCoLider,
  marcarComoAnfitriao,
  atualizarMembro
} from '../controllers/celulas.controller';

const router = Router();

// Rotas para células
router.get('/', listarCelulas);
router.get('/:id', obterCelula);
router.post('/', criarCelula);
router.put('/:id', atualizarCelula);
router.patch('/:id/desativar', desativarCelula);

// Rotas para membros da célula
router.post('/:id/membros', adicionarMembro);
router.patch('/:id/membros/:membroId', atualizarMembro);
router.delete('/:id/membros/:membroId', removerMembro);
router.patch('/:id/membros/:membroId/status', atualizarStatusMembro);
router.patch('/:id/membros/:membroId/ativo', toggleAtivoMembro);
router.patch('/:id/membros/:membroId/consolidador', marcarComoConsolidador);
router.patch('/:id/membros/:membroId/colider', marcarComoCoLider);
router.patch('/:id/membros/:membroId/anfitriao', marcarComoAnfitriao);

export default router; 