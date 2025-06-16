<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import MonthSelector from '../components/MonthSelector.vue'
import MemberStatusCard from '../components/MemberStatusCard.vue'
import { useMemberStore } from '../stores/memberStore'
import { useAttendanceStore } from '../stores/attendanceStore'
import { useReportStore } from '../stores/reportStore'
import relatorioService from '../services/relatorioService'
import { format } from 'date-fns'
import Toast from '../components/Toast.vue'

// Definir as stores
const memberStore = useMemberStore()
const attendanceStore = useAttendanceStore()
const reportStore = useReportStore()

// Estado para o relatório
const reportId = ref<number | null>(null)
const isReportSubmitted = ref(false)
const isSending = ref(false)
const loadingReport = ref(false)
const showConfirmModal = ref(false)

// Estado para o toast
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'warning' | 'info'>('info')

// Computed properties
const members = computed(() => memberStore.getAllMembers.filter(member => member.isActive))

// Verificar status temporal do relatório
const today = new Date()
const deadlineDay = 10

// Verificar se é o mês atual
const isCurrentMonth = computed(() => {
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const selectedMonth = attendanceStore.currentDate.getMonth()
  const selectedYear = attendanceStore.currentDate.getFullYear()
  
  return currentMonth === selectedMonth && currentYear === selectedYear
})

// Verificar se é um mês passado
const isMonthInPast = computed(() => {
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const selectedMonth = attendanceStore.currentDate.getMonth()
  const selectedYear = attendanceStore.currentDate.getFullYear()
  
  return (selectedYear < currentYear) || 
         (selectedYear === currentYear && selectedMonth < currentMonth)
})

// Verificar se é um mês futuro
const isMonthInFuture = computed(() => {
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const selectedMonth = attendanceStore.currentDate.getMonth()
  const selectedYear = attendanceStore.currentDate.getFullYear()
  
  return (selectedYear > currentYear) || 
         (selectedYear === currentYear && selectedMonth > currentMonth)
})

// Verificar se passou do prazo (dia 10 do mês seguinte)
const isPastDeadline = computed(() => {
  const currentDay = today.getDate()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const selectedMonth = attendanceStore.currentDate.getMonth()
  const selectedYear = attendanceStore.currentDate.getFullYear()
  
  // Se for o mês atual, verificar se passou do dia 10
  if (selectedMonth === currentMonth && selectedYear === currentYear) {
    return currentDay > deadlineDay
  }
  
  // Se for mês passado, sempre está atrasado
  return isMonthInPast.value
})

// Interface para o registro de frequência
interface AttendanceRecord {
  memberId: string;
  status: string;
  observation?: string;
}

// Get the member status from current month attendance records
function getMemberStatus(memberId: string) {
  const record = attendanceStore.currentMonthAttendance.records.find(
    (r: AttendanceRecord) => r.memberId === memberId
  )
  
  return record?.status || 'none'
}

// Get the member observation from current month attendance records
function getMemberObservation(memberId: string) {
  const record = attendanceStore.currentMonthAttendance.records.find(
    (r: AttendanceRecord) => r.memberId === memberId
  )
  
  return record?.observation || ''
}

