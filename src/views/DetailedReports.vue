<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppHeader from '../components/AppHeader.vue'
import { Line } from 'vue-chartjs'
import { useAttendanceStore } from '../stores/attendanceStore'
import { useMemberStore } from '../stores/memberStore'
import type { ChartData, ChartOptions } from 'chart.js'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

const attendanceStore = useAttendanceStore()
const memberStore = useMemberStore()

const chartData = computed<ChartData<'line'>>(() => ({
  labels: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho'],
  datasets: [
    {
      label: 'Culto',
      borderColor: '#2563eb',
      data: [65, 70, 75, 68, 72, 80],
      tension: 0.4
    },
    {
      label: 'Célula',
      borderColor: '#7c3aed',
      data: [55, 60, 65, 58, 62, 70],
      tension: 0.4
    }
  ]
}))

const chartOptions: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top'
    },
    title: {
      display: true,
      text: 'Tendência de Frequência'
    }
  }
}

// Member engagement metrics
const memberEngagement = computed(() => {
  const totalMembers = memberStore.getAllMembers.length
  const activeMembers = attendanceStore.currentMonthStats.total
  const engagementRate = totalMembers > 0 
    ? Math.round((activeMembers / totalMembers) * 100) 
    : 0

  return {
    total: totalMembers,
    active: activeMembers,
    rate: engagementRate
  }
})

// Growth metrics
const growthMetrics = ref({
  newMembers: 3,
  retentionRate: 95,
  consolidationRate: 85
})

// Detailed member statistics
const memberStats = computed(() => {
  const members = memberStore.getAllMembers
  const consolidators = memberStore.getConsolidators
  const coLeaders = memberStore.getCoLeaders

  return {
    total: members.length,
    consolidators: consolidators.length,
    coLeaders: coLeaders.length,
    regular: members.length - consolidators.length - coLeaders.length
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <AppHeader />
    
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Relatório Detalhado</h1>
        <p class="mt-1 text-gray-500">Análise completa do desempenho da célula</p>
      </div>

      <!-- Engagement Overview -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div class="card p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-2">Taxa de Engajamento</h3>
          <p class="text-3xl font-bold text-primary-600">{{ memberEngagement.rate }}%</p>
          <p class="text-sm text-gray-500 mt-1">
            {{ memberEngagement.active }} de {{ memberEngagement.total }} membros ativos
          </p>
        </div>

        <div class="card p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-2">Novos Membros</h3>
          <p class="text-3xl font-bold text-secondary-600">+{{ growthMetrics.newMembers }}</p>
          <p class="text-sm text-gray-500 mt-1">No último mês</p>
        </div>

        <div class="card p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-2">Taxa de Retenção</h3>
          <p class="text-3xl font-bold text-accent-600">{{ growthMetrics.retentionRate }}%</p>
          <p class="text-sm text-gray-500 mt-1">Membros regulares</p>
        </div>
      </div>

      <!-- Attendance Trend Chart -->
      <div class="card p-6 mb-8">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Tendência de Frequência</h3>
        <div class="h-80">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </div>

      <!-- Member Distribution -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div class="card p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Distribuição de Membros</h3>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Consolidadores</span>
              <span class="font-medium text-gray-900">{{ memberStats.consolidators }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Co-Líderes</span>
              <span class="font-medium text-gray-900">{{ memberStats.coLeaders }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Membros Regulares</span>
              <span class="font-medium text-gray-900">{{ memberStats.regular }}</span>
            </div>
            <div class="pt-4 border-t border-gray-200">
              <div class="flex items-center justify-between">
                <span class="font-medium text-gray-900">Total</span>
                <span class="font-bold text-gray-900">{{ memberStats.total }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Métricas de Consolidação</h3>
          <div class="space-y-4">
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-gray-600">Taxa de Consolidação</span>
                <span class="font-medium text-gray-900">{{ growthMetrics.consolidationRate }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div 
                  class="bg-primary-600 h-2 rounded-full"
                  :style="{ width: `${growthMetrics.consolidationRate}%` }"
                ></div>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-gray-600">Taxa de Retenção</span>
                <span class="font-medium text-gray-900">{{ growthMetrics.retentionRate }}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div 
                  class="bg-secondary-600 h-2 rounded-full"
                  :style="{ width: `${growthMetrics.retentionRate}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>