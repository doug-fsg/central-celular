import { Router } from 'express';
import { accountController } from '../controllers/accountController';
import { accountMiddleware, superAdminMiddleware } from '../middlewares/accountMiddleware';

const accountRoutes = Router();

accountRoutes.use(accountMiddleware);
accountRoutes.use(superAdminMiddleware);

accountRoutes.post('/', accountController.create);
accountRoutes.get('/', accountController.list);
accountRoutes.patch('/:id/toggle-active', accountController.toggleActive);

export { accountRoutes }; 