// Carregar ou criar relatório para o mês atual
async function loadOrCreateReport() {
  loadingReport.value = true;
  const currentMonth = attendanceStore.currentDate.getMonth();
  const currentYear = attendanceStore.currentDate.getFullYear();
  
  try {
    // Verificar se já existe um relatório para este mês
    if (!memberStore.celulaId) {
      console.log("Carregando membros para obter ID da célula");
      // Tentar recarregar os membros para recuperar o celulaId
      await memberStore.carregarMembros();
      
      if (!memberStore.celulaId) {
        throw new Error("Célula não encontrada para o usuário");
      }
    }
    
    await reportStore.carregarRelatorios();
    
    // Filtrar para o mês atual - verificar propriedades corretas
    const relatorio = reportStore.reports.find((r: any) => 
      r.mes === currentMonth && 
      r.ano === currentYear
    );
    
    if (relatorio) {
      reportId.value = typeof relatorio.id === 'string' ? parseInt(relatorio.id) : relatorio.id;
      isReportSubmitted.value = relatorio.isFinalized;
      
      if (relatorio.mes !== currentMonth || relatorio.ano !== currentYear) {
        console.warn(`Inconsistência: Relatório encontrado (${relatorio.mes}/${relatorio.ano}) é diferente do solicitado (${currentMonth}/${currentYear})`);
      }
    } else {
      // Verificar se existe relatório usando o serviço
      if (memberStore.celulaId) {
        const relatorioExistente = await relatorioService.verificarRelatorioExistente(
          memberStore.celulaId,
          currentMonth,
          currentYear
        );
        
        if (relatorioExistente) {
          // Se o relatório já existe no backend mas não está na store
          reportId.value = relatorioExistente.id;
          isReportSubmitted.value = !!relatorioExistente.dataEnvio;
          
          // Atualizar a store
          await reportStore.carregarRelatorios();
        } else {
          // NÃO criar relatório automaticamente, deixar para criá-lo apenas quando o usuário enviar
          reportId.value = null;
          isReportSubmitted.value = false;
          console.log(`Não existe relatório para ${currentMonth}/${currentYear}. Será criado apenas quando o usuário clicar em "Enviar Relatório".`);
        }
      } else {
        console.error("ID da célula não disponível");
      }
    }
  } catch (error) {
    console.error('Erro ao carregar relatório:', error);
    reportId.value = null;
    isReportSubmitted.value = false;
  } finally {
    // Verificar relatórios na store para garantir que temos valores consistentes
    if (reportId.value !== null) {
      const relatorioNaStore = reportStore.reports.find(r => 
        r.id === reportId.value || r.id === reportId.value.toString()
      );
      
      if (relatorioNaStore) {
        // Verificar se o mês e ano correspondem ao solicitado
        if (relatorioNaStore.mes !== currentMonth || relatorioNaStore.ano !== currentYear) {
          console.error(`Erro: Relatório carregado com ID=${reportId.value} tem mes=${relatorioNaStore.mes}, ano=${relatorioNaStore.ano}, mas solicitamos mes=${currentMonth}, ano=${currentYear}`);
          
          // Tentar correção: buscar relatório com mês e ano corretos
          const relatorioCorreto = reportStore.reports.find(r => r.mes === currentMonth && r.ano === currentYear);
          if (relatorioCorreto) {
            console.log(`Corrigindo: encontrado relatório correto ID=${relatorioCorreto.id} com mes=${relatorioCorreto.mes}, ano=${relatorioCorreto.ano}`);
            reportId.value = typeof relatorioCorreto.id === 'string' ? parseInt(relatorioCorreto.id) : relatorioCorreto.id;
            isReportSubmitted.value = relatorioCorreto.isFinalized;
          } else {
            console.warn(`Não foi possível encontrar um relatório correto.`);
            // Reseta tudo e deixa o usuário criar manualmente
            reportId.value = null;
            isReportSubmitted.value = false;
          }
        }
        // Verificação de consistência entre isReportSubmitted e isFinalized
        else if (isReportSubmitted.value !== relatorioNaStore.isFinalized) {
          console.warn(`Inconsistência detectada: isReportSubmitted (${isReportSubmitted.value}) é diferente de relatorioNaStore.isFinalized (${relatorioNaStore.isFinalized})`);
          isReportSubmitted.value = relatorioNaStore.isFinalized;
        }
      }
    }
    
    loadingReport.value = false;
  }
}

// Abrir modal de confirmação
async function openConfirmModal() {
  if (isReportSubmitted.value) return;
  
  // Não permitir envio para meses futuros
  if (isMonthInFuture.value) {
    showToastMessage("Não é possível enviar relatórios para meses futuros.", "warning");
    return;
  }
  
  // Verificar se há registros antes de abrir o modal
  const records = attendanceStore.currentMonthAttendance.records;
  if (!records || records.length === 0) {
    showToastMessage("Não é possível enviar um relatório sem registros de frequência.", "error");
    return;
  }
  
  try {
    showConfirmModal.value = true;
  } catch (error) {
    showToastMessage("Erro ao preparar envio do relatório.", "error");
  }
}

// Fechar modal
function closeConfirmModal() {
  showConfirmModal.value = false;
}

// Função para mostrar toast
function showToastMessage(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    showToast.value = false
  }, 5000)
}

