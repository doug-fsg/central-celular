<script setup lang="ts">
import MonthSelector from '../components/MonthSelector.vue'
import StatsOverview from '../components/StatsOverview.vue'
import { useAttendanceStore } from '../stores/attendanceStore'
import { useMemberStore } from '../stores/memberStore'
import { useLeaderStore } from '../stores/leaderStore'
import { useReportStore } from '../stores/reportStore'
import { computed, ref, watch, onMounted } from 'vue'
import { format, isBefore, isAfter } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import relatorioService from '../services/relatorioService'

const attendanceStore = useAttendanceStore()
const memberStore = useMemberStore()
const leaderStore = useLeaderStore()
const reportStore = useReportStore()

// Estados do componente
const isSubmitting = ref(false)
const isSubmitted = ref(false)
const reportSubmitted = ref(false)
const showConfirmModal = ref(false)
const currentReportId = ref<number | null>(null)
const loadingReport = ref(false)

// Data
const today = new Date()
const currentMonth = today.getMonth()
const currentYear = today.getFullYear()
const deadlineDay = 10
const deadline = new Date(currentYear, currentMonth, deadlineDay)

// Verificar se já existe um relatório para o mês selecionado
const hasReportForCurrentMonth = computed(() => {
  return reportStore.hasReportForMonth(
    attendanceStore.currentDate.getMonth(),
    attendanceStore.currentDate.getFullYear()
  )
})

// Verificar se já existe um relatório finalizado para o mês selecionado
const hasSubmittedReportForCurrentMonth = computed(() => {
  return reportStore.hasSubmittedReportForMonth(
    attendanceStore.currentDate.getMonth(),
    attendanceStore.currentDate.getFullYear()
  )
})

// Verificar se é possível enviar relatório (baseado no dia do mês e outros fatores)
const canSubmitCurrentMonth = computed(() => {
  // Se não estamos no mês atual, verificamos se é um mês passado
  if (attendanceStore.currentDate.getMonth() !== today.getMonth() || 
      attendanceStore.currentDate.getFullYear() !== today.getFullYear()) {
    
    // Mês passado que ainda não tem relatório pode receber (mesmo fora do prazo)
    if (isBeforeToday(attendanceStore.currentDate) && !hasSubmittedReportForCurrentMonth.value) {
      return {
        allowed: true,
        message: "⚠️ Relatório atrasado"
      }
    }
    
    // Mês futuro não pode receber relatório
    if (isAfterToday(attendanceStore.currentDate)) {
      return {
        allowed: false,
        message: "Não é possível enviar relatórios para meses futuros"
      }
    }
  }
  
  // Para o mês atual, usamos a lógica padrão da store
  return reportStore.canSubmitReport
})

// Verifica se a data é anterior a hoje
function isBeforeToday(date: Date) {
  const today = new Date()
  return new Date(date.getFullYear(), date.getMonth()) < new Date(today.getFullYear(), today.getMonth())
}

// Verifica se a data é posterior a hoje
function isAfterToday(date: Date) {
  const today = new Date()
  return new Date(date.getFullYear(), date.getMonth()) > new Date(today.getFullYear(), today.getMonth())
}

// Verificar se está dentro do prazo (até dia 10)
const isOnTime = computed(() => {
  return isBefore(today, deadline) || format(today, 'dd') === '10'
})

// Calculate statistics for current month
const worshipAttendanceCount = computed(() => {
  const { worship } = attendanceStore.currentMonthStats
  return worship
})

const cellAttendanceCount = computed(() => {
  const { cell } = attendanceStore.currentMonthStats
  return cell
})

const bothAttendanceCount = computed(() => {
  const { both } = attendanceStore.currentMonthStats
  return both
})

const totalMembers = computed(() => {
  // Filtrar apenas membros ativos
  return memberStore.getAllMembers.filter(m => m.isActive).length
})

const presentMembers = computed(() => {
  const { worship, cell, both } = attendanceStore.currentMonthStats
  return worship + cell - both // Count each person only once
})

// Get attendance records with member data
const attendanceRecords = computed(() => {
  const records = attendanceStore.currentMonthAttendance.records
  // Filtrar apenas membros ativos
  return records
    .map(record => {
      const member = memberStore.getAllMembers.find(m => m.id === record.memberId)
      return {
        ...record,
        memberName: member?.name || 'Membro não encontrado',
        isConsolidator: member?.isConsolidator || false,
        isCoLeader: member?.isCoLeader || false,
        isActive: member?.isActive || false
      }
    })
    .filter(record => record.isActive) // Filtrar apenas membros ativos
})

