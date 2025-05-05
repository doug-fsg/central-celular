import { Router } from 'express';
import {
  registrarUso,
  finalizarUso,
  listarHistoricoUso,
  registrarManutencao,
  finalizarManutencao,
  listarHistoricoManutencao
} from '../controllers/historico.controller';
import { autenticacao } from '../middlewares/auth.middleware';

const router = Router();

// Todas as rotas requerem autenticação
router.use(autenticacao);

// Rotas para histórico de uso
router.get('/uso', listarHistoricoUso);
router.post('/uso/:celularId', registrarUso);
router.put('/uso/:id/finalizar', finalizarUso);

// Rotas para histórico de manutenção
router.get('/manutencao', listarHistoricoManutencao);
router.post('/manutencao/:celularId', registrarManutencao);
router.put('/manutencao/:id/finalizar', finalizarManutencao);

export default router; 