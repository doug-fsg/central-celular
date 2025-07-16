import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { format, startOfWeek, endOfWeek, addDays, subDays, subWeeks, isBefore, isAfter } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useUserStore } from './userStore'
import { useMemberStore } from './memberStore'
import relatorioService, { STATUS_RELATORIO, TIPO_EVENTO } from '../services/relatorioService'

// Interface para dados vindos do backend
interface ReportData {
  id: number | string;
  celulaId: number;
  dataInicio: string | Date;
  dataFim: string | Date;
  evento: number; // 0 = célula, 1 = culto
  status: number; // 0 = rascunho, 1 = enviado
  dataEnvio?: string | Date;
  observacoes?: string;
  [key: string]: any; // Para outras propriedades que possam existir
}

export interface Report {
  id: number | string;
  celulaId: number;
  dataInicio: string | Date;
  dataFim: string | Date;
  evento: number; // 0 = célula, 1 = culto
  status: number; // 0 = rascunho, 1 = enviado
  dataEnvio?: string | Date;
  observacoes?: string;
}

export const useReportStore = defineStore('report', () => {
  const userStore = useUserStore()
  const memberStore = useMemberStore()
  
  const reports = ref<Report[]>([])
  const currentReportId = ref<number | null>(null)

  // Função para calcular o período do relatório atual
  function calcularPeriodoRelatorio() {
    const hoje = new Date()
    const diaSemana = hoje.getDay() // 0 = domingo, ... 6 = sábado
    
    // Se for quarta ou antes (0-3), pega a semana passada
    // Se for quinta ou depois (4-6), pega a semana atual (que será a anterior quando chegar na próxima quarta)
    const semanaBase = subWeeks(hoje, 1)
    
    // Ajusta para começar na segunda e terminar no domingo
    const dataInicio = startOfWeek(semanaBase, { weekStartsOn: 1 }) // Segunda-feira
    const dataFim = endOfWeek(semanaBase, { weekStartsOn: 1 }) // Domingo
    
    return {
      dataInicio,
      dataFim
    }
  }

  const currentWeek = ref(calcularPeriodoRelatorio())
  
  // Verifica se está dentro do período de envio (quinta a quarta)
  const isDentroPeriodoEnvio = computed(() => {
    const hoje = new Date()
    const diaSemana = hoje.getDay() // 0 = domingo, ... 6 = sábado
    const hora = hoje.getHours()
    const minutos = hoje.getMinutes()
    
    // Se for quarta-feira (3), só permite até 23:59
    if (diaSemana === 3) {
      return hora < 23 || (hora === 23 && minutos <= 59)
    }
    
    // Não permite envio após quarta-feira
    return diaSemana <= 3
  })

  // Calcula quantos dias faltam para o fim do período
  const diasParaFimPeriodo = computed(() => {
    const hoje = new Date()
    const diaSemana = hoje.getDay()
    
    // Se estiver entre quinta e sábado (4-6)
    if (diaSemana >= 4) {
      return 3 + (7 - diaSemana) // Dias até quarta
    }
    // Se estiver entre domingo e quarta (0-3)
    return 3 - diaSemana // Dias até quarta
  })
  
  // Mensagem relacionada ao relatório atual
  const reportMessage = computed(() => {
    const hoje = new Date()
    const dataInicio = currentWeek.value.dataInicio
    const dataFim = currentWeek.value.dataFim
    
    // Se já enviou relatório para a semana
    if (hasSubmittedReportForWeek(dataInicio, dataFim, TIPO_EVENTO.CELULA)) {
      return `Relatório da célula para a semana ${format(dataInicio, 'dd/MM', { locale: ptBR })} - ${format(dataFim, 'dd/MM', { locale: ptBR })} já enviado. Obrigado!`
    }
    
    // Se não está no período de envio
    if (!isDentroPeriodoEnvio.value) {
      return `O período para envio de relatórios está fechado. Aguarde o próximo período que inicia na quinta-feira.`
    }
    
    // Se é o último dia (quarta-feira)
    if (diasParaFimPeriodo.value === 0) {
      return `Hoje é o último dia para enviar o relatório da semana ${format(dataInicio, 'dd/MM', { locale: ptBR })} - ${format(dataFim, 'dd/MM', { locale: ptBR })}.`
    }
    
    // Mensagem padrão durante o período de envio
    return `Você tem ${diasParaFimPeriodo.value} dia${diasParaFimPeriodo.value > 1 ? 's' : ''} para enviar o relatório da semana ${format(dataInicio, 'dd/MM', { locale: ptBR })} - ${format(dataFim, 'dd/MM', { locale: ptBR })}.`
  })
  
  // Verifica se já existe um relatório para a semana e tipo de evento informados
  function hasReportForWeek(dataInicio: Date | string, dataFim: Date | string, evento: number) {
    const inicio = typeof dataInicio === 'string' ? new Date(dataInicio) : dataInicio
    const fim = typeof dataFim === 'string' ? new Date(dataFim) : dataFim
    
    const exists = reports.value.some(r => {
      const reportInicio = typeof r.dataInicio === 'string' ? new Date(r.dataInicio) : r.dataInicio
      const reportFim = typeof r.dataFim === 'string' ? new Date(r.dataFim) : r.dataFim
      
      return format(reportInicio, 'yyyy-MM-dd') === format(inicio, 'yyyy-MM-dd') && 
             format(reportFim, 'yyyy-MM-dd') === format(fim, 'yyyy-MM-dd') &&
             r.evento === evento
    })
    
    console.log(`[DEBUG] hasReportForWeek(${format(inicio, 'yyyy-MM-dd')}, ${format(fim, 'yyyy-MM-dd')}, ${evento}) = ${exists}`)
    return exists
  }
  
  // Verifica se já existe um relatório finalizado/enviado para a semana e tipo de evento informados
  function hasSubmittedReportForWeek(dataInicio: Date | string, dataFim: Date | string, evento: number) {
    const inicio = typeof dataInicio === 'string' ? new Date(dataInicio) : dataInicio
    const fim = typeof dataFim === 'string' ? new Date(dataFim) : dataFim
    
    const exists = reports.value.some(r => {
      const reportInicio = typeof r.dataInicio === 'string' ? new Date(r.dataInicio) : r.dataInicio
      const reportFim = typeof r.dataFim === 'string' ? new Date(r.dataFim) : r.dataFim
      
      const inicioMatch = format(reportInicio, 'yyyy-MM-dd') === format(inicio, 'yyyy-MM-dd')
      const fimMatch = format(reportFim, 'yyyy-MM-dd') === format(fim, 'yyyy-MM-dd')
      const eventoMatch = r.evento === evento
      const isFinalized = r.status === STATUS_RELATORIO.ENVIADO
      
      console.log(`[DEBUG] hasSubmittedReportForWeek - Verificando relatório id=${r.id}: inicioMatch=${inicioMatch}, fimMatch=${fimMatch}, eventoMatch=${eventoMatch}, isFinalized=${isFinalized}`)
      
      return inicioMatch && fimMatch && eventoMatch && isFinalized
    })
    
    console.log(`[DEBUG] hasSubmittedReportForWeek(${format(inicio, 'yyyy-MM-dd')}, ${format(fim, 'yyyy-MM-dd')}, ${evento}) = ${exists}`)
    return exists
  }
  
  // Verificar se é possível enviar relatório
  const canSubmitReport = computed(() => {
    // Se já existe um relatório enviado
    if (hasSubmittedReportForWeek(currentWeek.value.dataInicio, currentWeek.value.dataFim, TIPO_EVENTO.CELULA)) {
      return {
        allowed: false,
        message: "Relatório já enviado para esta semana"
      }
    }
    
    // Se não está no período de envio
    if (!isDentroPeriodoEnvio.value) {
      return {
        allowed: false,
        message: "Período de envio fechado. Aguarde o próximo período (quinta-feira)"
      }
    }

    // Verificar se a semana selecionada é a semana que deve ser relatada
    const semanaPermitida = calcularPeriodoRelatorio()
    if (
      format(currentWeek.value.dataInicio, 'yyyy-MM-dd') !== format(semanaPermitida.dataInicio, 'yyyy-MM-dd') ||
      format(currentWeek.value.dataFim, 'yyyy-MM-dd') !== format(semanaPermitida.dataFim, 'yyyy-MM-dd')
    ) {
      return {
        allowed: false,
        message: "Só é possível enviar relatório da semana atual"
      }
    }
    
    // Dentro do período normal de envio
    return {
      allowed: true,
      message: diasParaFimPeriodo.value === 0 ? "Último dia para envio" : "Dentro do prazo"
    }
  })
  
  // Carregar relatórios
  async function carregarRelatorios() {
    try {
      // Verificar o ID da célula no memberStore
      let celulaId = memberStore.celulaId
      
      if (!celulaId) {
        // Tentar carregar os membros para obter o ID da célula
        await memberStore.carregarMembros()
        celulaId = memberStore.celulaId
        
        // Se ainda não encontrado, lançar erro
        if (!celulaId) {
          throw new Error('ID da célula não encontrado')
        }
      }

      // Usar a semana atual como período
      const { dataInicio, dataFim } = currentWeek.value

      const data = await relatorioService.listarRelatorios({
        celulaId,
        dataInicio,
        dataFim
      })
      console.log('[DEBUG] Dados de relatórios recebidos do backend:', data)
      
      // Mapear para o formato da store
      reports.value = data.map((r: ReportData) => ({
        id: r.id,
        celulaId: r.celulaId,
        dataInicio: r.dataInicio,
        dataFim: r.dataFim,
        evento: r.evento,
        status: r.status,
        dataEnvio: r.dataEnvio,
        observacoes: r.observacoes
      }))
      
      console.log('[DEBUG] Relatórios mapeados para a store:', reports.value)
      return reports.value
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error)
      return []
    }
  }
  
  // Carregar relatório por semana e tipo de evento
  async function carregarRelatorioPorSemana(dataInicio: Date | string, dataFim: Date | string, evento: number) {
    try {
      // Verificar o ID da célula no memberStore
      let celulaId = memberStore.celulaId
      
      if (!celulaId) {
        // Tentar carregar os membros para obter o ID da célula
        await memberStore.carregarMembros()
        celulaId = memberStore.celulaId
        
        // Se ainda não encontrado, lançar erro
        if (!celulaId) {
          throw new Error('ID da célula não encontrado')
        }
      }
      
      // Formatar datas
      const inicio = typeof dataInicio === 'string' ? dataInicio : format(dataInicio, 'yyyy-MM-dd')
      const fim = typeof dataFim === 'string' ? dataFim : format(dataFim, 'yyyy-MM-dd')
      
      // Verificar se já existe um relatório para esta semana e evento
      const relatorioExistente = await relatorioService.verificarRelatorioExistente(celulaId, inicio, fim, evento)
      
      if (relatorioExistente) {
        console.log(`Relatório já existe no servidor para a semana ${inicio} - ${fim}, evento ${evento}, atualizando store`)
        
        const newReport: Report = {
          id: relatorioExistente.id,
          celulaId: celulaId,
          dataInicio: relatorioExistente.dataInicio,
          dataFim: relatorioExistente.dataFim,
          evento: relatorioExistente.evento,
          status: relatorioExistente.status,
          dataEnvio: relatorioExistente.dataEnvio,
          observacoes: relatorioExistente.observacoes
        }
        
        // Adicionar à store se ainda não existe
        if (!reports.value.some(r => r.id === relatorioExistente.id)) {
          reports.value.push(newReport)
        } else {
          // Atualizar o relatório existente na store
          const index = reports.value.findIndex(r => r.id === relatorioExistente.id)
          if (index !== -1) {
            reports.value[index] = newReport
          }
        }
        
        return newReport
      }
      
      return null
    } catch (error) {
      console.error('Erro ao carregar relatório por semana:', error)
      return null
    }
  }
  
  // Criar um novo relatório
  async function criarRelatorio(dataInicio: Date | string, dataFim: Date | string, evento: number) {
    try {
      // Verificar o ID da célula no memberStore
      let celulaId = memberStore.celulaId
      
      if (!celulaId) {
        // Tentar carregar os membros para obter o ID da célula
        await memberStore.carregarMembros()
        celulaId = memberStore.celulaId
        
        // Se ainda não encontrado, lançar erro
        if (!celulaId) {
          throw new Error('ID da célula não encontrado')
        }
      }
      
      // Formatar datas
      const inicio = typeof dataInicio === 'string' ? dataInicio : format(dataInicio, 'yyyy-MM-dd')
      const fim = typeof dataFim === 'string' ? dataFim : format(dataFim, 'yyyy-MM-dd')
      
      console.log(`[DEBUG] criarRelatorio - Criando relatório para semana ${inicio} - ${fim}, evento ${evento}`)
      
      // Verificar se já existe um relatório para esta semana e evento
      if (hasReportForWeek(inicio, fim, evento)) {
        console.warn(`Já existe um relatório para a semana ${inicio} - ${fim}, evento ${evento}`)
        
        // Buscar o ID do relatório existente para retornar em vez de criar um novo
        const existingReport = reports.value.find(r => {
          const reportInicio = typeof r.dataInicio === 'string' ? new Date(r.dataInicio) : r.dataInicio
          const reportFim = typeof r.dataFim === 'string' ? new Date(r.dataFim) : r.dataFim
          
          return format(reportInicio, 'yyyy-MM-dd') === format(new Date(inicio), 'yyyy-MM-dd') && 
                 format(reportFim, 'yyyy-MM-dd') === format(new Date(fim), 'yyyy-MM-dd') &&
                 r.evento === evento
        })
        
        return existingReport ? existingReport.id : null
      }
      
      // Verificar diretamente no serviço se já existe um relatório
      const relatorioExistente = await relatorioService.verificarRelatorioExistente(celulaId, inicio, fim, evento)
      if (relatorioExistente) {
        console.log(`Relatório já existe no servidor para a semana ${inicio} - ${fim}, evento ${evento}, atualizando store`)
        
        const newReport: Report = {
          id: relatorioExistente.id,
          celulaId: celulaId,
          dataInicio: relatorioExistente.dataInicio,
          dataFim: relatorioExistente.dataFim,
          evento: relatorioExistente.evento,
          status: relatorioExistente.status,
          dataEnvio: relatorioExistente.dataEnvio,
          observacoes: relatorioExistente.observacoes
        }
        
        // Adicionar à store se ainda não existe
        if (!reports.value.some(r => r.id === relatorioExistente.id)) {
          reports.value.push(newReport)
        } else {
          // Atualizar o relatório existente na store
          const index = reports.value.findIndex(r => r.id === relatorioExistente.id)
          if (index !== -1) {
            reports.value[index] = newReport
          }
        }
        
        currentReportId.value = relatorioExistente.id
        return relatorioExistente.id
      }
      
      // Se não existe, criar um novo
      const result = await relatorioService.criarRelatorio(
        celulaId,
        inicio,
        fim,
        evento,
        `Relatório criado via sistema em ${new Date().toLocaleDateString()}`
      )
      
      // Adicionar o relatório à store
      reports.value.push({
        id: result.id,
        celulaId: celulaId,
        dataInicio: result.dataInicio,
        dataFim: result.dataFim,
        evento: result.evento,
        status: result.status,
        dataEnvio: result.dataEnvio,
        observacoes: result.observacoes
      })
      
      currentReportId.value = result.id
      return result.id
    } catch (error) {
      console.error('Erro ao criar relatório:', error)
      return null
    }
  }
  
  // Enviar relatório
  async function enviarRelatorio(reportId: number) {
    try {
      console.log(`[DEBUG] enviarRelatorio - Enviando relatório ID=${reportId}`)
      
      // Verificar se o relatório existe
      if (!reportId) {
        throw new Error('ID do relatório não fornecido')
      }
      
      // Buscar o relatório para verificar a semana
      const relatorio = reports.value.find(r => r.id === reportId || r.id === reportId.toString())
      
      if (relatorio) {
        // Verificar se a semana do relatório é a semana permitida
        const semanaPermitida = calcularPeriodoRelatorio()
        const dataInicioRelatorio = typeof relatorio.dataInicio === 'string' ? new Date(relatorio.dataInicio) : relatorio.dataInicio
        const dataInicioPermitida = semanaPermitida.dataInicio
        
        if (format(dataInicioRelatorio, 'yyyy-MM-dd') !== format(dataInicioPermitida, 'yyyy-MM-dd')) {
          throw new Error('Não é possível enviar relatórios de semanas anteriores')
        }
        
        // Verificar se está dentro do período de envio
        if (!isDentroPeriodoEnvio.value) {
          throw new Error('O período para envio de relatórios está fechado')
        }
      }
      
      // Enviar o relatório
      const result = await relatorioService.enviarRelatorio(reportId)
      
      // Atualizar o relatório na store
      const index = reports.value.findIndex(r => r.id === reportId || r.id === reportId.toString())
      
      if (index !== -1) {
        reports.value[index] = {
          ...reports.value[index],
          status: STATUS_RELATORIO.ENVIADO,
          dataEnvio: result.dataEnvio
        }
      }
      
      return true
    } catch (error) {
      console.error('Erro ao enviar relatório:', error)
      return false
    }
  }
  
  // Definir a semana atual
  function setCurrentWeek(dataInicio: Date, dataFim: Date) {
    currentWeek.value = { dataInicio, dataFim }
  }
  
  // Avançar para a próxima semana
  function nextWeek() {
    const newDataInicio = addDays(currentWeek.value.dataInicio, 7)
    const newDataFim = addDays(currentWeek.value.dataFim, 7)
    
    // Não permitir avançar além da semana que deve ser relatada
    const limiteSemana = calcularPeriodoRelatorio()
    if (isAfter(newDataInicio, limiteSemana.dataInicio)) {
      return
    }
    
    currentWeek.value = { dataInicio: newDataInicio, dataFim: newDataFim }
  }
  
  // Voltar para a semana anterior
  function previousWeek() {
    const newDataInicio = subDays(currentWeek.value.dataInicio, 7)
    const newDataFim = subDays(currentWeek.value.dataFim, 7)
    
    // Não permitir voltar além de 4 semanas atrás (apenas para visualização)
    const limiteAnterior = subWeeks(calcularPeriodoRelatorio().dataInicio, 4)
    if (isBefore(newDataInicio, limiteAnterior)) {
      return
    }
    
    currentWeek.value = { dataInicio: newDataInicio, dataFim: newDataFim }
  }
  
  // Ir para a semana atual
  function goToCurrentWeek() {
    currentWeek.value = calcularPeriodoRelatorio()
  }
  
  return {
    reports,
    currentReportId,
    currentWeek,
    isDentroPeriodoEnvio,
    diasParaFimPeriodo,
    reportMessage,
    canSubmitReport,
    carregarRelatorios,
    carregarRelatorioPorSemana,
    criarRelatorio,
    enviarRelatorio,
    setCurrentWeek,
    nextWeek,
    previousWeek,
    goToCurrentWeek,
    hasReportForWeek,
    hasSubmittedReportForWeek,
    calcularPeriodoRelatorio
  }
}) 