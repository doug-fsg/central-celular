import { prisma } from '../lib/prisma';
import { format, addDays, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
    // Listar todos os usuários para debug
    const todosUsuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        cargo: true,
        ativo: true,
        config: {
          select: {
            notificacaoAniversarioAtiva: true
          }
        }
      }
    });
    
    console.log('[AniversarioJob] Todos os usuários:', JSON.stringify(todosUsuarios, null, 2));
    
    // Buscar todos os líderes com configurações de notificação ativas
    // Usando OR para verificar diferentes formatos de "lider"
    const lideres = await prisma.usuario.findMany({
      where: {
        OR: [
          { cargo: 'lider' },
          { cargo: 'LIDER' },
          { cargo: 'Lider' }
        ],
        ativo: true,
        config: {
          notificacaoAniversarioAtiva: true
        }
      },
      include: {
        config: true,
        celulasLideradas: {
          where: {
            ativo: true
          },
          include: {
            membros: {
              where: {
                ativo: true,
                dataNascimento: {
                  not: null
                }
              }
            }
          }
        }
      }
    });

    console.log(`[AniversarioJob] Encontrados ${lideres.length} líderes com notificações ativas`);
    console.log('[AniversarioJob] Líderes encontrados:', JSON.stringify(lideres.map(l => ({id: l.id, nome: l.nome, cargo: l.cargo})), null, 2));

    // Data atual (sem hora) no fuso horário do Brasil
    const hoje = getDataAtualBrasil();
    
    // Para cada líder, verificar membros com aniversário próximo
    for (const lider of lideres) {
      if (!lider.config) continue;
      
      const { diasAntecedencia1, diasAntecedencia2 } = lider.config;
      const diasParaVerificar = [diasAntecedencia1, diasAntecedencia2].filter(d => d >= 0);
      
      console.log(`[AniversarioJob] Verificando aniversariantes para o líder ${lider.nome} (ID: ${lider.id})`);
      console.log(`[AniversarioJob] Dias de antecedência configurados: ${diasParaVerificar.join(', ')}`);
      
      // Para cada célula liderada pelo líder
      for (const celula of lider.celulasLideradas) {
        console.log(`[AniversarioJob] Verificando célula ${celula.nome} (ID: ${celula.id}) com ${celula.membros.length} membros`);
        
        // Para cada membro da célula
        for (const membro of celula.membros) {
          if (!membro.dataNascimento) continue;
          
          // Data de nascimento do membro
          const dataNascimentoOriginal = new Date(membro.dataNascimento);
          
          // Criar uma data sem considerar o fuso horário
          const dataNascimentoStr = dataNascimentoOriginal.toISOString().split('T')[0]; // formato YYYY-MM-DD
          console.log(`[AniversarioJob] Data de nascimento string: ${dataNascimentoStr}`);
          
          // Extrair partes da data
          const [anoNasc, mesStr, diaStr] = dataNascimentoStr.split('-');
          const diaNascimento = parseInt(diaStr, 10);
          const mesNascimento = parseInt(mesStr, 10) - 1; // Mês em JavaScript é 0-11
          
          console.log(`[AniversarioJob] Verificando membro ${membro.nome}, data de nascimento: ${dataNascimentoStr}, dia: ${diaNascimento}, mês: ${mesNascimento + 1}`);
          
          // Para cada dia de antecedência configurado
          for (const diasAntecedencia of diasParaVerificar) {
            // Data alvo para verificação (hoje + dias de antecedência)
            const dataAlvo = addDays(hoje, diasAntecedencia);
            
            // Extrair apenas dia e mês da data alvo de forma consistente
            const dataAlvoStr = dataAlvo.toISOString().split('T')[0]; // formato YYYY-MM-DD
            console.log(`[AniversarioJob] Data alvo string: ${dataAlvoStr}`);
            
            // Extrair partes da data
            const [anoAlvo, mesAlvoStr, diaAlvoStr] = dataAlvoStr.split('-');
            const diaAlvo = parseInt(diaAlvoStr, 10);
            const mesAlvo = parseInt(mesAlvoStr, 10) - 1; // Mês em JavaScript é 0-11
            
            console.log(`[AniversarioJob] Verificando para ${diasAntecedencia} dias de antecedência, data alvo: ${dataAlvoStr}, dia: ${diaAlvo}, mês: ${mesAlvo + 1}`);
            
            // Verificar se o mês e dia coincidem
            if (mesNascimento === mesAlvo && diaNascimento === diaAlvo) {
              console.log(`[AniversarioJob] ENCONTRADO ANIVERSARIANTE: ${membro.nome} - Dias de antecedência: ${diasAntecedencia}`);
              console.log(`[AniversarioJob] Comparação: nascimento (${diaNascimento}/${mesNascimento + 1}) = data alvo (${diaAlvo}/${mesAlvo + 1})`);
              
              // Formatar mensagem
              const mensagem = formatarMensagem(membro, diasAntecedencia, lider);
              
              // Enviar notificação via WhatsApp
              const enviado = await enviarMensagemWhatsApp(
                lider.whatsapp,
                mensagem,
                lider.accountId
              );
              
              console.log(`[AniversarioJob] Mensagem ${enviado ? 'enviada' : 'falhou'} para ${lider.nome}`);
            } else {
              console.log(`[AniversarioJob] Não é aniversário: membro ${membro.nome} (${diaNascimento}/${mesNascimento + 1}) vs data alvo (${diaAlvo}/${mesAlvo + 1})`);
            }
          }
        }
      }
    }

    console.log('[AniversarioJob] Verificação de aniversariantes concluída');
    
    // Verificar aniversários de líderes para admins
    await verificarAniversariosLideres();
  } catch (error) {
    console.error('[AniversarioJob] Erro ao verificar aniversariantes:', error);
  }
}

