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
import { autenticacao } from '../middlewares/auth.middleware';
import { Request, Response, NextFunction } from 'express';

const router = Router();

// Todas as rotas requerem autenticação
router.use(autenticacao);

// Rotas para relatórios
router.get('/', listarRelatorios);
router.get('/:id', obterRelatorio);
router.post('/', criarRelatorio);
router.put('/:id', atualizarRelatorio);

// Rota para enviar relatório - com middleware para converter Request para AuthRequest
router.post('/:id/enviar', (req: Request, res: Response, next: NextFunction) => {
  // O middleware de autenticação já adicionou o usuário ao req
  if (!req.usuario) {
    return res.status(401).json({ message: 'Não autorizado' });
  }
  
  // Adaptar o objeto Request para o formato AuthRequest
  const authReq = req as any;
  // Define corretamente o objeto auth baseado no usuario definido pelo middleware
  authReq.auth = {
    id: authReq.usuario.id,
    email: authReq.usuario.email,
    cargo: authReq.usuario.cargo
  };
  
  console.log('[DEBUG] Route /relatorios/:id/enviar - Auth transformado:', authReq.auth);
  
  // Chamar o controlador com o request já autenticado
  return enviarRelatorio(authReq, res);
});

// Rotas para presença
router.post('/:id/presencas', registrarPresenca);

// Rotas para estatísticas
router.get('/estatisticas/:celulaId', obterEstatisticas);
router.get('/estatisticas/lideres/:mes/:ano', obterEstatisticas);

export default router; 