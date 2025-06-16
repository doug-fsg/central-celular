import { Router } from 'express';
import { usuarioConfigController } from '../controllers/usuarioConfigController';

const router = Router();

// Rotas de configuração de usuário
router.get('/', usuarioConfigController.getConfig);
router.put('/', usuarioConfigController.updateConfig);

// Rota de teste para notificações (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  router.post('/test-notification', usuarioConfigController.testAniversarioNotification);
}

export default router; 