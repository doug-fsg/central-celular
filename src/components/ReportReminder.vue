<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAttendanceStore } from '../stores/attendanceStore'
import { useLeaderStore } from '../stores/leaderStore'
import { useReportStore } from '../stores/reportStore'
import { format, addMonths, setDate, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import AppIcon from '../components/AppIcon.vue'
import { useRouter } from 'vue-router'

const attendanceStore = useAttendanceStore()
const leaderStore = useLeaderStore()
const reportStore = useReportStore()
const router = useRouter()

const showReminder = ref(true)

const deadlineDay = 10
const today = new Date()
const currentMonth = today.getMonth()
const currentYear = today.getFullYear()

// Definir o prazo (dia 10 do mês atual)
const deadline = setDate(new Date(currentYear, currentMonth), deadlineDay)

// Se já passou do dia 10, mover o prazo para o dia 10 do próximo mês
const adjustedDeadline = computed(() => {
  if (today.getDate() > deadlineDay) {
    return setDate(addMonths(today, 1), deadlineDay)
  }
  return deadline
})

const daysUntilDeadline = computed(() => {
  return differenceInDays(adjustedDeadline.value, today)
})

// Usar o novo sistema de mensagens baseado no dia do mês
const deadlineText = computed(() => {
  // Se já enviou o relatório deste mês, exibe mensagem simplificada
  if (reportStore.hasSubmittedReportForMonth(currentMonth, currentYear)) {
    return `Relatório de ${format(today, 'MMMM', { locale: ptBR })} enviado`
  }
  
  // Senão usamos a lógica de mensagens da reportStore
  return reportStore.reportMessage || 'Lembre-se de enviar seu relatório mensal.'
})

const reminderType = computed(() => {
  // Se já enviou o relatório, mostra como informação
  if (reportStore.hasReportForMonth(currentMonth, currentYear)) {
    return 'info'
  }
  
  const currentDay = today.getDate()
  
  if (currentDay > deadlineDay) {
    // Após o dia 18, mostrar como urgente
    if (currentDay >= 18) {
      return 'urgent'
    }
    // Entre 11 e 17, mostrar como aviso
    return 'warning'
  } else if (daysUntilDeadline.value <= 1) {
    return 'urgent'
  } else if (daysUntilDeadline.value <= 3) {
    return 'warning'
  }
  return 'info'
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

function dismissReminder() {
  showReminder.value = false
}

function goToReports() {
  router.push({ name: 'reports' })
}

// Verificar se o relatório já foi enviado
const isReportSent = computed(() => reportStore.hasSubmittedReportForMonth(currentMonth, currentYear))
</script>

<template>
  <div 
    v-if="showReminder"
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
    
    <div class="flex items-center">
      <button 
        v-if="!isReportSent && today.getDate() >= 1"
        @click="goToReports"
        class="text-xs mr-2 py-1 px-2 rounded"
        :class="reminderType === 'urgent' ? 'bg-red-500 text-white' : 'bg-transparent border border-current text-gray-500'"
      >
        Enviar
      </button>
      
      <button 
        @click="dismissReminder"
        class="p-1 hover:opacity-75 transition-opacity"
      >
        <AppIcon name="close" size="xs" :class="reminderType === 'urgent' ? 'text-red-500' : reminderType === 'warning' ? 'text-yellow-500' : 'text-blue-500'" />
      </button>
    </div>
  </div>
</template>