// Enviar relatório
async function sendReport() {
  if (isReportSubmitted.value) return;
  
  isSending.value = true;
  
  try {
    const records = attendanceStore.currentMonthAttendance.records;
    
    if (!records || records.length === 0) {
      showToastMessage("Não é possível enviar um relatório sem registros de frequência.", "error");
      isSending.value = false;
      showConfirmModal.value = false;
      return;
    }
    
    if (!reportId.value && memberStore.celulaId) {
      const currentMonth = attendanceStore.currentDate.getMonth();
      const currentYear = attendanceStore.currentDate.getFullYear();
      
      try {
        const relatorioExistente = await relatorioService.verificarRelatorioExistente(
          memberStore.celulaId,
          currentMonth,
          currentYear
        );
        
        if (relatorioExistente) {
          reportId.value = relatorioExistente.id;
        } else {
          const novoRelatorio = await relatorioService.criarRelatorio(
            memberStore.celulaId,
            currentMonth,
            currentYear,
            `Relatório criado via sistema em ${new Date().toLocaleDateString()}`
          );
          
          reportId.value = novoRelatorio.id;
        }
      } catch (error) {
        showToastMessage("Não foi possível criar o relatório. Por favor, tente novamente.", "error");
        isSending.value = false;
        showConfirmModal.value = false;
        return;
      }
    }
    
    if (!reportId.value) {
      showToastMessage('Erro: Nenhum relatório disponível para envio. Tente recarregar a página.', 'error');
      isSending.value = false;
      showConfirmModal.value = false;
      return;
    }
    
    const currentReportId = reportId.value;
    
    if (records && records.length > 0) {
      try {
        for (const registro of records) {
          // Garantir que o ID do membro seja um número
          const membroId = typeof registro.memberId === 'string' ? 
            parseInt(registro.memberId) : 
            registro.memberId;
          
          if (isNaN(membroId)) {
            showToastMessage(`ID inválido para o membro: ${registro.memberId}`, 'error');
            continue;
          }
          
          const presencaCelula = registro.status === 'cell' || registro.status === 'both';
          const presencaCulto = registro.status === 'worship' || registro.status === 'both';
          
          try {
            await relatorioService.registrarPresenca(currentReportId, membroId, {
              presencaCelula,
              presencaCulto,
              semana: 1,
              observacoes: registro.observation || ''
            });
          } catch (presencaError: any) {
            // Mostrar mensagem específica do erro
            showToastMessage(
              presencaError.message || 'Erro ao registrar presença para um membro', 
              'error'
            );
            throw presencaError; // Propagar erro para interromper o envio
          }
        }
      } catch (error) {
        showToastMessage('Erro ao registrar presenças. Por favor, tente novamente.', 'error');
        isSending.value = false;
        showConfirmModal.value = false;
        return;
      }
    }
    
    const result = await reportStore.enviarRelatorio(currentReportId);
    
    if (result) {
      isReportSubmitted.value = true;
      showConfirmModal.value = false;
      showToastMessage('Relatório enviado com sucesso!', 'success');
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await reportStore.carregarRelatorios();
    } else {
      showToastMessage('Não foi possível finalizar o relatório. Por favor, tente novamente.', 'error');
    }
  } catch (error: any) {
    let mensagemErro = 'Ocorreu um erro ao enviar o relatório. Por favor, tente novamente.';
    if (error && error.message) {
      mensagemErro += `\n${error.message}`;
    }
    
    showToastMessage(mensagemErro, 'error');
  } finally {
    isSending.value = false;
  }
}

// Inicialização
onMounted(() => {
  loadOrCreateReport();
});

// Adicionar um watcher para monitorar mudanças no mês selecionado
watch(() => attendanceStore.currentDate, () => {
  // Resetar o estado do relatório
  reportId.value = null;
  isReportSubmitted.value = false;
  
  // Carregar ou criar relatório para o novo mês
  loadOrCreateReport();
}, { deep: true });

