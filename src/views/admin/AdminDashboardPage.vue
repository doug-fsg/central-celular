<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import type { Usuario } from '../../services/adminService'
import { adminService } from '../../services/adminService'
import DashboardUnified from '../../components/admin/dashboard/DashboardUnified.vue'

const leaderFilterId = ref('')
const availableLeaders = ref<Usuario[]>([])

const filteredLeaders = computed(() =>
  availableLeaders.value.filter((u) => u.cargo === 'LIDER' && u.status === 'ativo'),
)

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
</script>

<template>
  <main class="min-h-full bg-neutral-50">
    <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <DashboardUnified
        v-model:leader-filter-id="leaderFilterId"
        :leaders="filteredLeaders"
      />
    </div>
  </main>
</template>
