import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authLimiter } from '../middlewares/rateLimit.middleware';

const authRoutes = Router();

authRoutes.use(authLimiter);

authRoutes.post('/login', authController.login);
authRoutes.post('/request-otp', authController.requestOtp);
authRoutes.post('/verify-otp', authController.verifyOtp);
authRoutes.post('/create-password', authController.createPassword);
authRoutes.post('/request-password-reset', authController.requestPasswordReset);
authRoutes.get('/verify-reset-token/:token', authController.verifyResetToken);
authRoutes.post('/reset-password', authController.resetPassword);
authRoutes.get('/verify-invite/:token', authController.verifyInviteToken);
authRoutes.post('/register', authController.registrar);
authRoutes.get('/verify', authController.verificarToken);
authRoutes.post('/refresh', authController.refresh);
authRoutes.post('/logout', authController.logout);

export { authRoutes };
