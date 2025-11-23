import express from 'express';
import { authController } from '../controllers/auth.controller';

const authRoutes = express.Router();

// Rota para login
authRoutes.post('/login', authController.login);

// Rotas para primeiro acesso via WhatsApp
authRoutes.post('/request-otp', authController.requestOtp);
authRoutes.post('/verify-otp', authController.verifyOtp);
authRoutes.post('/create-password', authController.createPassword);

// Rotas para reset de senha
authRoutes.post('/request-password-reset', authController.requestPasswordReset);
authRoutes.get('/verify-reset-token/:token', authController.verifyResetToken);
authRoutes.post('/reset-password', authController.resetPassword);

// Rota para verificar token de convite (link direto)
authRoutes.get('/verify-invite/:token', authController.verifyInviteToken);

// Rota para registro (disponível apenas em ambiente de desenvolvimento)
authRoutes.post('/register', authController.registrar);

// Rota para verificar token
authRoutes.get('/verify', authController.verificarToken);

export { authRoutes }; 