// Note: Esta abordagem é usada para que os erros de linter não apareçam no template
// Definimos explicitamente quais propriedades e métodos estão disponíveis no template
defineExpose({
  isReportSubmitted,
  openConfirmModal,
  isSending,
  loadingReport,
  members,
  getMemberStatus,
  getMemberObservation,
  attendanceStore,
  showConfirmModal,
  sendReport,
  closeConfirmModal,
  // Novas propriedades para avisos temporais
  isCurrentMonth,
  isMonthInPast,
  isMonthInFuture,
  isPastDeadline
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Toast component -->
    <Toast
      :show="showToast"
      :message="toastMessage"
      :type="toastType"
      :duration="5000"
      @close="showToast = false"
    />
    
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Cabeçalho com título e botão de enviar -->
      <div class="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Registro de Frequência</h1>
          <p class="mt-1 text-gray-500">Marque a presença dos membros no culto e na célula</p>
        </div>
        
        <div class="flex flex-col w-full md:w-auto gap-3">
          <!-- Banner de destaque para enviar relatório -->
          <div v-if="!isReportSubmitted" class="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-md">
            <div class="flex items-start">
              <svg class="h-6 w-6 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p class="text-sm font-medium text-blue-700">Finalize o registro de frequência</p>
                <p class="text-xs text-blue-600 mt-1">Ao enviar o relatório, ele não poderá mais ser editado.</p>
              </div>
            </div>
          </div>
          
          <!-- Botão de enviar relatório -->
          <button 
            v-if="!isReportSubmitted"
            @click="openConfirmModal" 
            :disabled="isSending || loadingReport || members.length === 0 || isMonthInFuture"
            class="btn btn-primary w-full md:w-auto flex items-center justify-center py-3 px-5 text-base shadow-lg"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            <span v-if="isSending">Enviando...</span>
            <span v-else-if="loadingReport">Carregando...</span>
            <span v-else-if="isMonthInFuture">Não disponível para meses futuros</span>
            <span v-else>Enviar Relatório</span>
          </button>
          
          <!-- Mensagem de relatório enviado -->
          <div v-if="isReportSubmitted" class="flex items-center text-green-600 justify-center md:justify-start w-full bg-green-50 p-2 rounded-md">
            <svg class="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <span class="text-sm font-medium">Relatório enviado</span>
          </div>
        </div>
      </div>
      
      <!-- Success Message após envio -->
      <div v-if="isReportSubmitted" class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-green-800">
              Relatório enviado com sucesso!
            </h3>
            <div class="mt-2 text-sm text-green-700">
              <p>
                O relatório de frequência foi finalizado e não pode mais ser editado. 
                Para visualizar os relatórios enviados, acesse a página de Relatórios.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <MonthSelector class="mb-6" />
      
      <!-- Avisos sobre situação do relatório -->
      <div class="mb-6">
        <div v-if="isMonthInFuture" class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.667-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-yellow-700">
                <strong>Atenção:</strong> Você está registrando frequência para um mês futuro. Os relatórios futuros não podem ser enviados até que o mês chegue.
              </p>
            </div>
          </div>
        </div>
        
        <div v-else-if="isMonthInPast && !isReportSubmitted" class="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">
                <strong>Relatório atrasado:</strong> Este relatório deveria ter sido enviado até o dia 10 do mês seguinte. Por favor, complete o registro e envie o quanto antes.
              </p>
            </div>
          </div>
        </div>
        
        <div v-else-if="isCurrentMonth && !isReportSubmitted && isPastDeadline" class="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-md">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-orange-700">
                <strong>Prazo expirado:</strong> O prazo ideal para envio deste relatório já passou (dia 10). Por favor, complete o registro e envie o quanto antes.
              </p>
            </div>
          </div>
        </div>
        
        <div v-else-if="isCurrentMonth && !isReportSubmitted && !isPastDeadline" class="bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-green-700">
                <strong>Dentro do prazo:</strong> Você ainda tem até o dia 10 do próximo mês para enviar este relatório. Lembre-se de completar o registro e enviar antes do prazo.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="members.length > 0" class="space-y-4">
        <MemberStatusCard 
          v-for="member in members" 
          :key="member.id" 
          :member="member"
          :status="getMemberStatus(member.id)"
          :observation="getMemberObservation(member.id)"
          :disabled="isReportSubmitted"
        />
      </div>
      
      <div v-else class="bg-white rounded-lg p-8 text-center">
        <h3 class="text-lg font-medium text-gray-900 mb-2">Nenhum membro cadastrado</h3>
        <p class="text-gray-500 mb-4">Adicione membros para registrar a frequência</p>
        <router-link :to="{ name: 'minha-celula' }" class="btn btn-primary">
          Cadastrar Membros
        </router-link>
      </div>
    </main>
    
    <!-- Botão fixo no rodapé para enviar relatório (visível apenas em dispositivos móveis) -->
    <div 
      v-if="!isReportSubmitted && members.length > 0" 
      class="fixed bottom-0 left-0 right-0 p-4 bg-white shadow-lg border-t border-gray-200 md:hidden z-10"
    >
      <button 
        @click="openConfirmModal" 
        :disabled="isSending || loadingReport || isMonthInFuture"
        class="btn btn-primary w-full py-3 flex items-center justify-center"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
        </svg>
        <span v-if="isSending">Enviando...</span>
        <span v-else-if="loadingReport">Carregando...</span>
        <span v-else-if="isMonthInFuture">Não disponível para meses futuros</span>
        <span v-else>Enviar Relatório</span>
      </button>
    </div>
    
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
                  Confirmar envio do relatório
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">
                    <strong>Atenção:</strong> Ao enviar o relatório, ele não poderá mais ser editado. 
                    Todos os registros de frequência serão finalizados.
                  </p>
                  
                  <div class="mt-4 p-3 bg-gray-50 rounded-md">
                    <h4 class="text-sm font-medium text-gray-900">Resumo do relatório:</h4>
                    <ul class="mt-2 space-y-1 text-sm text-gray-500">
                      <li>• {{ members.length }} membros registrados</li>
                      <li>• Frequência no culto: {{ attendanceStore.currentMonthStats.worship }} membros</li>
                      <li>• Frequência na célula: {{ attendanceStore.currentMonthStats.cell }} membros</li>
                      <li>• Participação em ambos: {{ attendanceStore.currentMonthStats.both }} membros</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button 
              @click="sendReport" 
              type="button" 
              class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
              :disabled="isSending"
            >
              <span v-if="isSending">Enviando...</span>
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

<style>
  .btn {
    @apply font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2;
  }
  
  .btn-primary {
    @apply bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500;
  }
</style>