const statusLabels = {
  none: 'Não compareceu',
  worship: 'Culto',
  cell: 'Célula',
  both: 'Culto e Célula'
}

const statusColors = {
  none: 'gray',
  worship: 'blue',
  cell: 'purple',
  both: 'green'
}

// Carregar ou criar relatório para o mês atual
async function loadOrCreateReport() {
  loadingReport.value = true;
  
  try {
    // Verificar se já existe um relatório para este mês
    const relatorios = await reportStore.carregarRelatorios();
    
    // Filtrar para o mês atual
    const relatorio = reportStore.reports.find(r => 
      r.mes === attendanceStore.currentDate.getMonth() && 
      r.ano === attendanceStore.currentDate.getFullYear()
    );
    
    if (relatorio) {
      currentReportId.value = parseInt(relatorio.id.toString());
      isSubmitted.value = relatorio.isFinalized;
      reportSubmitted.value = relatorio.isFinalized;
    } else {
      // Verificar se existe relatório usando o serviço antes de criar
      if (memberStore.celulaId) {
        const relatorioExistente = await relatorioService.verificarRelatorioExistente(
          memberStore.celulaId,
          attendanceStore.currentDate.getMonth(),
          attendanceStore.currentDate.getFullYear()
        );
        
        if (relatorioExistente) {
          currentReportId.value = relatorioExistente.id;
          isSubmitted.value = !!relatorioExistente.dataEnvio;
          reportSubmitted.value = !!relatorioExistente.dataEnvio;
          
          // Atualizar a store
          await reportStore.carregarRelatorios();
        } else {
          const newReportId = await reportStore.criarRelatorio();
          if (newReportId) {
            currentReportId.value = typeof newReportId === 'number' ? newReportId : parseInt(newReportId);
          }
        }
      } else {
        console.error("ID da célula não disponível para criar relatório");
      }
    }
  } catch (error) {
    console.error('Erro ao carregar/criar relatório:', error);
  } finally {
    loadingReport.value = false;
  }
}

// Mostrar modal de confirmação
function openConfirmModal() {
  if (!canSubmitCurrentMonth.value.allowed || !currentReportId.value) {
    return;
  }
  
  showConfirmModal.value = true;
}

// Fechar modal de confirmação
function closeConfirmModal() {
  showConfirmModal.value = false;
}

// Enviar o relatório
async function enviarRelatorio() {
  if (!currentReportId.value) {
    return;
  }
  
  isSubmitting.value = true;
  
  try {
    const submitted = await reportStore.enviarRelatorio(currentReportId.value);
    
    if (submitted) {
      // Atualizar o status de submissão do relatório no leaderStore
      leaderStore.reportSubmitted(isOnTime.value);
      
      reportSubmitted.value = true;
      isSubmitted.value = true;
      showConfirmModal.value = false;
    }
  } catch (error) {
    console.error('Erro ao enviar relatório:', error);
  } finally {
    isSubmitting.value = false;
  }
}

// Carregar ou criar relatório quando o componente for montado
onMounted(() => {
  loadOrCreateReport();
});

// Resetar o estado quando mudar de mês
watch(() => attendanceStore.currentDate, () => {
  loadOrCreateReport();
});

// Funções auxiliares para a tabela
function getStatusColor(member: any, week: number): string {
  const weekKey = `week${week}`;
  const status = member[weekKey];
  
  if (!status) return 'gray';
  
  if (status.worship && status.cell) return 'green';
  if (status.worship) return 'blue';
  if (status.cell) return 'purple';
  
  return 'gray';
}

// Obter o label para o status
function getStatusLabel(status: string | any): string {
  // Se for um objeto com week info
  if (typeof status === 'object' && status !== null) {
    const weekKey = `week${status.week}`;
    const weekStatus = status[weekKey];
    
    if (!weekStatus) return 'Não registrado';
    
    if (weekStatus.worship && weekStatus.cell) return 'Culto e Célula';
    if (weekStatus.worship) return 'Culto';
    if (weekStatus.cell) return 'Célula';
    
    return 'Não compareceu';
  }
  
  // Se for uma string simples
  switch (status) {
    case 'both':
      return 'Culto e Célula';
    case 'worship':
      return 'Culto';
    case 'cell':
      return 'Célula';
    case 'none':
      return 'Não compareceu';
    default:
      return 'Não registrado';
  }
}

