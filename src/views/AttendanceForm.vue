<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { format } from 'date-fns'
import relatorioService, { TIPO_EVENTO, STATUS_RELATORIO, STATUS_PRESENCA } from '../services/relatorioService'
import { useReportStore } from '../stores/reportStore'
import { useMemberStore } from '../stores/memberStore'
import PresenceTable from '../components/PresenceTable.vue'
import WeekSelector from '../components/WeekSelector.vue'
import Toast from '../components/Toast.vue'
import ReportSummaryCard from '../components/ReportSummaryCard.vue'
import ConfettiGenerator from 'confetti-js';

const route = useRoute()
const router = useRouter()
const reportStore = useReportStore()
const memberStore = useMemberStore()
const toastMessage = ref('')
const toastShow = ref(false)
const toastType = ref<'success' | 'error' | 'warning' | 'info'>('info')

// Estado
const loading = ref(false)
const error = ref<string | null>(null)
const members = ref<any[]>([])
const relatorioId = ref<number | null>(null)
const observacoes = ref('')
const currentWeek = ref(reportStore.currentWeek)
const teveCelula = ref(true)
const relatorioFinalizado = ref(false)
const mostrarObservacoes = ref(false)

// Computed
const podeEnviar = computed(() => {
  // Verificar se está na semana permitida
  const semanaPermitida = reportStore.calcularPeriodoRelatorio()
  const isCurrentReportWeek = format(currentWeek.value.dataInicio, 'yyyy-MM-dd') === format(semanaPermitida.dataInicio, 'yyyy-MM-dd')
  
  if (!isCurrentReportWeek) {
    return false; // Não permite enviar se não for a semana atual
  }
  
  // Sempre permite enviar se estiver na semana atual
  return true;
});

// Verificar se está na semana atual para mostrar mensagem
const isCurrentReportWeek = computed(() => {
  const semanaPermitida = reportStore.calcularPeriodoRelatorio()
  return format(currentWeek.value.dataInicio, 'yyyy-MM-dd') === format(semanaPermitida.dataInicio, 'yyyy-MM-dd')
});

// Métodos
const formatarPeriodo = (dataInicio: Date | string, dataFim: Date | string) => {
  const inicio = typeof dataInicio === 'string' ? new Date(dataInicio) : dataInicio
  const fim = typeof dataFim === 'string' ? new Date(dataFim) : dataFim
  return `${format(inicio, 'dd/MM')} - ${format(fim, 'dd/MM/yyyy')}`
}

const handleWeekChange = (week: any) => {
  // Atualizar a semana atual
  currentWeek.value = week;
  
  // Recarregar o relatório para a nova semana
  loadOrCreateReport();
}

const handlePresenceChange = async (membroId: number, status: number, tipo: number) => {
  if (!relatorioId.value) return;

  try {
    const membroIndex = members.value.findIndex(m => Number(m.id) === membroId);
    if (membroIndex !== -1) {
      if (tipo === TIPO_EVENTO.CELULA) {
        members.value[membroIndex].presencaCelula = status;
      } else if (tipo === TIPO_EVENTO.CULTO) {
        members.value[membroIndex].presencaCulto = status;
      }
    }
  } catch (error) {
    console.error('Erro ao atualizar presença localmente:', error);
    showToast('Erro ao atualizar presença', 'error');
  }
};

