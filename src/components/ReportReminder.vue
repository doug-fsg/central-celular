<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAttendanceStore } from '../stores/attendanceStore'
import { useLeaderStore } from '../stores/leaderStore'
import { useReportStore } from '../stores/reportStore'
import { format, addMonths, setDate, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import AppIcon from '../components/AppIcon.vue'

const attendanceStore = useAttendanceStore()
const leaderStore = useLeaderStore()
const reportStore = useReportStore()

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
    return `Relatório de ${format(today, 'MMMM', { locale: ptBR })} já enviado! O próximo poderá ser enviado a partir de ${format(addMonths(setDate(today, 1), 1), 'd/MM')}`
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
      return 'bg-red-50 text-red-800 border-red-200'
    case 'warning':
      return 'bg-yellow-50 text-yellow-800 border-yellow-200'
    default:
      return 'bg-blue-50 text-blue-800 border-blue-200'
  }
})

function dismissReminder() {
  showReminder.value = false
}

// Verificar se o relatório já foi enviado
const isReportSent = computed(() => {
  if (!reportStore) return false;
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  // Verificar se tem um relatório finalizado para este mês
  if (reportStore.hasSubmittedReportForMonth(currentMonth, currentYear)) {
    return true;
  }
  
  return false;
});
</script>

<template>
  <div 
    v-if="showReminder"
    class="rounded-lg border p-3 mb-6 flex items-center justify-between"
    :class="reminderClasses"
  >
    <div class="flex items-center">
      <AppIcon 
        :name="reminderType === 'info' ? 'info' : reminderType === 'warning' ? 'warning' : 'warning'" 
        :class="reminderType === 'urgent' ? 'text-red-600' : reminderType === 'warning' ? 'text-yellow-600' : 'text-blue-600'" 
        class="mr-2" 
        size="md" 
      />
      <p class="font-medium text-sm">{{ deadlineText }}</p>
    </div>
    
    <div class="flex items-center">
      <router-link 
        v-if="!reportStore.hasSubmittedReportForMonth(currentMonth, currentYear) && today.getDate() >= 1"
        :to="{ name: 'reports' }" 
        class="btn btn-xs mr-2"
        :class="reminderType === 'urgent' ? 'btn-primary' : 'btn-outline'"
      >
        Enviar Relatório
      </router-link>
      
      <button 
        @click="dismissReminder"
        class="p-1 hover:opacity-75 transition-opacity"
        :class="reminderType === 'urgent' ? 'text-red-600' : reminderType === 'warning' ? 'text-yellow-600' : 'text-blue-600'"
      >
        <AppIcon name="close" size="sm" />
      </button>
    </div>
  </div>
</template>