function calculateMemberTotal(member: any): number {
  let total = 0;
  
  for (let i = 1; i <= 4; i++) {
    const weekKey = `week${i}`;
    const status = member[weekKey];
    
    if (status) {
      if (status.worship) total++;
      if (status.cell) total++;
    }
  }
  
  return total;
}

// Formatar data para exibição
function formatDate(date: Date | null | undefined): string {
  if (!date) return 'Data não disponível';
  
  try {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return 'Data inválida';
  }
}

// Verificar se o membro compareceu ao culto
function memberAttendsCulto(memberId: string) {
  const record = attendanceStore.currentMonthAttendance.records.find(
    (r: any) => r.memberId === memberId
  );
  
  return record && (record.status === 'worship' || record.status === 'both');
}

// Verificar se o membro compareceu à célula
function memberAttendsCelula(memberId: string) {
  const record = attendanceStore.currentMonthAttendance.records.find(
    (r: any) => r.memberId === memberId
  );
  
  return record && (record.status === 'cell' || record.status === 'both');
}

// Obter a classe CSS para o status
function getStatusClass(status: string) {
  switch (status) {
    case 'both':
      return 'bg-green-100 text-green-800';
    case 'worship':
      return 'bg-blue-100 text-blue-800';
    case 'cell':
      return 'bg-purple-100 text-purple-800';
    case 'none':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p class="mt-1 text-gray-500">Visualize os relatórios de frequência do mês de {{ attendanceStore.formattedCurrentMonth }}</p>
        </div>
        
      <MonthSelector class="mb-6" />
      
      <!-- Loading state -->
      <div v-if="loadingReport" class="text-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
        <p class="mt-4 text-gray-600">Carregando dados do relatório...</p>
        </div>
        
      <!-- Empty/No Report state -->
      <div v-else-if="!hasSubmittedReportForCurrentMonth" class="text-center py-8 bg-white rounded-lg shadow">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">Nenhum relatório enviado</h3>
        <p class="mt-1 text-sm text-gray-500">O relatório para este mês ainda não foi finalizado.</p>
        <div class="mt-6">
          <router-link to="/attendance" class="btn btn-primary">
            Ir para Frequência
          </router-link>
        </div>
      </div>
      
      <!-- Report content -->
      <div v-else>
        <!-- Status badge -->
        <div class="mb-6 flex justify-between items-center">
          <div class="text-sm">
            <span 
              class="inline-flex items-center px-2.5 py-0.5 rounded-full font-medium"
              :class="currentReportId ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
            >
              <svg class="-ml-0.5 mr-1.5 h-2 w-2" :class="currentReportId ? 'text-green-400' : 'text-yellow-400'" fill="currentColor" viewBox="0 0 8 8">
                <circle cx="4" cy="4" r="3" />
            </svg>
              {{ currentReportId ? 'Relatório enviado' : 'Rascunho - Não enviado' }}
            </span>
          </div>
          
          <div>
            <p class="text-xs text-gray-500">
              {{ isSubmitted ? `Enviado em: ${formatDate(new Date())}` : 'Pendente de envio' }}
            </p>
          </div>
        </div>
        
        <!-- Stats cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <div class="flex items-center">
                <div class="flex-shrink-0 bg-primary-100 rounded-md p-3">
                  <svg class="h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Total de Membros
                    </dt>
                    <dd>
                      <div class="text-lg font-medium text-gray-900">{{ totalMembers }}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <div class="flex items-center">
                <div class="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <svg class="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Frequência no Culto
                    </dt>
                    <dd>
                      <div class="text-lg font-medium text-gray-900">
                        {{ worshipAttendanceCount }}
                        <span class="text-sm text-gray-500">
                          ({{ totalMembers > 0 ? Math.round((worshipAttendanceCount / totalMembers) * 100) : 0 }}%)
                        </span>
                      </div>
                    </dd>
                  </dl>
            </div>
          </div>
        </div>
      </div>
      
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <div class="flex items-center">
                <div class="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <svg class="h-6 w-6 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Frequência na Célula
                    </dt>
                    <dd>
                      <div class="text-lg font-medium text-gray-900">
                        {{ cellAttendanceCount }}
                        <span class="text-sm text-gray-500">
                          ({{ totalMembers > 0 ? Math.round((cellAttendanceCount / totalMembers) * 100) : 0 }}%)
                        </span>
                      </div>
                    </dd>
                  </dl>
                </div>
          </div>
        </div>
          </div>
          
          <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
              <div class="flex items-center">
                <div class="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <svg class="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 truncate">
                      Ambos Eventos
                    </dt>
                    <dd>
                      <div class="text-lg font-medium text-gray-900">
                        {{ bothAttendanceCount }}
                        <span class="text-sm text-gray-500">
                          ({{ totalMembers > 0 ? Math.round((bothAttendanceCount / totalMembers) * 100) : 0 }}%)
                        </span>
                      </div>
                    </dd>
                  </dl>
                </div>
          </div>
        </div>
          </div>
        </div>
        
        <!-- Report details - attendance table -->
        <div class="bg-white shadow overflow-hidden sm:rounded-md">
          <div class="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Detalhes de Frequência
            </h3>
            <p class="mt-1 max-w-2xl text-sm text-gray-500">
              Relatório detalhado por membro
            </p>
      </div>
      
          <!-- Attendance table (responsive) -->
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Membro
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Culto
                  </th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Célula
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Observações
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="(member, index) in attendanceRecords" :key="member.memberId" :class="{ 'bg-gray-50': index % 2 === 1 }">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div>
                        <div class="text-sm font-medium text-gray-900">{{ member.memberName }}</div>
                        <div class="text-xs text-gray-500 mt-1">
                          <span v-if="member.isConsolidator" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 mr-1">
                      Consolidador
                    </span>
                          <span v-if="member.isCoLeader" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary-100 text-secondary-800">
                      Co-Líder
                    </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm">
                      <span 
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        :class="memberAttendsCulto(member.memberId) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
                      >
                        {{ memberAttendsCulto(member.memberId) ? 'Sim' : 'Não' }}
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm">
                    <span 
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        :class="memberAttendsCelula(member.memberId) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
                    >
                        {{ memberAttendsCelula(member.memberId) ? 'Sim' : 'Não' }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                      class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                      :class="getStatusClass(member.status)"
                  >
                      {{ getStatusLabel(member.status) }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm text-gray-500 max-w-xs truncate">
                      {{ member.observation || '—' }}
                  </div>
                </td>
              </tr>
              
              <!-- Empty state -->
              <tr v-if="attendanceRecords.length === 0">
                  <td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500">
                    Nenhum registro de frequência para este mês
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
        
        <!-- Observations -->
        <div v-if="currentReportId && reportStore.reports.find(r => r.id === currentReportId)?.observations" class="mt-6 bg-white shadow overflow-hidden sm:rounded-md">
          <div class="px-4 py-5 sm:px-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Observações do Relatório
            </h3>
            <div class="mt-2 text-sm text-gray-500">
              <p>{{ reportStore.reports.find(r => r.id === currentReportId)?.observations }}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
    
    <!-- Confirmation Modal -->
    <div v-if="showConfirmModal" class="fixed inset-0 overflow-y-auto z-50">
      <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 transition-opacity" aria-hidden="true">
          <div class="absolute inset-0 bg-gray-900 opacity-75"></div>
        </div>
        
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg class="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 class="text-lg leading-6 font-medium text-gray-900">
                  Confirmação de Envio
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">
                    <strong>Atenção:</strong> Ao enviar o relatório, ele não poderá mais ser editado. Todos os registros de frequência serão finalizados.
                  </p>
                  
                  <div class="mt-4 p-3 bg-gray-50 rounded-md">
                    <h4 class="text-sm font-medium text-gray-900">Resumo do relatório:</h4>
                    <ul class="mt-2 space-y-1 text-sm text-gray-500">
                      <li>• {{ totalMembers }} membros registrados</li>
                      <li>• Taxa de presença geral: {{ totalMembers > 0 ? Math.round((presentMembers / totalMembers) * 100) : 0 }}%</li>
                      <li>• Frequência no culto: {{ worshipAttendanceCount }} membros</li>
                      <li>• Frequência na célula: {{ cellAttendanceCount }} membros</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button 
              @click="enviarRelatorio" 
              type="button" 
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
              :disabled="isSubmitting"
            >
              <span v-if="isSubmitting">Enviando...</span>
              <span v-else>Sim, enviar relatório</span>
            </button>
            <button 
              @click="closeConfirmModal" 
              type="button" 
              class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  @apply bg-white rounded-lg shadow;
}

.btn {
  @apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2;
}

.btn-primary {
  @apply bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500;
}
</style>