// Função para verificar aniversários de líderes e notificar admins
export async function verificarAniversariosLideres() {
  console.log('[AniversarioJob] Iniciando verificação de aniversários de líderes...');

  try {
    // Buscar todos os admins com configurações de notificação ativas
    const admins = await prisma.usuario.findMany({
      where: {
        OR: [
          { cargo: 'ADMINISTRADOR' },
          { cargo: 'PASTOR' },
          { isSuperAdmin: true }
        ],
        ativo: true,
        config: {
          notificacaoAniversarioLiderAtiva: true
        }
      },
      include: {
        config: true
      }
    });

    console.log(`[AniversarioJob] Encontrados ${admins.length} admins com notificações de líderes ativas`);

    if (admins.length === 0) {
      console.log('[AniversarioJob] Nenhum admin com notificações de líderes ativas encontrado');
      return;
    }

    // Data atual (sem hora) no fuso horário do Brasil
    const hoje = getDataAtualBrasil();

    // Para cada admin, verificar líderes com aniversário próximo
    for (const admin of admins) {
      if (!admin.config) continue;
      
      const { diasAntecedenciaLider1, diasAntecedenciaLider2 } = admin.config;
      const diasParaVerificar = [diasAntecedenciaLider1, diasAntecedenciaLider2].filter(d => d >= 0);
      
      console.log(`[AniversarioJob] Verificando aniversários de líderes para o admin ${admin.nome} (ID: ${admin.id})`);
      console.log(`[AniversarioJob] Dias de antecedência configurados: ${diasParaVerificar.join(', ')}`);
      
      // Buscar todos os líderes ativos da mesma account
      const lideres = await prisma.usuario.findMany({
        where: {
          accountId: admin.accountId,
          OR: [
            { cargo: 'lider' },
            { cargo: 'LIDER' },
            { cargo: 'Lider' }
          ],
          ativo: true,
          dataNascimento: {
            not: null
          }
        }
      });

      console.log(`[AniversarioJob] Encontrados ${lideres.length} líderes ativos na account ${admin.accountId}`);

      // Para cada líder
      for (const lider of lideres) {
        if (!lider.dataNascimento) continue;
        
        // Data de nascimento do líder
        const dataNascimentoOriginal = new Date(lider.dataNascimento);
        
        // Criar uma data sem considerar o fuso horário
        const dataNascimentoStr = dataNascimentoOriginal.toISOString().split('T')[0]; // formato YYYY-MM-DD
        console.log(`[AniversarioJob] Data de nascimento do líder ${lider.nome}: ${dataNascimentoStr}`);
        
        // Extrair partes da data
        const [anoNasc, mesStr, diaStr] = dataNascimentoStr.split('-');
        const diaNascimento = parseInt(diaStr, 10);
        const mesNascimento = parseInt(mesStr, 10) - 1; // Mês em JavaScript é 0-11
        
        console.log(`[AniversarioJob] Verificando líder ${lider.nome}, data de nascimento: ${dataNascimentoStr}, dia: ${diaNascimento}, mês: ${mesNascimento + 1}`);
        
        // Para cada dia de antecedência configurado
        for (const diasAntecedencia of diasParaVerificar) {
          // Data alvo para verificação (hoje + dias de antecedência)
          const dataAlvo = addDays(hoje, diasAntecedencia);
          
          // Extrair apenas dia e mês da data alvo de forma consistente
          const dataAlvoStr = dataAlvo.toISOString().split('T')[0]; // formato YYYY-MM-DD
          console.log(`[AniversarioJob] Data alvo string: ${dataAlvoStr}`);
          
          // Extrair partes da data
          const [anoAlvo, mesAlvoStr, diaAlvoStr] = dataAlvoStr.split('-');
          const diaAlvo = parseInt(diaAlvoStr, 10);
          const mesAlvo = parseInt(mesAlvoStr, 10) - 1; // Mês em JavaScript é 0-11
          
          console.log(`[AniversarioJob] Verificando para ${diasAntecedencia} dias de antecedência, data alvo: ${dataAlvoStr}, dia: ${diaAlvo}, mês: ${mesAlvo + 1}`);
          
          // Verificar se o mês e dia coincidem
          if (mesNascimento === mesAlvo && diaNascimento === diaAlvo) {
            console.log(`[AniversarioJob] ENCONTRADO ANIVERSARIANTE LÍDER: ${lider.nome} - Dias de antecedência: ${diasAntecedencia}`);
            console.log(`[AniversarioJob] Comparação: nascimento (${diaNascimento}/${mesNascimento + 1}) = data alvo (${diaAlvo}/${mesAlvo + 1})`);
            
            // Formatar mensagem
            const mensagem = formatarMensagemLider(lider, diasAntecedencia, admin);
            
            // Enviar notificação via WhatsApp
            const enviado = await enviarMensagemWhatsApp(
              admin.whatsapp,
              mensagem,
              admin.accountId
            );
            
            console.log(`[AniversarioJob] Mensagem ${enviado ? 'enviada' : 'falhou'} para ${admin.nome} sobre aniversário de ${lider.nome}`);
          } else {
            console.log(`[AniversarioJob] Não é aniversário: líder ${lider.nome} (${diaNascimento}/${mesNascimento + 1}) vs data alvo (${diaAlvo}/${mesAlvo + 1})`);
          }
        }
      }
    }

    console.log('[AniversarioJob] Verificação de aniversários de líderes concluída');
  } catch (error) {
    console.error('[AniversarioJob] Erro ao verificar aniversários de líderes:', error);
  }
} 