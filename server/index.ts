import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import usuariosRoutes from './routes/usuarios.routes';
import celulasRoutes from './routes/celulas.routes';
import relatoriosRoutes from './routes/relatorios.routes';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';

// Configuração de variáveis de ambiente
dotenv.config();

// Inicialização do Prisma
export const prisma = new PrismaClient();

// Configuração do servidor Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Middleware para garantir Content-Type JSON
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/celulas', celulasRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/admin', adminRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    message: 'Rota não encontrada',
    path: req.path
  });
});

// Middleware de tratamento de erros global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro na aplicação:', err);

  // Se o erro já tiver um status code, usar ele
  const statusCode = err.status || err.statusCode || 500;
  
  // Formatar a resposta de erro
  const errorResponse = {
    message: err.message || 'Erro interno do servidor',
    status: statusCode,
    errors: err.errors || undefined
  };

  // Garantir que a resposta seja sempre JSON
  res.status(statusCode).json(errorResponse);
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Tratamento de encerramento para fechar conexão do Prisma
process.on('beforeExit', async () => {
  await prisma.$disconnect();
}); 