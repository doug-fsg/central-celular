import { Router } from 'express';
import { 
  listarRelatorios,
  obterRelatorio,
  criarRelatorio,
  atualizarRelatorio,
  registrarPresenca,
  obterEstatisticas,
  enviarRelatorio
} from '../controllers/relatorios.controller';
import { Request, Response, NextFunction } from 'express';

const router = Router();

// Rotas para estatísticas
router.get('/estatisticas/lideres/:mes/:ano', obterEstatisticas);
router.get('/estatisticas/:celulaId', obterEstatisticas);

// Rotas básicas para relatórios
router.get('/', listarRelatorios);
router.get('/:id', obterRelatorio);
router.post('/', criarRelatorio);
router.put('/:id', atualizarRelatorio);
router.post('/:id/enviar', enviarRelatorio);
router.post('/:id/presencas', registrarPresenca);

export default router; 