import express from 'express';
import { authController } from '../controllers/auth.controller';

const authRoutes = express.Router();

// Rota para login
authRoutes.post('/login', authController.login);

// Rota para registro (disponível apenas em ambiente de desenvolvimento)
authRoutes.post('/register', authController.registrar);

// Rota para verificar token
authRoutes.get('/verify', authController.verificarToken);

export { authRoutes }; 