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
  atualizarMembro,
  moverMembro,
  listarMembros
} from '../controllers/celulas.controller';
import {
  obterRedeCuidado,
  criarAtribuicao,
  removerAtribuicao,
  salvarRedeLote,
} from '../controllers/redeCuidado.controller';

const router = Router();

// Rotas para células
router.get('/', listarCelulas);
router.get('/:id', obterCelula);
router.get('/:id/membros', listarMembros);
router.post('/', criarCelula);
router.put('/:id', atualizarCelula);
router.patch('/:id/desativar', desativarCelula);

// Rotas para membros da célula
router.post('/:id/membros', adicionarMembro);
router.patch('/:id/membros/:membroId', atualizarMembro);
router.patch('/:id/membros/:membroId/mover', moverMembro);
router.delete('/:id/membros/:membroId', removerMembro);
router.patch('/:id/membros/:membroId/status', atualizarStatusMembro);
router.patch('/:id/membros/:membroId/ativo', toggleAtivoMembro);
router.patch('/:id/membros/:membroId/consolidador', marcarComoConsolidador);
router.patch('/:id/membros/:membroId/colider', marcarComoCoLider);
router.patch('/:id/membros/:membroId/anfitriao', marcarComoAnfitriao);

// Rotas para rede de cuidado
router.get('/:id/rede-cuidado', obterRedeCuidado);
router.post('/:id/rede-cuidado', criarAtribuicao);
router.put('/:id/rede-cuidado', salvarRedeLote);
router.delete('/:id/rede-cuidado/:membroId', removerAtribuicao);

export default router; 