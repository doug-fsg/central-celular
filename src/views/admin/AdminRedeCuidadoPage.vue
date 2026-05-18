<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminService, type Celula } from '../../services/adminService'
import AppIcon from '../../components/AppIcon.vue'
import RedeCuidadoPanel from '../../components/RedeCuidadoPanel.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const cellOptions = ref<Celula[]>([])
const selectedCelulaId = ref<number | null>(null)

async function loadAllActiveCells() {
  loading.value = true
  cellOptions.value = []
  try {
    const all: Celula[] = []
    let page = 1
    const limit = 80
    while (true) {
      const res = await adminService.listarCelulas(page, limit)
      all.push(...res.celulas.filter((c: Celula) => c.ativo !== false))
      if (page >= res.pagination.pages) break
      page += 1
    }
    cellOptions.value = all.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    const qId = route.query.celulaId
    if (qId != null && qId !== '') {
      const parsed = Number(qId)
      if (!Number.isNaN(parsed) && cellOptions.value.some((c) => c.id === parsed)) {
        selectedCelulaId.value = parsed
      }
    }
    if (selectedCelulaId.value == null && cellOptions.value.length === 1) {
      selectedCelulaId.value = cellOptions.value[0].id
    }
  } catch (e) {
    console.error('[AdminRedeCuidado] erro ao listar células:', e)
    cellOptions.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadAllActiveCells()
})

watch(selectedCelulaId, (id) => {
  if (id != null) {
    void router.replace({ query: { ...route.query, celulaId: String(id) } })
  }
})
</script>

<template>
  <div class="min-h-screen bg-neutral-50">
    <main class="container-layout py-6 pb-24 md:pb-8 max-w-4xl mx-auto">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-neutral-800">Rede de cuidado</h1>
          <p class="text-sm text-neutral-500 mt-1">
            Visualize e edite a rede de qualquer célula da conta (pastor / administrador).
          </p>
        </div>
      </div>

      <div class="card p-4 mb-6">
        <label
          for="admin-rede-celula"
          class="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2"
        >
          Célula
        </label>
        <div v-if="loading" class="text-sm text-neutral-500 py-2">Carregando células...</div>
        <select
          v-else
          id="admin-rede-celula"
          v-model.number="selectedCelulaId"
          class="w-full sm:max-w-xl px-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option :value="null">Selecione uma célula...</option>
          <option v-for="c in cellOptions" :key="c.id" :value="c.id">
            {{ c.nome }} — {{ c.lider?.nome || 'Líder' }}
          </option>
        </select>
      </div>

      <div v-if="!loading && selectedCelulaId == null" class="card p-8 text-center text-neutral-500 text-sm">
        <AppIcon name="users" size="lg" class="mx-auto mb-3 text-neutral-300" />
        Selecione uma célula para ver consolidadores, líder e membros sem cuidador.
      </div>

      <RedeCuidadoPanel v-else-if="selectedCelulaId != null" :celula-id="selectedCelulaId" />
    </main>
  </div>
</template>
