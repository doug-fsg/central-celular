import { validateEnv } from './lib/env';
import { createApp } from './app';
import { initJobs } from './jobs';

validateEnv();

const app = createApp();
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);

  try {
    initJobs();
    console.log('Jobs inicializados com sucesso');
  } catch (error) {
    console.error('Erro ao inicializar jobs:', error);
  }
});

export { app };
