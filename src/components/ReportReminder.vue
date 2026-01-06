<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useMemberStore } from '../stores/memberStore'
import { useReportStore } from '../stores/reportStore'
import { useUserStore } from '../stores/userStore'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import AppIcon from '../components/AppIcon.vue'
import { useRouter } from 'vue-router'
import relatorioService, { STATUS_RELATORIO } from '../services/relatorioService'

const memberStore = useMemberStore()
const reportStore = useReportStore()
const userStore = useUserStore()
const router = useRouter()

const showReminder = ref(true)
const loading = ref(true)
const relatorios = ref<any[]>([])

const today = new Date()

// Carregar relatórios da semana atual
async function carregarRelatorios() {
  // Aguardar celulaId estar disponível
  if (!memberStore.celulaId) {
    // Tentar carregar membros se ainda não foram carregados
    if (!memberStore.loading) {
      await memberStore.carregarMembros()
    }
    
    // Se ainda não tiver celulaId, não fazer a chamada
    if (!memberStore.celulaId) {
      return
    }
  }

  try {
    const result = await relatorioService.listarRelatorios({
      celulaId: memberStore.celulaId,
      dataInicio: reportStore.currentWeek.dataInicio,
      dataFim: reportStore.currentWeek.dataFim
    })
    
    relatorios.value = result
  } catch (error) {
    console.error('Erro ao carregar relatórios:', error)
  }
}

// Carregar os relatórios quando o componente for montado
onMounted(async () => {
  try {
    await carregarRelatorios()
  } finally {
    loading.value = false
  }
})

// Observar mudanças no celulaId para recarregar relatórios
watch(() => memberStore.celulaId, async (newCelulaId) => {
  if (newCelulaId && !loading.value) {
    await carregarRelatorios()
  }
})

// Calcular dias até o final da semana
const diasAteFimPeriodo = computed(() => {
  const dataFim = reportStore.currentWeek.dataFim
  return differenceInDays(dataFim, today)
})

// Verificar se o relatório para a semana atual já foi enviado
const relatorioEnviado = computed(() => {
  return relatorios.value.some(r => r.status === STATUS_RELATORIO.ENVIADO)
})

// Determinar o tipo de lembrete baseado no tempo restante
const reminderType = computed(() => {
  if (loading.value) return 'info'
  
  if (relatorioEnviado.value) {
    return 'success'
  }
  
  if (!reportStore.isDentroPeriodoEnvio) {
    return 'info'
  }
  
  // Baseado nos dias restantes
  if (reportStore.diasParaFimPeriodo <= 1) {
    return 'urgent'
  } else if (reportStore.diasParaFimPeriodo <= 2) {
    return 'warning'
  }
  
  return 'info'
})

// Texto do lembrete
const deadlineText = computed(() => {
  if (loading.value) return 'Carregando informações...'
  
  if (relatorioEnviado.value) {
    return `Tudo certo com o seu relatório!`
  }
  
  if (!reportStore.isDentroPeriodoEnvio) {
    return `O período para envio de relatórios está fechado. Aguarde o próximo período que inicia na quinta-feira.`
  }
  
  if (reportStore.diasParaFimPeriodo === 0) {
    return `Hoje é o último dia para enviar o relatório da semana anterior`
  } else if (reportStore.diasParaFimPeriodo === 1) {
    return `Falta 1 dia para o fim do período de envio`
  } else {
    return `Faltam ${reportStore.diasParaFimPeriodo} dias para o fim do período de envio`
  }
})

const reminderClasses = computed(() => {
  switch (reminderType.value) {
    case 'urgent':
      return 'bg-red-50 border-red-200'
    case 'warning':
      return 'bg-yellow-50 border-yellow-200'
    default:
      return 'bg-blue-50 border-blue-200'
  }
})

function formatarSemana() {
  const dataInicio = reportStore.currentWeek.dataInicio
  return `Semana ${format(dataInicio, 'w', { locale: ptBR })}`
}

function dismissReminder() {
  showReminder.value = false
}

function goToattendance() {
  router.push({ name: 'attendance' })
}
</script>

<template>
  <div 
    v-if="showReminder && userStore.isUserActive"
    class="rounded-lg border p-3 mb-5 flex items-center justify-between"
    :class="reminderClasses"
  >
    <div class="flex items-center">
      <AppIcon 
        :name="reminderType === 'info' ? 'info' : 'warning'" 
        :class="reminderType === 'urgent' ? 'text-red-500' : reminderType === 'warning' ? 'text-yellow-500' : 'text-blue-500'" 
        class="mr-2" 
        size="sm" 
      />
      <p class="text-xs font-medium">{{ deadlineText }}</p>
    </div>
    
    <button 
      @click="dismissReminder"
      class="p-1 hover:opacity-75 transition-opacity"
    >
      <AppIcon name="close" size="xs" :class="reminderType === 'urgent' ? 'text-red-500' : reminderType === 'warning' ? 'text-yellow-500' : 'text-blue-500'" />
    </button>
  </div>
</template>