const loadOrCreateReport = async () => {
  try {
    loading.value = true;
    error.value = null;

    // Garantir que o memberStore tenha o celulaId carregado
    if (!memberStore.celulaId) {
      await memberStore.carregarMembros();
      
      // Se mesmo após carregar, ainda não tiver o celulaId, mostrar erro
      if (!memberStore.celulaId) {
        error.value = 'Não foi possível identificar sua célula. Verifique se você é um líder ativo.';
        loading.value = false;
        return;
      }
    }

    // Verificar se já existe um relatório para esta semana
    const relatorioExistente = await relatorioService.verificarRelatorioExistente(
      memberStore.celulaId,
      currentWeek.value.dataInicio,
      currentWeek.value.dataFim,
      TIPO_EVENTO.CELULA
    );

    if (relatorioExistente) {
      relatorioId.value = relatorioExistente.id;
      teveCelula.value = relatorioExistente.teveCelula;
      observacoes.value = relatorioExistente.observacoes || '';
      
      // Verificar se o relatório já foi enviado
      relatorioFinalizado.value = relatorioExistente.status === STATUS_RELATORIO.ENVIADO;
      
      // Se o relatório já foi enviado, buscar detalhes completos
      if (relatorioFinalizado.value) {
        const relatorioDetalhado = await relatorioService.obterRelatorio(relatorioExistente.id);
        // Atualizar os membros com as presenças do relatório
        await memberStore.carregarMembros();
        members.value = memberStore.members.map(membro => {
          const membroId = Number(membro.id);
          const presencaCelula = relatorioDetalhado.presencas.find(
            p => p.membroId === membroId && p.tipo === TIPO_EVENTO.CELULA
          );
          const presencaCulto = relatorioDetalhado.presencas.find(
            p => p.membroId === membroId && p.tipo === TIPO_EVENTO.CULTO
          );
          
          return {
            ...membro,
            presencaCelula: presencaCelula ? presencaCelula.status : STATUS_PRESENCA.AUSENTE,
            presencaCulto: presencaCulto ? presencaCulto.status : STATUS_PRESENCA.AUSENTE
          };
        });
      } else {
        // Carregar membros para relatório não finalizado
        await memberStore.carregarMembros();
        members.value = [...memberStore.members];
      }
    } else {
      // Carregar membros antes de criar o relatório
      await memberStore.carregarMembros();
      members.value = [...memberStore.members];
      
      // Criar um novo relatório
      const novoRelatorio = await relatorioService.criarRelatorio({
        celulaId: memberStore.celulaId,
        dataInicio: currentWeek.value.dataInicio,
        dataFim: currentWeek.value.dataFim,
        evento: TIPO_EVENTO.CELULA,
        teveCelula: teveCelula.value
      });
      relatorioId.value = novoRelatorio.id;
      relatorioFinalizado.value = false;
    }
  } catch (error) {
    console.error('Erro ao carregar/criar relatório:', error);
    error.value = 'Erro ao carregar relatório. Tente novamente.';
  } finally {
    loading.value = false;
  }
};

const salvarRascunho = async () => {
  if (!relatorioId.value) return

  try {
    await relatorioService.atualizarRelatorio(relatorioId.value, {
      observacoes: observacoes.value,
      teveCelula: teveCelula.value
    })
    showToast('Rascunho salvo com sucesso!', 'success')
  } catch (error) {
    console.error('Erro ao salvar rascunho:', error)
    showToast('Erro ao salvar rascunho', 'error')
  }
}

const enviarRelatorio = async () => {
  try {
    loading.value = true;
    error.value = null;

    if (!relatorioId.value) {
      // Criar novo relatório
      const novoRelatorio = await relatorioService.criarRelatorio({
        celulaId: memberStore.celulaId,
        dataInicio: currentWeek.value.dataInicio,
        dataFim: currentWeek.value.dataFim,
        evento: TIPO_EVENTO.CELULA,
        teveCelula: teveCelula.value,
        observacoes: observacoes.value
      });
      relatorioId.value = novoRelatorio.id;
    } else {
      // Atualizar relatório existente
      await relatorioService.atualizarRelatorio(relatorioId.value, {
        teveCelula: teveCelula.value,
        observacoes: observacoes.value
      });
    }

    // Enviar o relatório
    await relatorioService.enviarRelatorio(relatorioId.value);
    
    // Mostrar mensagem de sucesso com animação
    showSuccessAnimation();
    
    // Atualizar estado do relatório
    relatorioFinalizado.value = true;
  } catch (error) {
    console.error('Erro ao enviar relatório:', error);
    showToast('Erro ao enviar relatório. Tente novamente.', 'error');
  } finally {
    loading.value = false;
  }
};

