import { Router } from 'express';
import { ssoLinkController } from '../controllers/ssoLinkController';
import { verificarAdmin } from '../middlewares/admin.middleware';

const publicSsoRouter = Router();
const adminSsoRouter = Router();

// Rota pública para validar link SSO
publicSsoRouter.get('/validate/:token', ssoLinkController.validarLink);

// Rotas protegidas por autenticação de admin.
// O middleware 'autenticacao' principal será aplicado antes deste router.
// Portanto, só precisamos adicionar o middleware 'verificarAdmin' aqui.
adminSsoRouter.use(verificarAdmin);

// Configuração de envio automático
adminSsoRouter.get('/config', ssoLinkController.getConfig);
adminSsoRouter.put('/config', ssoLinkController.updateConfig);

// Gerar e enviar link para um líder específico
adminSsoRouter.post('/gerar/:usuarioId', ssoLinkController.gerarEnviarLink);

// Executar job manualmente (apenas em ambiente de desenvolvimento)
adminSsoRouter.post('/executar-job', ssoLinkController.executarJob);

export { publicSsoRouter, adminSsoRouter }; 