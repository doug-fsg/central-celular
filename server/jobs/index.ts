import { CronJob } from 'cron';
import { verificarAniversariantes } from './aniversarioNotification';
import { enviarLinksSso } from './ssoLinkJob';

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

// Job para enviar links SSO - executa toda segunda-feira às 9h
const ssoLinkJob = new CronJob(
  '0 9 * * 1',  // Cron expression: às 9h toda segunda-feira
  async () => {
    console.log('[CronJob] Iniciando job de envio de links SSO');
    try {
      await enviarLinksSso();
    } catch (error) {
      console.error('[CronJob] Erro ao executar job de envio de links SSO:', error);
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
  
  // Iniciar job de envio de links SSO
  ssoLinkJob.start();
  console.log('[Jobs] Job de envio de links SSO agendado para execução às 9h de segunda-feira');
  
  // Executar imediatamente para teste (apenas em ambiente de desenvolvimento)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Jobs] Ambiente de desenvolvimento detectado, executando jobs para teste...');
    verificarAniversariantes().catch(err => {
      console.error('[Jobs] Erro ao executar job de aniversariantes para teste:', err);
    });
    
    // Não executamos o job de links SSO automaticamente em desenvolvimento
    // para evitar envio acidental de mensagens
  }
  
  console.log('[Jobs] Todos os jobs foram inicializados');
} 