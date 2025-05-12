import express, { Router } from 'express';
import { authRoutes } from './auth.routes';
import { accountRoutes } from './accountRoutes';
import { autenticacao } from '../middlewares/auth.middleware';
import { accountMiddleware } from '../middlewares/accountMiddleware';
import celulasRoutes from './celulas.routes';
import relatoriosRoutes from './relatorios.routes';

// Em vez de verificar se os arquivos existem, simplesmente importe
import usuariosRoutes from './usuarios.routes';

// Crie o router principal
const router = Router();

// Rotas públicas de autenticação
router.use('/api/auth', authRoutes);

// Rota para aplicar autenticação a todas as demais rotas da API
router.use('/api', autenticacao);

// Regras para rotas da API (depois da autenticação)
router.use('/api/celulas', celulasRoutes);
router.use('/api/relatorios', relatoriosRoutes);
router.use('/api/usuarios', usuariosRoutes);

// Rotas de account (usando middleware específico)
router.use('/api/accounts', accountMiddleware, accountRoutes);

export { router }; 