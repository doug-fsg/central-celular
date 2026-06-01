import { Router } from 'express';
import { accountController } from '../controllers/accountController';
import { superAdminMiddleware } from '../middlewares/accountMiddleware';

const accountRoutes = Router();

accountRoutes.use(superAdminMiddleware);

accountRoutes.post('/', accountController.create);
accountRoutes.get('/', accountController.list);
accountRoutes.get('/:id/usuarios', accountController.listUsuarios);
accountRoutes.patch('/:id/toggle-active', accountController.toggleActive);

export { accountRoutes };
