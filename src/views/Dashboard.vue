<script setup lang="ts">
import { computed, ref } from 'vue'
import StatsOverview from '../components/StatsOverview.vue'
import ReportReminder from '../components/ReportReminder.vue'
import LeadershipBadge from '../components/LeadershipBadge.vue'
import { useMemberStore } from '../stores/memberStore'
import { useAttendanceStore } from '../stores/attendanceStore'
import { useLeaderStore } from '../stores/leaderStore'
import { useReportStore } from '../stores/reportStore'
import { useRouter } from 'vue-router'
import AppIcon from '../components/AppIcon.vue'

const memberStore = useMemberStore()
const attendanceStore = useAttendanceStore()
const leaderStore = useLeaderStore()
const reportStore = useReportStore()
const router = useRouter()

const consolidators = computed(() => memberStore.getConsolidators)
const coLeaders = computed(() => memberStore.getCoLeaders)
const showLateReportsAlert = ref(true)

// Verificar se o relatório do mês atual está pendente e fora do prazo
const hasLateReports = computed(() => {
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const day = today.getDate()
  
  // Se já enviou relatório para o mês atual, não está pendente
  if (reportStore.hasSubmittedReportForMonth(currentMonth, currentYear)) {
    console.log(`[DEBUG] Dashboard - Relatório enviado para ${currentMonth}/${currentYear}`)
    return false
  }
  
  // Se estamos nos primeiros 10 dias do mês, ainda está no prazo
  if (day <= 10) {
    return false
  }
  
  // Caso contrário, está atrasado
  console.log(`[DEBUG] Dashboard - Relatório atrasado para ${currentMonth}/${currentYear}`)
  return true
})

function closeLateReportsAlert() {
  showLateReportsAlert.value = false
}

function goToAttendance() {
  router.push({ name: 'attendance' });
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50">
    <main class="container-layout">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-neutral-800 tracking-tight">
          Central Celular
        </h1>
        <LeadershipBadge />
      </div>

      <!-- Alerta de relatórios atrasados -->
      <div v-if="hasLateReports && showLateReportsAlert" 
           class="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg flex items-center justify-between shadow-soft">
        <div class="flex items-center">
          <AppIcon name="warning" class="text-red-500 mr-3" size="md" />
          <p class="text-sm text-red-700 font-medium">
            Relatórios pendentes. Por favor, atualize seus registros.
          </p>
        </div>
        <button @click="closeLateReportsAlert" class="btn-icon text-red-400 hover:text-red-600">
          <AppIcon name="close" />
        </button>
      </div>
      
      <div class="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h2 class="text-xl font-semibold text-neutral-800">Painel de Controle</h2>
          <p class="mt-1 text-neutral-500">
            Visão geral do mês de {{ attendanceStore.formattedCurrentMonth }}
          </p>
        </div>
        
        <div class="mt-4 md:mt-0">
          <button 
            @click="goToAttendance"
            class="btn btn-primary flex items-center"
          >
            <AppIcon name="calendar" class="mr-1.5" />
            Registrar Frequência
          </button>
        </div>
      </div>
      
      <ReportReminder />
      
      <StatsOverview class="mb-8" />
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Consolidators -->
        <div class="card">
          <div class="flex items-center mb-4">
            <AppIcon name="star" class="text-primary-500 mr-2" />
            <h2 class="text-xl font-semibold text-neutral-800">Consolidadores</h2>
          </div>
          
          <div v-if="consolidators.length > 0">
            <ul class="divide-y divide-neutral-100">
              <li v-for="member in consolidators" :key="member.id" class="py-3 flex items-center justify-between">
                <div class="flex items-center">
                  <div class="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold mr-3">
                    {{ member.name.charAt(0) }}
                  </div>
                  <p class="text-sm font-medium text-neutral-800">{{ member.name }}</p>
                </div>
                <span class="badge badge-primary">
                  Consolidador
                </span>
              </li>
            </ul>
          </div>
          
          <div v-else class="text-center py-6 rounded-lg bg-neutral-50">
            <AppIcon name="users" class="mx-auto text-neutral-300" size="xl" />
            <p class="mt-2 text-neutral-500">Nenhum consolidador cadastrado</p>
            <button 
              @click="router.push({ name: 'members' })"
              class="mt-3 btn btn-outline inline-flex items-center text-sm"
            >
              <AppIcon name="plus" class="mr-1" size="sm" />
              Adicionar
            </button>
          </div>
        </div>
        
        <!-- Co-Leaders -->
        <div class="card">
          <div class="flex items-center mb-4">
            <AppIcon name="heart" class="text-accent-500 mr-2" />
            <h2 class="text-xl font-semibold text-neutral-800">Co-Líderes</h2>
          </div>
          
          <div v-if="coLeaders.length > 0">
            <ul class="divide-y divide-neutral-100">
              <li v-for="member in coLeaders" :key="member.id" class="py-3 flex items-center justify-between">
                <div class="flex items-center">
                  <div class="w-8 h-8 rounded-full bg-accent-100 text-accent-600 flex items-center justify-center font-bold mr-3">
                    {{ member.name.charAt(0) }}
                  </div>
                  <p class="text-sm font-medium text-neutral-800">{{ member.name }}</p>
                </div>
                <span class="badge badge-accent">
                  Co-Líder
                </span>
              </li>
            </ul>
          </div>
          
          <div v-else class="text-center py-6 rounded-lg bg-neutral-50">
            <AppIcon name="users" class="mx-auto text-neutral-300" size="xl" />
            <p class="mt-2 text-neutral-500">Nenhum co-líder cadastrado</p>
            <button 
              @click="router.push({ name: 'members' })"
              class="mt-3 btn btn-outline inline-flex items-center text-sm"
            >
              <AppIcon name="plus" class="mr-1" size="sm" />
              Adicionar
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>