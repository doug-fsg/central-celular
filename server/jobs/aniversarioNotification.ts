import { prisma } from '../lib/prisma';
import { addDays } from 'date-fns';
import { whatsappService } from '../services/whatsappService';

// Função para enviar mensagem via WhatsApp
async function enviarMensagemWhatsApp(whatsapp: string, mensagem: string, accountId: number) {
  try {
    // Buscar conexão WhatsApp ativa da account
    const whatsappConnection = await prisma.whatsAppConnection.findFirst({
      where: {
        accountId,
        status: 'connected'
      }
    });
    
    if (!whatsappConnection) {
      console.error(`[AniversarioJob] Nenhuma conexão WhatsApp ativa encontrada para a account ${accountId}`);
      return false;
    }

    console.log(`[AniversarioJob] Enviando mensagem para ${whatsapp} via conexão ${whatsappConnection.token}`);

    const data = await whatsappService.sendText(whatsappConnection.token, whatsapp, mensagem);
    console.log('[AniversarioJob] Resposta do envio de mensagem:', data);
    return true;
  } catch (error) {
    console.error('[AniversarioJob] Erro ao enviar mensagem via WhatsApp:', error);
    return false;
  }
}

// Função para formatar a mensagem de aniversário
function formatarMensagem(membro: any, diasAntecedencia: number, lider: any) {
  // Extrair o primeiro nome do líder
  const primeiroNomeLider = lider.nome.split(' ')[0];
  
  // Obter a data de nascimento para extrair o dia e mês
  const dataNasc = new Date(membro.dataNascimento);
  const dataNascStr = dataNasc.toISOString().split('T')[0];
  const [anoNasc, mesStr, diaStr] = dataNascStr.split('-');
  const diaNascimento = parseInt(diaStr, 10);
  const mesNascimento = parseInt(mesStr, 10);
  
  // Nomes dos meses em português
  const nomesMeses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  
  // Data formatada (ex: 15 de junho)
  const dataFormatada = `${diaNascimento} de ${nomesMeses[mesNascimento - 1]}`;
  
  if (diasAntecedencia === 0) {
    return `🎉 Olá ${primeiroNomeLider}! Hoje (${dataFormatada}) é o aniversário de *${membro.nome}*! 🎂 Aproveite para enviar uma mensagem especial.`;
  } else if (diasAntecedencia === 1) {
    return `🎂 ${primeiroNomeLider}, amanhã (${dataFormatada}) será o aniversário de *${membro.nome}*! Uma ótima oportunidade para preparar algo especial.`;
  } else {
    return `🎂 ${primeiroNomeLider}, faltam ${diasAntecedencia} dias para o aniversário de *${membro.nome}* (${dataFormatada}). Uma boa oportunidade para planejar algo especial.`;
  }
}

// Função para formatar a mensagem de aniversário de líder
function formatarMensagemLider(lider: any, diasAntecedencia: number, admin: any) {
  // Extrair o primeiro nome do admin
  const primeiroNomeAdmin = admin.nome.split(' ')[0];
  
  // Obter a data de nascimento para extrair o dia e mês
  const dataNasc = new Date(lider.dataNascimento);
  const dataNascStr = dataNasc.toISOString().split('T')[0];
  const [anoNasc, mesStr, diaStr] = dataNascStr.split('-');
  const diaNascimento = parseInt(diaStr, 10);
  const mesNascimento = parseInt(mesStr, 10);
  
  // Nomes dos meses em português
  const nomesMeses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  
  // Data formatada (ex: 15 de junho)
  const dataFormatada = `${diaNascimento} de ${nomesMeses[mesNascimento - 1]}`;
  
  if (diasAntecedencia === 0) {
    return `🎉 Olá ${primeiroNomeAdmin}! Hoje (${dataFormatada}) é o aniversário de *${lider.nome}* (líder de célula)! 🎂 Aproveite para enviar uma mensagem especial.`;
  } else if (diasAntecedencia === 1) {
    return `🎂 ${primeiroNomeAdmin}, amanhã (${dataFormatada}) será o aniversário de *${lider.nome}* (líder de célula)! Uma ótima oportunidade para preparar algo especial.`;
  } else {
    return `🎂 ${primeiroNomeAdmin}, faltam ${diasAntecedencia} dias para o aniversário de *${lider.nome}* (líder de célula) (${dataFormatada}). Uma boa oportunidade para planejar algo especial.`;
  }
}

// Função para obter a data atual no fuso horário brasileiro
function getDataAtualBrasil() {
  // Usar o método nativo para obter a data atual
  const dataAtual = new Date();
  
  // Obter a data no formato YYYY-MM-DD para o fuso horário brasileiro
  const ano = dataAtual.getFullYear();
  const mes = dataAtual.getMonth(); // 0-11
  const dia = dataAtual.getDate();
  
  // Criar uma nova data com apenas o dia, mês e ano (sem hora)
  const dataFormatada = new Date(ano, mes, dia, 0, 0, 0, 0);
  
  console.log(`[AniversarioJob] Data atual no Brasil: ${dataFormatada.toISOString()}, dia: ${dia}, mês: ${mes + 1}, ano: ${ano}`);
  
  return dataFormatada;
}

