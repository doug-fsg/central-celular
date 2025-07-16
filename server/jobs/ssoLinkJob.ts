import { prisma } from '../lib/prisma';
import { ssoLinkService } from '../services/ssoLinkService';

// Função principal do job
export async function enviarLinksSso() {
  console.log('[SsoLinkJob] Iniciando envio automático de links SSO...');

  try {
    // Buscar todas as contas ativas
    const accounts = await prisma.account.findMany({
      where: { ativo: true },
      include: {
        config: true
      }
    });

    console.log(`[SsoLinkJob] Encontradas ${accounts.length} contas ativas`);

    // Para cada conta, verificar se o envio automático está ativo
    for (const account of accounts) {
      try {
        // Verificar se a conta tem configuração e se o envio automático está ativo
        if (account.config?.envioLinkSsoAtivo) {
          console.log(`[SsoLinkJob] Enviando links para a conta ${account.nome} (ID: ${account.id})`);
          
          // Executar o envio de links para esta conta
          const resultado = await ssoLinkService.executarJobEnvioLinks(account.id);
          
          console.log(`[SsoLinkJob] Resultado para conta ${account.nome}: ${resultado.message}`);
        } else {
          console.log(`[SsoLinkJob] Envio automático desativado para a conta ${account.nome} (ID: ${account.id})`);
        }
      } catch (accountError) {
        console.error(`[SsoLinkJob] Erro ao processar conta ${account.id}:`, accountError);
      }
    }

    console.log('[SsoLinkJob] Envio automático de links SSO concluído');
  } catch (error) {
    console.error('[SsoLinkJob] Erro ao enviar links SSO:', error);
  }
} 