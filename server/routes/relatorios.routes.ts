import { Router } from 'express';
import { 
  listarRelatorios,
  obterRelatorio,
  criarRelatorio,
  atualizarRelatorio,
  registrarPresenca,
  obterEstatisticas,
  enviarRelatorio,
  obterFrequenciaPorData,
  obterFrequenciaMembro
} from '../controllers/relatorios.controller';
const router = Router();

// Autenticação: router global em routes/index.ts já aplica autenticacao em /api/*

// Rotas para estatísticas
router.get('/estatisticas/lideres/:mes/:ano', obterEstatisticas);
router.get('/estatisticas/:celulaId', obterEstatisticas);
router.get('/frequencia-por-data', obterFrequenciaPorData);
router.get('/membro/:membroId/celula/:celulaId', obterFrequenciaMembro);

// Rotas básicas para relatórios
router.get('/', listarRelatorios);
router.get('/:id', obterRelatorio);
router.post('/', criarRelatorio);
router.put('/:id', atualizarRelatorio);
router.post('/:id/enviar', enviarRelatorio);
router.post('/:id/presencas', registrarPresenca);

export default router; 