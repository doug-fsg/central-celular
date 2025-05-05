import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useUserStore } from './userStore'
import { useMemberStore } from './memberStore'
import relatorioService, { Presenca } from '../services/relatorioService'

export type AttendanceStatus = 'none' | 'worship' | 'cell' | 'both'

export interface AttendanceRecord {
  memberId: string
  status: AttendanceStatus
  observation?: string
  week1?: { worship: boolean, cell: boolean }
  week2?: { worship: boolean, cell: boolean }
  week3?: { worship: boolean, cell: boolean }
  week4?: { worship: boolean, cell: boolean }
}

export interface MonthlyAttendance {
  id: string
  month: number
  year: number
  records: AttendanceRecord[]
}

export const useAttendanceStore = defineStore('attendance', () => {
  const userStore = useUserStore()
  const memberStore = useMemberStore()
  
  // Current month and year for the form
  const currentDate = ref(new Date())
  
  // Monthly attendance records
  const monthlyAttendances = ref<MonthlyAttendance[]>([])
  
  // Estado de carregamento e erro
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Relatório atual sendo visualizado/editado
  const relatorioAtualId = ref<number | null>(null)
  
  // Get formatted month and year for display
  const formattedCurrentMonth = computed(() => {
    return format(currentDate.value, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())
  })
  
  // Verificar se este mês já tem relatório enviado
  const mesTemRelatorio = computed(() => {
    const month = currentDate.value.getMonth()
    const year = currentDate.value.getFullYear()
    
    return monthlyAttendances.value.some(m => m.month === month && m.year === year)
  })
  
  // Get current month's attendance records
  const currentMonthAttendance = computed(() => {
    const month = currentDate.value.getMonth()
    const year = currentDate.value.getFullYear()
    
    const existingMonth = monthlyAttendances.value.find(
      m => m.month === month && m.year === year
    )
    
    if (existingMonth) {
      return existingMonth
    }
    
    // Create a new month record if it doesn't exist
    const newMonth: MonthlyAttendance = {
      id: `${year}-${month}`,
      month,
      year,
      records: []
    }
    
    monthlyAttendances.value.push(newMonth)
    return newMonth
  })
  
  // Navegar para o mês anterior
  function previousMonth() {
    // Criar nova data e verificar se o mês resultante é válido
    const newDate = subMonths(currentDate.value, 1);
    const newMonth = newDate.getMonth();
    
    // Verificar se o resultado está dentro do intervalo de meses válidos (0-11)
    if (newMonth < 0 || newMonth > 11) {
      return; // Sair sem alterar a data
    }
    
    // Atualizar a data e carregar dados do novo mês
    currentDate.value = newDate;
    carregarDadosFrequencia(newMonth, newDate.getFullYear());
  }
  
  // Navegar para o próximo mês
  function nextMonth() {
    // Criar nova data e verificar se o mês resultante é válido
    const newDate = addMonths(currentDate.value, 1);
    const newMonth = newDate.getMonth();
    
    // Verificar se o resultado está dentro do intervalo de meses válidos (0-11)
    if (newMonth < 0 || newMonth > 11) {
      return; // Sair sem alterar a data
    }
    
    // Atualizar a data e carregar dados do novo mês
    currentDate.value = newDate;
    carregarDadosFrequencia(newMonth, newDate.getFullYear());
  }
  
  // Carregar dados de frequência para o mês atual
  async function carregarDadosFrequencia(month: number, year: number) {
    loading.value = true;
    error.value = null;
    
    try {
      // Verificar se há um relatório para este mês/ano
      if (!memberStore.celulaId) {
        loading.value = false;
        return;
      }
      
      const relatorios = await relatorioService.listarRelatorios({
        celula: memberStore.celulaId,
        mes: month + 1, // API espera mês de 1-12
        ano: year
      });
      
      if (relatorios.length === 0) {
        // Não há relatório para este mês, criar uma estrutura vazia
        const newMonth: MonthlyAttendance = {
          id: `${year}-${month}`,
          month,
          year,
          records: []
        };
        
        monthlyAttendances.value.push(newMonth);
        relatorioAtualId.value = null;
        loading.value = false;
        return;
      }
      
      // Usar o primeiro relatório encontrado
      const relatorio = relatorios[0]
      relatorioAtualId.value = relatorio.id
      
      // Buscar detalhes do relatório (incluindo presenças)
      const relatorioDetalhes = await relatorioService.obterRelatorio(relatorio.id)
      
      // Transformar presenças para o formato usado pelo store
      const registros: AttendanceRecord[] = []
      
      // Mapear membros ativos da célula
      const membrosMap = new Map<number, AttendanceRecord>()
      
      // Preparar uma estrutura inicial para cada membro
      memberStore.getAllMembers.forEach(membro => {
        const id = typeof membro.id === 'string' ? parseInt(membro.id) : membro.id
        membrosMap.set(id, {
          memberId: id.toString(),
          status: 'none',
          week1: { worship: false, cell: false },
          week2: { worship: false, cell: false },
          week3: { worship: false, cell: false },
          week4: { worship: false, cell: false }
        })
      })
      
      // Processar presença por semana
      if (relatorioDetalhes.presencas) {
        relatorioDetalhes.presencas.forEach(presenca => {
          const membroId = presenca.membroId
          const registro = membrosMap.get(membroId)
          
          if (registro) {
            // Atualizar o registro de presença para a semana
            const weekKey = `week${presenca.semana}` as keyof typeof registro
            
            if (registro[weekKey]) {
              const weekData = registro[weekKey] as { worship: boolean, cell: boolean }
              weekData.worship = presenca.presencaCulto
              weekData.cell = presenca.presencaCelula
            }
            
            // Determinar status agregado (considerar presença se participou de pelo menos uma atividade)
            if (presenca.presencaCulto && presenca.presencaCelula) {
              registro.status = 'both'
            } else if (presenca.presencaCulto) {
              registro.status = registro.status === 'cell' ? 'both' : 'worship'
            } else if (presenca.presencaCelula) {
              registro.status = registro.status === 'worship' ? 'both' : 'cell'
            }
            
            // Adicionar observações se houver
            if (presenca.observacoes) {
              registro.observation = presenca.observacoes
            }
          }
        })
      }
      
      // Converter o Map para array
      membrosMap.forEach(registro => {
        registros.push(registro)
      })
      
      // Atualizar ou adicionar o mês
      const existingMonthIndex = monthlyAttendances.value.findIndex(
        m => m.month === month && m.year === year
      )
      
      if (existingMonthIndex !== -1) {
        monthlyAttendances.value[existingMonthIndex].records = registros
      } else {
        monthlyAttendances.value.push({
          id: `${year}-${month}`,
          month,
          year,
          records: registros
        })
      }
    } catch (err) {
      console.error('Erro ao carregar dados de frequência:', err)
      error.value = 'Falha ao carregar dados de frequência'
    } finally {
      loading.value = false
    }
  }
  
  // Set attendance status for a member
  async function setAttendanceStatus(memberId: string, status: AttendanceStatus) {
    const record = currentMonthAttendance.value.records.find(
      r => r.memberId === memberId
    )
    
    // Atualizar localmente primeiro para a UI responder rapidamente
    if (record) {
      record.status = status
    } else {
      currentMonthAttendance.value.records.push({
        memberId,
        status
      })
    }
    
    // Se há um relatório aberto, sincronizar com o backend
    if (relatorioAtualId.value) {
      try {
        await salvarPresenca(memberId, status)
      } catch (err) {
        console.error('Erro ao salvar presença:', err)
        error.value = 'Falha ao salvar presença'
      }
    }
  }
  
  // Set observation for a member
  async function setObservation(memberId: string, observation: string) {
    const record = currentMonthAttendance.value.records.find(
      r => r.memberId === memberId
    )
    
    // Atualizar localmente primeiro
    if (record) {
      record.observation = observation
    } else {
      currentMonthAttendance.value.records.push({
        memberId,
        status: 'none',
        observation
      })
    }
    
    // Se há um relatório aberto, sincronizar com o backend
    if (relatorioAtualId.value) {
      try {
        await salvarPresenca(memberId, record?.status || 'none', observation)
      } catch (err) {
        console.error('Erro ao salvar observação:', err)
        error.value = 'Falha ao salvar observação'
      }
    }
  }
  
  // Salvar presença no backend
  async function salvarPresenca(memberId: string, status: AttendanceStatus, observation?: string) {
    if (!relatorioAtualId.value) return
    
    const presencaCulto = status === 'worship' || status === 'both'
    const presencaCelula = status === 'cell' || status === 'both'
    
    // Aqui estamos simplificando, assumindo que estamos na semana 1
    // Em uma implementação completa, você pode determinar a semana atual
    await relatorioService.registrarPresenca(relatorioAtualId.value, parseInt(memberId), {
      presencaCulto,
      presencaCelula,
      semana: 1, // Simplificado para exemplo
      observacoes: observation
    })
  }
  
  // Get attendance statistics for current month
  const currentMonthStats = computed(() => {
    const records = currentMonthAttendance.value.records
    
    const worship = records.filter(r => 
      r.status === 'worship' || r.status === 'both'
    ).length
    
    const cell = records.filter(r => 
      r.status === 'cell' || r.status === 'both'
    ).length
    
    const both = records.filter(r => r.status === 'both').length
    const total = records.length
    
    return {
      worship,
      cell,
      both,
      total,
      worshipPercentage: total > 0 ? (worship / total) * 100 : 0,
      cellPercentage: total > 0 ? (cell / total) * 100 : 0,
      bothPercentage: total > 0 ? (both / total) * 100 : 0
    }
  })
  
  // Inicializar quando o store for criado
  function init() {
    if (userStore.isLoggedIn && memberStore.celulaId) {
      carregarDadosFrequencia(currentDate.value.getMonth(), currentDate.value.getFullYear())
    }
  }
  
  // Observar mudanças na célula selecionada
  watch(() => memberStore.celulaId, (newCelulaId) => {
    if (newCelulaId) {
      carregarDadosFrequencia(currentDate.value.getMonth(), currentDate.value.getFullYear())
    }
  })
  
  // Inicializar
  init()
  
  return {
    currentDate,
    formattedCurrentMonth,
    monthlyAttendances,
    currentMonthAttendance,
    currentMonthStats,
    loading,
    error,
    mesTemRelatorio,
    previousMonth,
    nextMonth,
    setAttendanceStatus,
    setObservation,
    carregarDadosFrequencia
  }
})