<script setup lang="ts">
import { useAttendanceStore } from '../stores/attendanceStore'
import { format, subMonths, addMonths } from 'date-fns'

const attendanceStore = useAttendanceStore()

// Criar funções wrapper que adicionam logs
function nextMonth() {
  const currentDate = attendanceStore.currentDate;
  
  // Criar uma nova data para o próximo mês, garantindo que está dentro dos limites válidos (0-11)
  const newDate = addMonths(currentDate, 1);
  const newMonth = newDate.getMonth();
  
  // Verificar se o novo mês está dentro do intervalo válido (0-11)
  if (newMonth < 0 || newMonth > 11) {
    return; // Não fazer nada se o mês for inválido
  }
  
  attendanceStore.nextMonth();
}

function previousMonth() {
  const currentDate = attendanceStore.currentDate;
  
  // Criar uma nova data para o mês anterior, garantindo que está dentro dos limites válidos (0-11)
  const newDate = subMonths(currentDate, 1);
  const newMonth = newDate.getMonth();
  
  // Verificar se o novo mês está dentro do intervalo válido (0-11)
  if (newMonth < 0 || newMonth > 11) {
    return; // Não fazer nada se o mês for inválido
  }
  
  attendanceStore.previousMonth();
}
</script>

<template>
  <div class="flex items-center justify-between py-4 bg-white px-6 rounded-lg shadow-sm">
    <button 
      @click="previousMonth"
      class="p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200 ease-in-out"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    
    <h2 class="text-xl font-bold text-gray-900">
      {{ attendanceStore.formattedCurrentMonth }}
    </h2>
    
    <button 
      @click="nextMonth"
      class="p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200 ease-in-out"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
</template>