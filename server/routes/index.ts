import express, { Router } from 'express';
import { authRoutes } from './auth.routes';
import { accountRoutes } from './accountRoutes';
import { autenticacao } from '../middlewares/auth.middleware';
import { accountMiddleware } from '../middlewares/accountMiddleware';
import celulasRoutes from './celulas.routes';
import relatoriosRoutes from './relatorios.routes';
import usuariosRoutes from './usuarios.routes';
import usuarioConfigRoutes from './usuarioConfig';
import { whatsappRoutes } from './whatsapp.routes';
import { publicSsoRouter, adminSsoRouter } from './ssoLink.routes';

// Crie o router principal
const router = Router();

// Rotas públicas
router.use('/api/auth', authRoutes);
router.use('/api/sso', publicSsoRouter);

// Rota para aplicar autenticação a todas as demais rotas da API
router.use('/api', autenticacao);

// Rotas protegidas (após autenticação)
router.use('/api/celulas', celulasRoutes);
router.use('/api/relatorios', relatoriosRoutes);
router.use('/api/usuarios', usuariosRoutes);
router.use('/api/usuario/config', usuarioConfigRoutes);
router.use('/api/whatsapp', whatsappRoutes);
router.use('/api/sso', adminSsoRouter); // Rotas de admin do SSO

// Rotas de account (usando middleware específico)
router.use('/api/accounts', accountMiddleware, accountRoutes);

export { router }; 