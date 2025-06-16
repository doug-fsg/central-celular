import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { router } from './routes/index';
import { adminRouter } from './routes/admin.routes';
import { whatsappRoutes } from './routes/whatsapp.routes';
import { initJobs } from './jobs';

// Inicializar variáveis de ambiente
dotenv.config();

// Inicializar o Express
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Adicionar logs para depuração
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Rota para verificar se o servidor está rodando
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas da API
console.log('Registrando rotas da API...');
app.use('/', router);
console.log('Rotas da API registradas');

// Rotas de administração
console.log('Registrando rotas de administração...');
app.use('/api/admin', adminRouter);
console.log('Rotas de administração registradas');

// Registrar rotas do WhatsApp
console.log('Registrando rotas do WhatsApp...');
app.use('/api/whatsapp', whatsappRoutes);
console.log('Rotas do WhatsApp registradas');

// Manipulador de erros 404
app.use((req, res, next) => {
  console.log(`[404] Rota não encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  
  // Inicializar jobs
  try {
    initJobs();
    console.log('Jobs inicializados com sucesso');
  } catch (error) {
    console.error('Erro ao inicializar jobs:', error);
  }
}); 