// Função principal do job
export async function verificarAniversariantes() {
  console.log('[AniversarioJob] Iniciando verificação de aniversariantes...');

  try {
    const lideres = await prisma.usuario.findMany({
      where: {
        cargo: { in: ['lider', 'LIDER', 'Lider'] },
        ativo: true,
        config: {
          notificacaoAniversarioAtiva: true,
        },
      },
      include: {
        config: true,
        celulasLideradas: {
          where: { ativo: true },
          include: {
            membros: {
              where: { ativo: true, dataNascimento: { not: null } },
            },
          },
        },
      },
    });

    console.log(`[AniversarioJob] ${lideres.length} líderes com notificações ativas`);

    const hoje = getDataAtualBrasil();

    for (const lider of lideres) {
      if (!lider.config) continue;

      const { diasAntecedencia1, diasAntecedencia2 } = lider.config;
      const diasParaVerificar = [diasAntecedencia1, diasAntecedencia2].filter((d) => d >= 0);

      for (const celula of lider.celulasLideradas) {
        for (const membro of celula.membros) {
          if (!membro.dataNascimento) continue;

          const dataNascimentoStr = new Date(membro.dataNascimento).toISOString().split('T')[0];
          const [, mesStr, diaStr] = dataNascimentoStr.split('-');
          const diaNascimento = parseInt(diaStr, 10);
          const mesNascimento = parseInt(mesStr, 10) - 1;

          for (const diasAntecedencia of diasParaVerificar) {
            const dataAlvo = addDays(hoje, diasAntecedencia);
            const dataAlvoStr = dataAlvo.toISOString().split('T')[0];
            const [, mesAlvoStr, diaAlvoStr] = dataAlvoStr.split('-');
            const diaAlvo = parseInt(diaAlvoStr, 10);
            const mesAlvo = parseInt(mesAlvoStr, 10) - 1;

            if (mesNascimento === mesAlvo && diaNascimento === diaAlvo) {
              console.log(`[AniversarioJob] Aniversariante: ${membro.nome} (${diasAntecedencia}d antecedência)`);
              const mensagem = formatarMensagem(membro, diasAntecedencia, lider);
              await enviarMensagemWhatsApp(lider.whatsapp, mensagem, lider.accountId);
            }
          }
        }
      }
    }

    console.log('[AniversarioJob] Verificação de aniversariantes concluída');

    await verificarAniversariosLideres();
  } catch (error) {
    console.error('[AniversarioJob] Erro ao verificar aniversariantes:', error);
  }
}

// Função para verificar aniversários de líderes e notificar admins
export async function verificarAniversariosLideres() {
  console.log('[AniversarioJob] Verificando aniversários de líderes...');

  try {
    const admins = await prisma.usuario.findMany({
      where: {
        OR: [
          { cargo: 'ADMINISTRADOR' },
          { cargo: 'PASTOR' },
          { isSuperAdmin: true },
        ],
        ativo: true,
        config: { notificacaoAniversarioLiderAtiva: true },
      },
      include: { config: true },
    });

    if (admins.length === 0) return;

    const hoje = getDataAtualBrasil();

    const accountIds = [...new Set(admins.map((a) => a.accountId))];
    const allLideres = await prisma.usuario.findMany({
      where: {
        accountId: { in: accountIds },
        cargo: { in: ['lider', 'LIDER', 'Lider'] },
        ativo: true,
        dataNascimento: { not: null },
      },
    });

    const lideresByAccount = new Map<number, typeof allLideres>();
    for (const l of allLideres) {
      const list = lideresByAccount.get(l.accountId) ?? [];
      list.push(l);
      lideresByAccount.set(l.accountId, list);
    }

    for (const admin of admins) {
      if (!admin.config) continue;

      const { diasAntecedenciaLider1, diasAntecedenciaLider2 } = admin.config;
      const diasParaVerificar = [diasAntecedenciaLider1, diasAntecedenciaLider2].filter((d) => d >= 0);
      const lideres = lideresByAccount.get(admin.accountId) ?? [];

      for (const lider of lideres) {
        if (!lider.dataNascimento) continue;

        const dataNascimentoStr = new Date(lider.dataNascimento).toISOString().split('T')[0];
        const [, mesStr, diaStr] = dataNascimentoStr.split('-');
        const diaNascimento = parseInt(diaStr, 10);
        const mesNascimento = parseInt(mesStr, 10) - 1;

        for (const diasAntecedencia of diasParaVerificar) {
          const dataAlvo = addDays(hoje, diasAntecedencia);
          const dataAlvoStr = dataAlvo.toISOString().split('T')[0];
          const [, mesAlvoStr, diaAlvoStr] = dataAlvoStr.split('-');
          const diaAlvo = parseInt(diaAlvoStr, 10);
          const mesAlvo = parseInt(mesAlvoStr, 10) - 1;

          if (mesNascimento === mesAlvo && diaNascimento === diaAlvo) {
            console.log(`[AniversarioJob] Aniversário líder: ${lider.nome} (${diasAntecedencia}d antecedência)`);
            const mensagem = formatarMensagemLider(lider, diasAntecedencia, admin);
            await enviarMensagemWhatsApp(admin.whatsapp, mensagem, admin.accountId);
          }
        }
      }
    }

    console.log('[AniversarioJob] Verificação de aniversários de líderes concluída');
  } catch (error) {
    console.error('[AniversarioJob] Erro ao verificar aniversários de líderes:', error);
  }
} 