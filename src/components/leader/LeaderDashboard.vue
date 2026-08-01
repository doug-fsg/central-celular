<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useLeaderDashboard } from '../../composables/useLeaderDashboard'
import { usePlatform } from '../../composables/usePlatform'
import { useHaptic } from '../../composables/useHaptic'
import { LEADER_DASHBOARD_COPY } from '../../constants/leaderDashboard'
import LeaderDashboardHeader from './LeaderDashboardHeader.vue'
import LeaderMiniStatGrid from './LeaderMiniStatGrid.vue'
import LeaderReportWeekCard from './LeaderReportWeekCard.vue'
import LeaderTeamSection from './LeaderTeamSection.vue'
import DashboardCoberturaGeral from '../admin/dashboard/DashboardCoberturaGeral.vue'
import DashboardFrequenciaChart from '../admin/dashboard/DashboardFrequenciaChart.vue'
import DashboardParticipacaoSemana from '../admin/dashboard/DashboardParticipacaoSemana.vue'
import DashboardCuidadoresAtivos from '../admin/dashboard/DashboardCuidadoresAtivos.vue'
import ReportReminder from '../ReportReminder.vue'
import MobileStickyActionBar from '../MobileStickyActionBar.vue'
import SkeletonCard from '../SkeletonCard.vue'

const router = useRouter()
const { mobileShell } = usePlatform()
const { tap } = useHaptic()

const {
  loading,
  cuidadoLoading,
  participacaoLoading,
  cuidadoError,
  participacaoError,
  resumo,
  totaisAlertas,
  listas,
  limiares,
  consolidadoresCount,
  participacaoData,
  relatoriosData,
  participacaoWeek,
  relatoriosWeek,
  refreshCuidado,
  refreshParticipacao,
} = useLeaderDashboard()

function goToAttendance() {
  tap()
  router.push({ name: 'attendance' })
}
</script>

<template>
  <div :class="{ 'pb-28 sm:pb-10': mobileShell }">
    <LeaderDashboardHeader />

    <ReportReminder />

    <div v-if="loading" class="space-y-4">
      <SkeletonCard :lines="2" />
      <SkeletonCard :lines="4" />
      <SkeletonCard :lines="3" :show-avatar="true" />
    </div>

    <template v-else>
      <div
        v-if="cuidadoError && !cuidadoLoading"
        class="mb-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center"
      >
        <p class="flex-1 text-sm text-rose-900">{{ cuidadoError }}</p>
        <button
          type="button"
          class="min-h-[48px] touch-manipulation rounded-lg bg-rose-600 px-4 text-sm font-medium text-white"
          @click="refreshCuidado"
        >
          Tentar novamente
        </button>
      </div>

      <!-- Row 1 -->
      <div class="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)_minmax(0,1.15fr)]">
        <DashboardCoberturaGeral
          :resumo="resumo"
          :limiares="limiares"
          :loading="cuidadoLoading"
        />
        <LeaderMiniStatGrid
          :resumo="resumo"
          :totais-alertas="totaisAlertas"
          :listas="listas"
          :consolidadores-count="consolidadoresCount"
          :loading="cuidadoLoading"
        />
        <DashboardFrequenciaChart />
      </div>

      <!-- Row 2 -->
      <div class="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardParticipacaoSemana
          :data="participacaoData"
          :week-label="participacaoWeek.weekLabel.value"
          :can-go-forward="participacaoWeek.canGoForward.value"
          :loading="participacaoLoading"
          :error="participacaoError"
          @prev-week="participacaoWeek.prevWeek"
          @next-week="participacaoWeek.nextWeek"
          @retry="refreshParticipacao"
        />
        <LeaderReportWeekCard
          :data="relatoriosData"
          :week-label="relatoriosWeek.weekLabel.value"
          :can-go-forward="relatoriosWeek.canGoForward.value"
          :loading="participacaoLoading"
          :error="participacaoError"
          @prev-week="relatoriosWeek.prevWeek"
          @next-week="relatoriosWeek.nextWeek"
          @retry="refreshParticipacao"
        />
      </div>

      <!-- Row 3 -->
      <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <LeaderTeamSection :loading="cuidadoLoading" />
        <DashboardCuidadoresAtivos
          :total="consolidadoresCount"
          :loading="cuidadoLoading"
          rede-route="rede-cuidado"
        />
      </div>
    </template>

    <!-- Mobile CTA -->
    <MobileStickyActionBar
      v-if="mobileShell && !loading"
      :label="LEADER_DASHBOARD_COPY.ctaRelatorio"
      @click="goToAttendance"
    />
  </div>
</template>
