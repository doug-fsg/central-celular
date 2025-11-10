<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMemberStore } from '../stores/memberStore'
import relatorioService, { TIPO_EVENTO } from '../services/relatorioService'
import { subMonths } from 'date-fns'
import AppIcon from './AppIcon.vue'
import type { IconName } from './AppIcon.vue'

const memberStore = useMemberStore()
const router = useRouter()

const ultimoCulto = ref<{ total: number; presentes: number } | null>(null)
const ultimaCelula = ref<{ total: number; presentes: number } | null>(null)
const ambos = ref<{ total: number; presentes: number } | null>(null)
const loading = ref(false)

function goToAttendance() {
  router.push({ name: 'attendance' })
}

// Buscar os últimos relatórios de culto e célula
async function buscarUltimosRelatorios() {
  const celulaId = memberStore.celulaId
  if (!celulaId) return

  loading.value = true
  try {
    // Buscar relatórios dos últimos 3 meses para encontrar os mais recentes
    const dataFim = new Date()
    const dataInicio = subMonths(dataFim, 3)

    const relatorios = await relatorioService.listarRelatorios({
      celulaId,
      dataInicio,
      dataFim
    })

    // Filtrar apenas relatórios enviados e ordenar por data (mais recente primeiro)
    const relatoriosEnviados = relatorios
      .filter(r => r.status === 1)
      .sort((a, b) => {
        const dataA = new Date(a.dataInicio).getTime()
        const dataB = new Date(b.dataInicio).getTime()
        return dataB - dataA
      })

    // Encontrar último relatório de culto e célula
    const ultimoRelatorioCulto = relatoriosEnviados.find(r => r.evento === TIPO_EVENTO.CULTO)
    const ultimoRelatorioCelula = relatoriosEnviados.find(r => r.evento === TIPO_EVENTO.CELULA)

    const totalMembrosAtivos = memberStore.getActiveMembers.length

    // Buscar detalhes apenas uma vez
    const detalhesCulto = ultimoRelatorioCulto
      ? await relatorioService.obterRelatorio(ultimoRelatorioCulto.id)
      : null
    const detalhesCelula = ultimoRelatorioCelula
      ? await relatorioService.obterRelatorio(ultimoRelatorioCelula.id)
      : null

    // Processar último culto
    if (detalhesCulto) {
      const totalCulto = Math.max(
        detalhesCulto.membros?.length ?? totalMembrosAtivos,
        detalhesCulto.presencas?.length ?? 0
      )
      const presentesCulto = detalhesCulto.presencas?.filter(p => p.status === 1).length || 0

      ultimoCulto.value = {
        total: Math.max(totalCulto, presentesCulto),
        presentes: presentesCulto
      }
    } else {
      ultimoCulto.value = { total: totalMembrosAtivos, presentes: 0 }
    }

    // Processar última célula
    if (detalhesCelula) {
      const totalCelula = Math.max(
        detalhesCelula.membros?.length ?? totalMembrosAtivos,
        detalhesCelula.presencas?.length ?? 0
      )
      const presentesCelula = detalhesCelula.presencas?.filter(p => p.status === 1).length || 0

      ultimaCelula.value = {
        total: Math.max(totalCelula, presentesCelula),
        presentes: presentesCelula
      }
    } else {
      ultimaCelula.value = { total: totalMembrosAtivos, presentes: 0 }
    }

    // Calcular "Ambos" - pessoas que estiveram presentes em ambos os últimos eventos
    if (detalhesCulto && detalhesCelula) {
      const presentesCultoIds = new Set(
        detalhesCulto.presencas?.filter(p => p.status === 1).map(p => p.membroId) || []
      )
      const presentesCelulaIds = new Set(
        detalhesCelula.presencas?.filter(p => p.status === 1).map(p => p.membroId) || []
      )

      const presentesEmAmbos = Array.from(presentesCultoIds).filter(id =>
        presentesCelulaIds.has(id)
      ).length

      const totalAmbos = Math.max(
        detalhesCulto.membros?.length ?? 0,
        detalhesCelula.membros?.length ?? 0,
        totalMembrosAtivos,
        presentesEmAmbos
      )

      ambos.value = {
        total: totalAmbos,
        presentes: presentesEmAmbos
      }
    } else {
      ambos.value = {
        total: Math.max(ultimoCulto.value?.total ?? 0, ultimaCelula.value?.total ?? 0, totalMembrosAtivos),
        presentes: 0
      }
    }
  } catch (error) {
    console.error('Erro ao buscar últimos relatórios:', error)
    const totalMembros = memberStore.getActiveMembers.length
    ultimoCulto.value = { total: totalMembros, presentes: 0 }
    ultimaCelula.value = { total: totalMembros, presentes: 0 }
    ambos.value = { total: totalMembros, presentes: 0 }
  } finally {
    loading.value = false
  }
}

const stats = computed(() => {
  const culto = ultimoCulto.value || { total: 0, presentes: 0 }
  const celula = ultimaCelula.value || { total: 0, presentes: 0 }
  const ambosValue = ambos.value || { total: 0, presentes: 0 }
  
  return [
    {
      title: 'Último Culto',
      value: culto.presentes,
      percentage: culto.total > 0 ? Math.round((culto.presentes / culto.total) * 100) : 0,
      color: 'primary',
      icon: 'fire' as IconName
    },
    {
      title: 'Última Célula',
      value: celula.presentes,
      percentage: celula.total > 0 ? Math.round((celula.presentes / celula.total) * 100) : 0,
      color: 'secondary',
      icon: 'heart' as IconName
    },
    {
      title: 'Ambos',
      value: ambosValue.presentes,
      percentage: ambosValue.total > 0 ? Math.round((ambosValue.presentes / ambosValue.total) * 100) : 0,
      color: 'accent',
      icon: 'star' as IconName
    }
  ]
})

// Observar mudanças na célula
watch(() => memberStore.celulaId, () => {
  buscarUltimosRelatorios()
})

onMounted(() => {
  buscarUltimosRelatorios()
})
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
    <button
      v-for="stat in stats"
      :key="stat.title"
      type="button"
      @click="goToAttendance"
      class="card p-3 flex items-center w-full text-left transition-transform duration-200 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      <div class="flex items-center justify-center w-8 h-8 rounded-full mr-3"
           :class="`bg-${stat.color}-50`">
        <AppIcon :name="stat.icon" :class="`text-${stat.color}-500`" size="sm" />
      </div>
      
      <div class="flex-1">
        <p class="text-xs font-medium text-neutral-700">{{ stat.title }}</p>
        <div class="flex items-center">
          <p class="text-lg font-semibold text-neutral-800">{{ stat.value }}</p>
          <span 
            v-if="stat.percentage !== undefined" 
            class="text-xs ml-2 font-medium"
            :class="`text-${stat.color}-600`"
          >
            {{ stat.percentage }}%
          </span>
        </div>
      </div>
    </button>
  </div>
</template>