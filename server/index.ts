import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import usuariosRoutes from './routes/usuarios.routes';
import celulasRoutes from './routes/celulas.routes';
import relatoriosRoutes from './routes/relatorios.routes';
import authRoutes from './routes/auth.routes';

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

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/celulas', celulasRoutes);
app.use('/api/relatorios', relatoriosRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Middleware de tratamento de erros global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Erro interno do servidor',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

// Tratamento de encerramento para fechar conexão do Prisma
process.on('beforeExit', async () => {
  await prisma.$disconnect();
}); 