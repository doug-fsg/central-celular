<script setup lang="ts">
import { computed, ref, watch, onMounted, defineAsyncComponent } from 'vue'
import type { Usuario } from '../../services/adminService'
import { adminService } from '../../services/adminService'
import { useDashboardCuidado } from '../../composables/useDashboardCuidado'
import { DASHBOARD_CUIDADO_COPY, DASHBOARD_INDICADORES_COPY } from '../../constants/dashboardCuidado'
import AdminDashboardTabs from '../../components/admin/AdminDashboardTabs.vue'
import AdminLeaderFilter from '../../components/admin/AdminLeaderFilter.vue'
import DashboardCuidado from '../../components/admin/DashboardCuidado.vue'

const DashboardIndicadores = defineAsyncComponent(
  () => import('../../components/admin/DashboardIndicadores.vue'),
)

const abaAtiva = ref<'cuidado' | 'indicadores'>('cuidado')
const indicadoresEverOpened = ref(false)
const leaderFilterId = ref('')
const availableLeaders = ref<Usuario[]>([])

watch(abaAtiva, (tab) => {
  if (tab === 'indicadores') indicadoresEverOpened.value = true
})

const filteredLeaders = computed(() =>
  availableLeaders.value.filter((u) => u.cargo === 'LIDER' && u.status === 'ativo'),
)

const { data, loading, error, refresh, semCuidadorCount } = useDashboardCuidado(leaderFilterId)

async function loadAvailableLeaders() {
  try {
    const response = await adminService.listarUsuarios(1, 100, ['LIDER', 'SUPERVISOR'])
    availableLeaders.value = response.usuarios.filter(
      (u) => u.status === 'ativo' && (u.cargo === 'LIDER' || u.cargo === 'SUPERVISOR'),
    )
  } catch (err) {
    console.error('Erro ao carregar líderes:', err)
  }
}

onMounted(() => {
  void loadAvailableLeaders()
})

const pageTitle = computed(() =>
  abaAtiva.value === 'cuidado' ? DASHBOARD_CUIDADO_COPY.pageTitle : DASHBOARD_INDICADORES_COPY.pageTitle,
)

const pageSubtitle = computed(() =>
  abaAtiva.value === 'cuidado'
    ? DASHBOARD_CUIDADO_COPY.pageSubtitle
    : DASHBOARD_INDICADORES_COPY.tabSubtitle,
)
</script>

<template>
  <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
    <header class="mb-2">
      <h1 class="text-xl sm:text-2xl font-bold text-neutral-800">{{ pageTitle }}</h1>
      <p class="mt-1 text-xs sm:text-sm text-neutral-500">{{ pageSubtitle }}</p>
    </header>

    <AdminDashboardTabs v-model="abaAtiva" :sem-cuidador-badge="semCuidadorCount" />

    <AdminLeaderFilter v-model="leaderFilterId" :leaders="filteredLeaders" />

    <div class="motion-reduce:transition-none">
      <DashboardCuidado v-show="abaAtiva === 'cuidado'" :data="data" :loading="loading" :error="error" @retry="refresh" />

      <DashboardIndicadores
        v-if="indicadoresEverOpened"
        v-show="abaAtiva === 'indicadores'"
        :active="abaAtiva === 'indicadores'"
        :leader-filter-id="leaderFilterId"
      />
    </div>
  </main>
</template>
