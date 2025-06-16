import { CronJob } from 'cron';
import { verificarAniversariantes } from './aniversarioNotification';

// Job para verificar aniversariantes - executa todos os dias às 9h
const aniversarioJob = new CronJob(
  '0 9 * * *',  // Cron expression: às 9h todos os dias
  async () => {
    console.log('[CronJob] Iniciando job de verificação de aniversariantes');
    try {
      await verificarAniversariantes();
    } catch (error) {
      console.error('[CronJob] Erro ao executar job de aniversariantes:', error);
    }
  },
  null,  // onComplete
  false,  // start
  'America/Sao_Paulo'  // timezone
);

// Inicializar todos os jobs
export function initJobs() {
  console.log('[Jobs] Inicializando jobs...');
  
  // Iniciar job de aniversariantes
  aniversarioJob.start();
  console.log('[Jobs] Job de aniversariantes agendado para execução às 9h');
  
  // Executar imediatamente para teste (apenas em ambiente de desenvolvimento)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Jobs] Ambiente de desenvolvimento detectado, executando job de aniversariantes para teste...');
    verificarAniversariantes().catch(err => {
      console.error('[Jobs] Erro ao executar job de teste:', err);
    });
  }
  
  console.log('[Jobs] Todos os jobs foram inicializados');
} 