// Função para mostrar animação de sucesso
const showSuccessAnimation = () => {
  // Criar o modal de sucesso
  const modalDiv = document.createElement('div');
  modalDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 9999;
  `;
  
  // Criar o conteúdo do modal
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 2rem;
    border-radius: 1rem;
    text-align: center;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    position: relative;
    width: 90%;
    max-width: 400px;
  `;
  
  // Adicionar o emoji e texto
  modalContent.innerHTML = `
    <div style="font-size: 4rem; margin-bottom: 1rem">🎉</div>
    <div style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem">Relatório Enviado!</div>
    <div style="color: #666; margin-bottom: 1.5rem">Obrigado por manter seus relatórios em dia</div>
  `;
  
  // Adicionar botão de fechar
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Fechar';
  closeButton.style.cssText = `
    background: #6366f1;
    color: white;
    border: none;
    padding: 0.75rem 2rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  `;
  closeButton.onmouseover = () => closeButton.style.backgroundColor = '#4f46e5';
  closeButton.onmouseout = () => closeButton.style.backgroundColor = '#6366f1';
  closeButton.onclick = () => modalDiv.remove();
  
  modalContent.appendChild(closeButton);
  modalDiv.appendChild(modalContent);
  document.body.appendChild(modalDiv);
  
  // Criar elemento de confete
  const confettiCanvas = document.createElement('canvas');
  confettiCanvas.id = 'success-confetti';
  confettiCanvas.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;';
  modalDiv.appendChild(confettiCanvas);
  
  // Configurar e iniciar animação de confete
  const confettiSettings = {
    target: 'success-confetti',
    max: 150,
    size: 2,
    animate: true,
    props: ['circle', 'square', 'triangle', 'line'],
    colors: [[165, 104, 246], [230, 61, 135], [0, 199, 228], [253, 214, 126]],
    clock: 25,
    rotate: true,
    start_from_edge: false,
    respawn: true
  };
  const confetti = new ConfettiGenerator(confettiSettings);
  confetti.render();
  
  // Remover o modal após 5 segundos se o usuário não fechar
  setTimeout(() => {
    if (document.body.contains(modalDiv)) {
      modalDiv.remove();
    }
  }, 5000);
};

// Método para mostrar toast
const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
  toastMessage.value = message
  toastType.value = type
  toastShow.value = true
  setTimeout(() => {
    toastShow.value = false
  }, 3000)
}

// Lifecycle hooks
onMounted(async () => {
  // Garantir que a semana atual esteja definida corretamente
  reportStore.goToCurrentWeek();
  currentWeek.value = reportStore.currentWeek;
  
  // Carregar o relatório
  await loadOrCreateReport();
})

