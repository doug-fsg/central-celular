import { Router } from 'express';
import { whatsappController } from '../controllers/whatsapp.controller';
import { accountMiddleware } from '../middlewares/accountMiddleware';

const whatsappRoutes = Router();

// Aplicar middleware de autenticação em todas as rotas
whatsappRoutes.use(accountMiddleware);

// Rotas de conexão
whatsappRoutes.post('/connections', whatsappController.createConnection);
whatsappRoutes.get('/connections', whatsappController.listConnections);
whatsappRoutes.get('/connections/active', whatsappController.hasActiveConnection);
whatsappRoutes.get('/connections/:token', whatsappController.checkConnection);
whatsappRoutes.patch('/connections/:token', whatsappController.updateConnectionStatus);
whatsappRoutes.delete('/connections/:token', whatsappController.deleteConnection);

export { whatsappRoutes }; 