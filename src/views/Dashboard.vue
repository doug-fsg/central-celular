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
const activeTab = ref('consolidators')

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

function setActiveTab(tab) {
  activeTab.value = tab
}
</script>

<template>
  <div class="min-h-screen bg-neutral-50">
    <main class="container-layout">
      <!-- Cabeçalho mais discreto -->
      <div class="flex items-center justify-end mb-4">
        <LeadershipBadge />
      </div>

      <!-- Lembretes e alertas consolidados -->
      <ReportReminder />
      
      <!-- Visão geral do mês com botão de ação -->
      <div class="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h2 class="text-lg font-semibold text-neutral-800">Visão geral</h2>
          <p class="mt-1 text-sm text-neutral-500">
            {{ attendanceStore.formattedCurrentMonth }}
          </p>
        </div>
        
        <button 
          @click="goToAttendance"
          class="mt-3 md:mt-0 btn btn-primary btn-sm flex items-center"
        >
          <AppIcon name="calendar" class="mr-1.5" size="sm" />
          Registrar Frequência
        </button>
      </div>
      
      <!-- Estatísticas mais compactas -->
      <StatsOverview class="mb-6" />
      
      <!-- Sistema de tabs para consolidadores e co-líderes -->
      <div class="card p-4">
        <div class="flex border-b border-neutral-200 mb-4">
          <button 
            @click="setActiveTab('consolidators')" 
            class="pb-2 px-4 text-sm font-medium transition-colors"
            :class="activeTab === 'consolidators' ? 'border-b-2 border-primary-500 text-primary-700' : 'text-neutral-500 hover:text-neutral-700'"
          >
            <div class="flex items-center">
              <AppIcon name="star" class="mr-1.5" size="sm" :color="activeTab === 'consolidators' ? '#0074ff' : undefined" />
              Consolidadores
            </div>
          </button>
          <button 
            @click="setActiveTab('coleaders')" 
            class="pb-2 px-4 text-sm font-medium transition-colors"
            :class="activeTab === 'coleaders' ? 'border-b-2 border-accent-500 text-accent-700' : 'text-neutral-500 hover:text-neutral-700'"
          >
            <div class="flex items-center">
              <AppIcon name="heart" class="mr-1.5" size="sm" :color="activeTab === 'coleaders' ? '#ff4081' : undefined" />
              Co-Líderes
            </div>
          </button>
        </div>
        
        <!-- Conteúdo da tab de consolidadores -->
        <div v-if="activeTab === 'consolidators'">
          <div v-if="consolidators.length > 0">
            <ul class="divide-y divide-neutral-100">
              <li v-for="member in consolidators" :key="member.id" class="py-2 flex items-center justify-between">
                <div class="flex items-center">
                  <div class="w-7 h-7 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-medium text-xs mr-2">
                    {{ member.name.charAt(0) }}
                  </div>
                  <p class="text-sm text-neutral-800">{{ member.name }}</p>
                </div>
                <span class="text-xs py-1 px-2 bg-primary-50 text-primary-700 rounded-full">
                  Consolidador
                </span>
              </li>
            </ul>
          </div>
          
          <div v-else class="text-center py-4 rounded-lg bg-neutral-50">
            <AppIcon name="users" class="mx-auto text-neutral-300" size="md" />
            <p class="mt-2 text-sm text-neutral-500">Nenhum consolidador cadastrado</p>
            <button 
              @click="router.push({ name: 'minha-celula' })"
              class="mt-3 btn btn-sm btn-outline inline-flex items-center text-xs"
            >
              <AppIcon name="plus" class="mr-1" size="xs" />
              Adicionar
            </button>
          </div>
        </div>
        
        <!-- Conteúdo da tab de co-líderes -->
        <div v-if="activeTab === 'coleaders'">
          <div v-if="coLeaders.length > 0">
            <ul class="divide-y divide-neutral-100">
              <li v-for="member in coLeaders" :key="member.id" class="py-2 flex items-center justify-between">
                <div class="flex items-center">
                  <div class="w-7 h-7 rounded-full bg-accent-100 text-accent-600 flex items-center justify-center font-medium text-xs mr-2">
                    {{ member.name.charAt(0) }}
                  </div>
                  <p class="text-sm text-neutral-800">{{ member.name }}</p>
                </div>
                <span class="text-xs py-1 px-2 bg-accent-50 text-accent-700 rounded-full">
                  Co-Líder
                </span>
              </li>
            </ul>
          </div>
          
          <div v-else class="text-center py-4 rounded-lg bg-neutral-50">
            <AppIcon name="users" class="mx-auto text-neutral-300" size="md" />
            <p class="mt-2 text-sm text-neutral-500">Nenhum co-líder cadastrado</p>
            <button 
              @click="router.push({ name: 'minha-celula' })"
              class="mt-3 btn btn-sm btn-outline inline-flex items-center text-xs"
            >
              <AppIcon name="plus" class="mr-1" size="xs" />
              Adicionar
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>