// Watchers
watch(teveCelula, async (newValue) => {
  if (relatorioId.value && !relatorioFinalizado.value) {
    try {
      console.log(`Atualizando relatório ${relatorioId.value} com teveCelula = ${newValue}`);
      await relatorioService.atualizarRelatorio(relatorioId.value, {
        observacoes: observacoes.value,
        teveCelula: newValue
      });
      // Não mostrar toast automático para não confundir o usuário
      // showToast('Relatório atualizado', 'success');
    } catch (error) {
      console.error('Erro ao atualizar relatório:', error);
      showToast('Erro ao atualizar relatório', 'error');
    }
  }
});
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Seletor de semana -->
      <div class="mb-6">
        <WeekSelector @weekChange="handleWeekChange" />
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="flex justify-center my-8">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p>{{ error }}</p>
      </div>

      <!-- Relatório já enviado -->
      <div v-else-if="relatorioFinalizado" class="space-y-6">
        <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-medium text-gray-900">
              Este relatório já foi enviado e não pode ser editado.
            </h3>
          </div>
        </div>

        <ReportSummaryCard 
          :relatorio="{
            dataInicio: currentWeek.dataInicio,
            dataFim: currentWeek.dataFim,
            presencasCelula: members.filter(m => m.presencaCelula === STATUS_PRESENCA.PRESENTE).length,
            presencasCulto: members.filter(m => m.presencaCulto === STATUS_PRESENCA.PRESENTE).length,
            totalMembros: members.length,
            totalVisitantes: 0,
            teveCelula: teveCelula,
            teveCulto: members.some(m => m.presencaCulto === STATUS_PRESENCA.PRESENTE),
            observacoes: observacoes,
            dataEnvio: relatorioDetalhado?.dataEnvio
          }"
        />

        <div class="mt-6">
          <h4 class="text-sm font-medium text-gray-900 mb-4">Lista de Presenças</h4>
          <PresenceTable
            :members="members"
            :disabled="true"
            @presence-change="handlePresenceChange"
          />
        </div>
      </div>

      <!-- Form de preenchimento -->
      <div v-else class="space-y-6">
        <!-- Alerta de relatório finalizado -->
        <div v-if="relatorioFinalizado" class="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl mb-6">
          <p class="flex items-center">
            <span class="mr-2">ℹ️</span>
            Este relatório já foi enviado e não pode ser editado.
          </p>
        </div>

        <!-- Layout para desktop: duas colunas -->
        <div class="md:grid md:grid-cols-3 md:gap-6">
          <!-- Coluna 1: Pergunta sobre ocorrência da célula -->
          <div class="bg-white rounded-2xl shadow-sm p-6 mb-6 md:mb-0">
            <h3 class="text-lg font-medium text-center mb-6">Teve célula?</h3>
            <div class="grid grid-cols-2 gap-4">
              <button 
                @click="teveCelula = true"
                :disabled="relatorioFinalizado"
                :class="[
                  'py-6 rounded-xl font-medium text-lg transition-all duration-200',
                  teveCelula ? 'bg-primary-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700',
                  relatorioFinalizado ? 'opacity-70 cursor-not-allowed' : 'transform hover:scale-105'
                ]"
              >
                Sim
              </button>
              <button 
                @click="teveCelula = false"
                :disabled="relatorioFinalizado"
                :class="[
                  'py-6 rounded-xl font-medium text-lg transition-all duration-200',
                  !teveCelula ? 'bg-primary-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700',
                  relatorioFinalizado ? 'opacity-70 cursor-not-allowed' : 'transform hover:scale-105'
                ]"
              >
                Não
              </button>
            </div>
          </div>
          
          <!-- Coluna 2-3: Lista de membros -->
          <div class="bg-white rounded-2xl shadow-sm overflow-hidden md:col-span-2 mb-6">
            <div class="p-6">
              <h3 class="text-lg font-medium mb-4">Presenças</h3>
              <PresenceTable 
                v-if="members.length > 0"
                :members="members"
                :relatorio-id="relatorioId"
                :celula-id="memberStore.celulaId"
                :teve-celula="teveCelula"
                :relatorio-finalizado="relatorioFinalizado"
                @presence-change="handlePresenceChange"
              />
            </div>
          </div>
        </div>

        <!-- Campo de observações (expansível) -->
        <div class="mt-6 bg-white rounded-2xl shadow-sm overflow-hidden">
          <button 
            @click="mostrarObservacoes = !mostrarObservacoes" 
            class="w-full p-3 flex items-center justify-between text-left text-sm text-gray-500 hover:text-gray-700 transition-colors"
            :class="{ 'border-b border-gray-100': mostrarObservacoes }"
          >
            <span class="font-medium">Observações</span>
            <span class="text-xs">{{ mostrarObservacoes ? '▲' : '▼' }}</span>
          </button>
          
          <div v-if="mostrarObservacoes" class="p-4">
            <textarea
              v-model="observacoes"
              rows="3"
              :disabled="relatorioFinalizado"
              class="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              :class="{ 'bg-gray-50 opacity-80 cursor-not-allowed': relatorioFinalizado }"
              placeholder="Adicione observações sobre a célula ou culto desta semana..."
            ></textarea>
          </div>
        </div>
        
        <!-- Botão de enviar -->
        <div class="mt-6" v-if="!relatorioFinalizado">
          <button 
            @click="enviarRelatorio"
            :disabled="!podeEnviar"
            class="w-full py-4 bg-primary-600 text-white rounded-xl font-medium text-lg shadow-sm hover:bg-primary-700 transition-colors duration-200"
            :class="{ 'opacity-50 cursor-not-allowed': !podeEnviar }"
          >
            {{ isCurrentReportWeek ? 'Enviar Relatório' : 'Não é possível enviar relatório de semanas anteriores' }}
          </button>
          
          <!-- Mensagem de aviso quando não é a semana atual -->
          <div v-if="!isCurrentReportWeek" class="mt-3 text-center text-sm text-red-500">
            Apenas é possível enviar relatório da semana atual
          </div>
        </div>
        
        <!-- Botão de voltar quando finalizado -->
        <div class="mt-6" v-else>
          <button 
            @click="router.push('/reports')"
            class="w-full py-4 bg-gray-100 text-gray-700 rounded-xl font-medium text-lg shadow-sm hover:bg-gray-200 transition-colors duration-200"
          >
            Voltar para Relatórios
          </button>
        </div>
      </div>

      <!-- Toast para feedback -->
      <Toast
        v-if="toastShow"
        :message="toastMessage"
        :type="toastType"
        @close="toastShow = false"
      />
    </main>
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