<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { DashboardCuidadoResponse } from '../../services/adminService'
import { DASHBOARD_CUIDADO_COPY } from '../../constants/dashboardCuidado'
import { hasAlertasPendentes, resolveDashboardLimiares } from '../../utils/dashboardCuidadoUi'
import AppIcon from '../AppIcon.vue'
import DashboardCuidadoAlertaItem from './DashboardCuidadoAlertaItem.vue'

const props = defineProps<{
  alertas: DashboardCuidadoResponse['alertas'] | null
  totaisAlertas: DashboardCuidadoResponse['totaisAlertas'] | null
  limiares: DashboardCuidadoResponse['limiares'] | null
  loading: boolean
  showCelebration: boolean
}>()

const router = useRouter()

const limiaresResolved = computed(() => resolveDashboardLimiares(props.limiares))
const limiteUi = computed(() => limiaresResolved.value.maxAlertasPorTipoUi)

const membrosVisiveis = computed(
  () => props.alertas?.membrosSemCuidador.slice(0, limiteUi.value) ?? [],
)
const celulasVisiveis = computed(
  () => props.alertas?.celulasBaixaCobertura.slice(0, limiteUi.value) ?? [],
)
const consolidadoresVisiveis = computed(
  () => props.alertas?.consolidadoresSobrecarregados.slice(0, limiteUi.value) ?? [],
)

const totalMembros = computed(() => props.totaisAlertas?.membrosSemCuidador ?? 0)
const totalCelulas = computed(() => props.totaisAlertas?.celulasBaixaCobertura ?? 0)
const totalConsolidadores = computed(
  () => props.totaisAlertas?.consolidadoresSobrecarregados ?? 0,
)

const temAlertas = computed(() => hasAlertasPendentes(props.totaisAlertas))

const restanteMembros = computed(() =>
  Math.max(0, totalMembros.value - membrosVisiveis.value.length),
)
const restanteCelulas = computed(() =>
  Math.max(0, totalCelulas.value - celulasVisiveis.value.length),
)
const restanteConsolidadores = computed(() =>
  Math.max(0, totalConsolidadores.value - consolidadoresVisiveis.value.length),
)

function irGerenciarRede(celulaId?: number) {
  if (celulaId != null) {
    router.push({ name: 'admin-rede-cuidado', query: { celulaId: String(celulaId) } })
  } else {
    router.push({ name: 'admin-rede-cuidado' })
  }
}
</script>

<template>
  <section aria-labelledby="alertas-heading">
    <div class="mb-3 flex items-center justify-between gap-2">
      <h2 id="alertas-heading" class="text-sm font-semibold text-neutral-800">
        {{ DASHBOARD_CUIDADO_COPY.alertsHeading }}
      </h2>
      <span
        v-if="temAlertas && !loading"
        class="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 tabular-nums"
      >
        {{
          (totaisAlertas?.membrosSemCuidador ?? 0) +
          (totaisAlertas?.celulasBaixaCobertura ?? 0) +
          (totaisAlertas?.consolidadoresSobrecarregados ?? 0)
        }}
      </span>
    </div>

    <div v-if="loading" class="flex flex-col gap-3" aria-busy="true">
      <div v-for="i in 3" :key="i" class="h-14 rounded-xl bg-neutral-100 animate-pulse" />
    </div>

    <div
      v-else-if="showCelebration && !temAlertas"
      class="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900"
    >
      <AppIcon name="check" class="mt-0.5 size-6 shrink-0 text-emerald-600" size="md" />
      <span>Tudo certo aqui neste filtro — continue cuidando com calma.</span>
    </div>

    <div v-else-if="!temAlertas" class="py-3 text-sm text-neutral-500">
      {{ DASHBOARD_CUIDADO_COPY.emptyAlerts }}
    </div>

    <div v-else class="flex flex-col gap-4">
      <!-- Membros -->
      <div v-if="totalMembros > 0">
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {{ DASHBOARD_CUIDADO_COPY.alertSections.membros }}
          <span class="tabular-nums text-neutral-700">({{ totalMembros }})</span>
        </h3>
        <ul class="flex flex-col gap-2">
          <li v-for="m in membrosVisiveis" :key="`m-${m.membroId}`">
            <DashboardCuidadoAlertaItem
              :titulo="`${m.nome} aguardando cuidador`"
              :subtitulo="m.celulaNome"
              :celula-id="m.celulaId"
              icon="heart"
              icon-class="bg-rose-50 text-rose-600"
            />
          </li>
        </ul>
        <button
          v-if="restanteMembros > 0"
          type="button"
          class="mt-2 text-xs font-semibold text-primary-600 hover:text-primary-700"
          @click="irGerenciarRede()"
        >
          {{ DASHBOARD_CUIDADO_COPY.verMais(restanteMembros) }}
        </button>
      </div>

      <!-- Células -->
      <div v-if="totalCelulas > 0">
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {{ DASHBOARD_CUIDADO_COPY.alertSections.celulas }}
          <span class="tabular-nums text-neutral-700">({{ totalCelulas }})</span>
        </h3>
        <ul class="flex flex-col gap-2">
          <li v-for="c in celulasVisiveis" :key="`c-${c.celulaId}`">
            <DashboardCuidadoAlertaItem
              :titulo="`${c.nome} com rede incompleta`"
              :subtitulo="`${c.percentualCobertura}% com cuidador · ${c.semCuidador} sem`"
              :celula-id="c.celulaId"
              icon="grid"
              icon-class="bg-amber-50 text-amber-700"
            />
          </li>
        </ul>
        <button
          v-if="restanteCelulas > 0"
          type="button"
          class="mt-2 text-xs font-semibold text-primary-600 hover:text-primary-700"
          @click="irGerenciarRede()"
        >
          {{ DASHBOARD_CUIDADO_COPY.verMais(restanteCelulas) }}
        </button>
      </div>

      <!-- Consolidadores -->
      <div v-if="totalConsolidadores > 0">
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {{ DASHBOARD_CUIDADO_COPY.alertSections.consolidadores }}
          <span class="tabular-nums text-neutral-700">({{ totalConsolidadores }})</span>
        </h3>
        <ul class="flex flex-col gap-2">
          <li v-for="x in consolidadoresVisiveis" :key="`x-${x.consolidadorId}-${x.celulaId}`">
            <DashboardCuidadoAlertaItem
              :titulo="`${x.nome} com muitos cuidados`"
              :subtitulo="`${x.qtdCuidados} pessoas · ${x.celulaNome}`"
              :celula-id="x.celulaId"
              icon="users"
              icon-class="bg-violet-50 text-violet-700"
            />
          </li>
        </ul>
        <button
          v-if="restanteConsolidadores > 0"
          type="button"
          class="mt-2 text-xs font-semibold text-primary-600 hover:text-primary-700"
          @click="irGerenciarRede()"
        >
          {{ DASHBOARD_CUIDADO_COPY.verMais(restanteConsolidadores) }}
        </button>
      </div>
    </div>
  </section>
</template>
