import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { format, isAfter, isBefore, startOfMonth, endOfMonth, parse, getDate } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useUserStore } from './userStore'
import { useMemberStore } from './memberStore'
import relatorioService from '../services/relatorioService'

// Interface para dados vindos do backend
interface ReportData {
  id: number | string;
  celulaId: number;
  mes: number;
  ano: number;
  observacoes?: string;
  dataEnvio?: Date;
  [key: string]: any; // Para outras propriedades que possam existir
}

export interface Report {
  id: number | string;
  celulaId: number;
  mes: number;
  ano: number;
  observations?: string;
  sentDate?: Date; // Data de envio do relatório
  isFinalized: boolean; // Indica se o relatório foi finalizado/enviado
}

export const useReportStore = defineStore('report', () => {
  const userStore = useUserStore()
  const memberStore = useMemberStore()
  
  const reports = ref<Report[]>([])
  const currentReportId = ref<number | null>(null)
  
  // Mensagem relacionada ao relatório atual
  const reportMessage = computed(() => {
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    const day = today.getDate()
    
    // Se já enviou relatório para o mês atual
    if (hasSubmittedReportForMonth(currentMonth, currentYear)) {
      return `Relatório de ${format(today, 'MMMM', { locale: ptBR })} já enviado. Obrigado!`
    }
    
    // Se estamos nos primeiros 10 dias do mês
    if (day <= 10) {
      return `Você tem até o dia 10 para enviar o relatório de ${format(today, 'MMMM', { locale: ptBR })}.`
    }
    
    // Entre os dias 11 e 17
    if (day <= 17) {
      return `O prazo ideal já passou, mas você ainda pode enviar o relatório de ${format(today, 'MMMM', { locale: ptBR })}.`
    }
    
    // A partir do dia 18
    return `Atenção! Envie o relatório de ${format(today, 'MMMM', { locale: ptBR })} o quanto antes.`
  })
  
  // Verifica se já existe um relatório para o mês e ano informados
  function hasReportForMonth(mes: number, ano: number) {
    const exists = reports.value.some(r => r.mes === mes && r.ano === ano);
    console.log(`[DEBUG] hasReportForMonth(${mes}, ${ano}) = ${exists}`, 
      exists ? reports.value.filter(r => r.mes === mes && r.ano === ano) : 'nenhum');
    return exists;
  }
  
  // Verifica se já existe um relatório finalizado/enviado para o mês e ano informados
  function hasSubmittedReportForMonth(mes: number, ano: number) {
    console.log(`[DEBUG] hasSubmittedReportForMonth - ENTRADA - Verificando mes=${mes}, ano=${ano}`);
    console.log(`[DEBUG] hasSubmittedReportForMonth - Estado atual dos relatórios:`, 
      reports.value.map(r => ({ id: r.id, mes: r.mes, ano: r.ano, isFinalized: r.isFinalized, celulaId: r.celulaId }))
    );
    
    const exists = reports.value.some(r => {
      const mesMatch = r.mes === mes;
      const anoMatch = r.ano === ano;
      const isFinalized = r.isFinalized;
      
      console.log(`[DEBUG] hasSubmittedReportForMonth - Verificando relatório id=${r.id}: mes=${r.mes}==${mes}?${mesMatch}, ano=${r.ano}==${ano}?${anoMatch}, isFinalized=${isFinalized}`);
      
      return mesMatch && anoMatch && isFinalized;
    });
    
    console.log(`[DEBUG] hasSubmittedReportForMonth(${mes}, ${ano}) = ${exists}`, 
      exists ? reports.value.filter(r => r.mes === mes && r.ano === ano && r.isFinalized) : 'nenhum');
    return exists;
  }
  
  // Verificar se é possível enviar relatório para o mês atual
  const canSubmitReport = computed(() => {
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    const deadlineDay = 10
    
    // Verifica se já existe um relatório enviado para este mês
    const reportExists = hasSubmittedReportForMonth(currentMonth, currentYear)
    
    // Se o relatório já foi enviado, não pode enviar novamente
    if (reportExists) {
      return {
        allowed: false,
        message: "Relatório já enviado para este mês"
      }
    }
    
    // Se estamos no dia 10 ou antes, pode enviar para o mês anterior
    if (today.getDate() <= deadlineDay) {
      return {
        allowed: true,
        message: "Dentro do prazo"
      }
    }
    
    // Após o dia 10, só pode enviar para o mês atual
    return {
      allowed: true,
      message: "Relatório para o mês atual"
    }
  })
  
  // Carregar relatórios
  async function carregarRelatorios() {
    try {
      const data = await relatorioService.listarRelatorios()
      console.log('[DEBUG] Dados de relatórios recebidos do backend:', data)
      
      // Mapear para o formato da store e verificar explicitamente cada relatório
      reports.value = data.map((r: ReportData) => {
        const isReallyFinalized = !!r.dataEnvio;
        
        return {
          id: r.id,
          celulaId: r.celulaId,
          mes: r.mes,
          ano: r.ano,
          observations: r.observacoes,
          sentDate: r.dataEnvio,
          isFinalized: isReallyFinalized // Consideramos finalizado APENAS se tem data de envio
        };
      })
      
      console.log('[DEBUG] Relatórios mapeados para a store com status isFinalized:', 
        reports.value.map(r => ({ id: r.id, mes: r.mes, ano: r.ano, isFinalized: r.isFinalized })))
      return reports.value
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error)
      return []
    }
  }
  
  // Criar um novo relatório
  async function criarRelatorio(mesEspecifico?: number, anoEspecifico?: number) {
    try {
      // Verificar o ID da célula no memberStore primeiro, depois no localStorage
      let celulaId = memberStore.celulaId
      
      // Se não encontrado no memberStore, tenta o localStorage como fallback
      if (!celulaId) {
        const celulaIdStr = localStorage.getItem('celulaId')
        if (celulaIdStr) {
          celulaId = parseInt(celulaIdStr)
        }
      }
      
      if (!celulaId) {
        // Tentar carregar os membros para obter o ID da célula
        await memberStore.carregarMembros()
        celulaId = memberStore.celulaId
        
        // Se ainda não encontrado, lançar erro
        if (!celulaId) {
          throw new Error('ID da célula não encontrado')
        }
      }
      
      // Usar o mês e ano específico se fornecidos, caso contrário usar o mês e ano atual
      const today = new Date()
      const mes = mesEspecifico !== undefined ? mesEspecifico : today.getMonth()
      const ano = anoEspecifico !== undefined ? anoEspecifico : today.getFullYear()
      
      console.log(`[DEBUG] criarRelatorio - Usando mês/ano: ${mes}/${ano}`)
      
      // Verificar se já existe um relatório para este mês ESPECÍFICO e ano ESPECÍFICO
      if (hasReportForMonth(mes, ano)) {
        console.warn(`Já existe um relatório para o mês ${mes}/${ano}`)
        
        // Buscar o ID do relatório existente para retornar em vez de criar um novo
        const existingReport = reports.value.find(r => r.mes === mes && r.ano === ano)
        return existingReport ? existingReport.id : null
      }
      
      // Verificar diretamente no serviço se já existe um relatório
      const relatorioExistente = await relatorioService.verificarRelatorioExistente(celulaId, mes, ano)
      if (relatorioExistente) {
        console.log(`Relatório já existe no servidor para ${mes}/${ano}, atualizando store`)
        
        // Verificar se o relatório retornado realmente corresponde ao mês/ano solicitado
        if (relatorioExistente.mes !== mes || relatorioExistente.ano !== ano) {
          console.error(`[DEBUG] criarRelatorio - ERRO: Relatório retornado do servidor tem mes=${relatorioExistente.mes}, ano=${relatorioExistente.ano}, mas solicitamos mes=${mes}, ano=${ano}`);
          
          // Filtrar a store atual para ver se já temos o relatório correto
          const relatorioLocal = reports.value.find(r => r.mes === mes && r.ano === ano);
          if (relatorioLocal) {
            console.log(`[DEBUG] criarRelatorio - Usando relatório encontrado na store local:`, relatorioLocal);
            return relatorioLocal.id;
          }
          
          console.log(`[DEBUG] criarRelatorio - Criando novo relatório, já que não encontramos um correspondente`);
          // Continuamos para criar um novo relatório, já que o retornado não corresponde
        } else {
          // Verificamos explicitamente se o relatório foi enviado pela presença de dataEnvio
          const isReallyFinalized = !!relatorioExistente.dataEnvio;
          console.log(`[DEBUG] Relatório recuperado do servidor: dataEnvio=${relatorioExistente.dataEnvio}, isFinalized=${isReallyFinalized}`);
          
          const newReport: Report = {
            id: relatorioExistente.id,
            celulaId: celulaId,
            mes: relatorioExistente.mes,
            ano: relatorioExistente.ano,
            observations: relatorioExistente.observacoes,
            sentDate: relatorioExistente.dataEnvio,
            isFinalized: isReallyFinalized
          }
          
          // Adicionar à store se ainda não existe
          if (!reports.value.some(r => r.id === relatorioExistente.id)) {
            reports.value.push(newReport)
          } else {
            // Atualizar o relatório existente na store
            const index = reports.value.findIndex(r => r.id === relatorioExistente.id);
            if (index !== -1) {
              reports.value[index] = newReport;
            }
          }
          
          currentReportId.value = relatorioExistente.id
          return relatorioExistente.id
        }
      }
      
      // Se não existe, criar um novo
      const result = await relatorioService.criarRelatorio(
        celulaId,
        mes,
        ano,
        `Relatório criado em ${new Date().toLocaleDateString()} para ${mes}/${ano}`
      )
      
      const newReport: Report = {
        id: result.id,
        celulaId: celulaId,
        mes: result.mes,
        ano: result.ano,
        observations: result.observacoes,
        sentDate: result.dataEnvio,
        isFinalized: false // Novos relatórios NUNCA devem ser marcados como finalizados
      }
      
      console.log('[DEBUG] Novo relatório sendo adicionado à store:', newReport);
      reports.value.push(newReport)
      currentReportId.value = result.id
      
      return result.id
    } catch (error: any) {
      console.error('Erro ao criar relatório:', error)
      
      // Se for um erro 400 Bad Request com mensagem de relatório já existente,
      // tentar recuperar o relatório existente em vez de falhar
      if (error.status === 400 && error.message?.includes('já existe')) {
        await carregarRelatorios() // Recarregar relatórios
        
        // Usar o mesmo mês/ano que foram usados para a tentativa de criação
        const currentDate = new Date(); 
        const existingReport = reports.value.find(r => 
          r.mes === (mesEspecifico !== undefined ? mesEspecifico : currentDate.getMonth()) && 
          r.ano === (anoEspecifico !== undefined ? anoEspecifico : currentDate.getFullYear())
        )
        return existingReport ? existingReport.id : null
      }
      
      return null
    }
  }
  
  // Enviar relatório
  async function enviarRelatorio(reportId: number) {
    try {
      console.log(`[DEBUG] reportStore.enviarRelatorio - Iniciando envio do relatório ID=${reportId}`);
      
      const result = await relatorioService.enviarRelatorio(reportId)
      console.log(`[DEBUG] reportStore.enviarRelatorio - Resposta obtida do serviço:`, result);
      
      if (result) {
        // Atualizar o status do relatório na store
        const index = reports.value.findIndex(r => r.id === reportId)
        console.log(`[DEBUG] reportStore.enviarRelatorio - Atualizando relatório na posição ${index} da store`);
        
        if (index !== -1) {
          reports.value[index].isFinalized = true
          reports.value[index].sentDate = new Date()
          console.log(`[DEBUG] reportStore.enviarRelatorio - Relatório atualizado na store:`, reports.value[index]);
        } else {
          console.warn(`[DEBUG] reportStore.enviarRelatorio - Relatório ID=${reportId} não encontrado na store para atualização`);
        }
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('Erro ao enviar relatório:', error)
      // Re-throw error para que o componente possa tratá-lo
      throw error;
    }
  }
  
  return {
    reports,
    currentReportId,
    reportMessage,
    hasReportForMonth,
    hasSubmittedReportForMonth,
    canSubmitReport,
    carregarRelatorios,
    criarRelatorio,
    enviarRelatorio
  }
}) 