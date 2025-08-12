import { Router } from 'express';
import { 
  listarRelatorios,
  obterRelatorio,
  criarRelatorio,
  atualizarRelatorio,
  registrarPresenca,
  obterEstatisticas,
  enviarRelatorio,
  obterFrequenciaPorData
} from '../controllers/relatorios.controller';
import { Request, Response, NextFunction } from 'express';
import { accountMiddleware } from '../middlewares/accountMiddleware';

const router = Router();

// Aplicar middleware de account em todas as rotas
router.use(accountMiddleware);

// Rotas para estatísticas
router.get('/estatisticas/lideres/:mes/:ano', obterEstatisticas);
router.get('/estatisticas/:celulaId', obterEstatisticas);
router.get('/frequencia-por-data', obterFrequenciaPorData);

// Rotas básicas para relatórios
router.get('/', listarRelatorios);
router.get('/:id', obterRelatorio);
router.post('/', criarRelatorio);
router.put('/:id', atualizarRelatorio);
router.post('/:id/enviar', enviarRelatorio);
router.post('/:id/presencas', registrarPresenca);

export default router; 