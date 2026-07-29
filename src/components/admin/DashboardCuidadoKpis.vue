<script setup lang="ts">
import { computed } from 'vue'
import type { DashboardCuidadoResponse } from '../../services/adminService'
import { DASHBOARD_CUIDADO_COPY } from '../../constants/dashboardCuidado'
import { coverageTone } from '../../utils/dashboardCuidadoUi'

const props = defineProps<{
  resumo: DashboardCuidadoResponse['resumo'] | null
  totaisAlertas: DashboardCuidadoResponse['totaisAlertas'] | null
  limiares: DashboardCuidadoResponse['limiares']
  loading: boolean
}>()

const cards = computed(() => {
  const r = props.resumo
  const t = props.totaisAlertas
  if (!r || !t) return []

  const coberturaTone = coverageTone(r.percentualCobertura, props.limiares)

  return [
    {
      key: 'sem-cuidador',
      label: DASHBOARD_CUIDADO_COPY.kpis.semCuidador,
      value: String(t.membrosSemCuidador),
      hint: t.membrosSemCuidador === 1 ? 'membro' : 'membros',
      valueClass:
        t.membrosSemCuidador > 0 ? 'text-rose-700' : 'text-neutral-900',
      borderClass:
        t.membrosSemCuidador > 0 ? 'border-rose-200 bg-rose-50/50' : 'border-neutral-200 bg-white',
    },
    {
      key: 'cobertura',
      label: DASHBOARD_CUIDADO_COPY.kpis.cobertura,
      value: `${r.percentualCobertura}%`,
      hint: `${r.comCuidador} de ${r.totalMembros}`,
      valueClass:
        coberturaTone === 'ok'
          ? 'text-emerald-700'
          : coberturaTone === 'atencao'
            ? 'text-amber-700'
            : 'text-rose-700',
      borderClass: 'border-neutral-200 bg-white',
    },
    {
      key: 'celulas-risco',
      label: DASHBOARD_CUIDADO_COPY.kpis.celulasRisco,
      value: String(t.celulasBaixaCobertura),
      hint: `< ${props.limiares.coberturaBaixaPct}% cobertura`,
      valueClass:
        t.celulasBaixaCobertura > 0 ? 'text-amber-700' : 'text-neutral-900',
      borderClass:
        t.celulasBaixaCobertura > 0
          ? 'border-amber-200 bg-amber-50/50'
          : 'border-neutral-200 bg-white',
    },
    {
      key: 'sobrecarga',
      label: DASHBOARD_CUIDADO_COPY.kpis.sobrecarga,
      value: String(t.consolidadoresSobrecarregados),
      hint: 'consolidadores',
      valueClass:
        t.consolidadoresSobrecarregados > 0 ? 'text-violet-700' : 'text-neutral-900',
      borderClass:
        t.consolidadoresSobrecarregados > 0
          ? 'border-violet-200 bg-violet-50/50'
          : 'border-neutral-200 bg-white',
    },
  ]
})
</script>

<template>
  <section aria-label="Indicadores de cuidado" class="mb-4">
    <div
      v-if="loading"
      class="grid grid-cols-2 lg:grid-cols-4 gap-3"
      aria-busy="true"
    >
      <div v-for="i in 4" :key="i" class="h-24 rounded-xl bg-neutral-100 animate-pulse" />
    </div>

    <div
      v-else-if="cards.length > 0"
      class="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      <article
        v-for="card in cards"
        :key="card.key"
        class="rounded-xl border p-4 shadow-sm"
        :class="card.borderClass"
      >
        <p class="text-xs font-medium text-neutral-500">{{ card.label }}</p>
        <p
          class="mt-1 text-2xl font-bold tabular-nums leading-none"
          :class="card.valueClass"
        >
          {{ card.value }}
        </p>
        <p class="mt-1.5 text-xs text-neutral-500">{{ card.hint }}</p>
      </article>
    </div>
  </section>
</template>
