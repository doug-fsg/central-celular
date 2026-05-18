<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { DashboardCuidadoResponse } from '../../services/adminService'
import { DASHBOARD_CUIDADO_COPY } from '../../constants/dashboardCuidado'
import AppIcon from '../AppIcon.vue'

type AlertRow =
  | { kind: 'membro'; titulo: string; subtitulo: string; celulaId: number }
  | { kind: 'celula'; titulo: string; subtitulo: string; celulaId: number }
  | { kind: 'consolidador'; titulo: string; subtitulo: string; celulaId: number }

const props = defineProps<{
  alertas: DashboardCuidadoResponse['alertas'] | null
  loading: boolean
  showCelebration: boolean
}>()

const linhas = computed<AlertRow[]>(() => {
  if (!props.alertas) return []
  const out: AlertRow[] = []

  for (const m of props.alertas.membrosSemCuidador) {
    if (out.length >= 7) break
    out.push({
      kind: 'membro',
      titulo: `${m.nome} aguardando cuidador`,
      subtitulo: m.celulaNome,
      celulaId: m.celulaId,
    })
  }

  for (const c of props.alertas.celulasBaixaCobertura) {
    if (out.length >= 7) break
    out.push({
      kind: 'celula',
      titulo: `${c.nome} com rede incompleta`,
      subtitulo: `${c.percentualCobertura}% com cuidador · ${c.semCuidador} sem`,
      celulaId: c.celulaId,
    })
  }

  for (const x of props.alertas.consolidadoresSobrecarregados) {
    if (out.length >= 7) break
    out.push({
      kind: 'consolidador',
      titulo: `${x.nome} com muitos cuidados`,
      subtitulo: `${x.qtdCuidados} pessoas · ${x.celulaNome}`,
      celulaId: x.celulaId,
    })
  }

  return out
})

function iconName(kind: AlertRow['kind']): 'heart' | 'grid' | 'users' {
  if (kind === 'membro') return 'heart'
  if (kind === 'celula') return 'grid'
  return 'users'
}
</script>

<template>
  <section aria-labelledby="alertas-heading">
    <div class="flex items-center justify-between gap-2 mb-2">
      <h2 id="alertas-heading" class="text-sm font-semibold text-neutral-800">
        {{ DASHBOARD_CUIDADO_COPY.alertsHeading }}
      </h2>
    </div>

    <div v-if="loading && !alertas" class="space-y-2" aria-busy="true">
      <div v-for="i in 3" :key="i" class="h-14 rounded-xl bg-neutral-100 animate-pulse" />
    </div>

    <div
      v-else-if="showCelebration && linhas.length === 0"
      class="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-900 flex gap-3"
    >
      <AppIcon name="check" class="flex-shrink-0 text-emerald-600 mt-0.5 w-6 h-6" size="md" />
      <span>Tudo certo aqui neste filtro — continue cuidando com calma.</span>
    </div>

    <div v-else-if="linhas.length === 0" class="text-sm text-neutral-500 py-3">
      {{ DASHBOARD_CUIDADO_COPY.emptyAlerts }}
    </div>

    <ul v-else class="space-y-2">
      <li v-for="(row, idx) in linhas" :key="`${row.kind}-${idx}-${row.celulaId}`">
        <RouterLink
          :to="{ name: 'admin-rede-cuidado', query: { celulaId: String(row.celulaId) } }"
          custom
          v-slot="{ navigate, href }"
        >
          <a
            :href="href"
            class="min-h-[48px] w-full px-3 py-2.5 rounded-xl bg-white border border-neutral-100 flex items-center gap-3 active:bg-rose-50 motion-reduce:transition-none transition-colors shadow-sm hover:border-rose-200 touch-manipulation"
            style="-webkit-tap-highlight-color: rgba(244, 63, 94, 0.12)"
            @click="(e) => navigate(e)"
          >
            <div
              class="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0"
              :class="
                row.kind === 'membro'
                  ? 'bg-rose-50 text-rose-600'
                  : row.kind === 'celula'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-purple-50 text-purple-700'
              "
            >
              <AppIcon :name="iconName(row.kind)" size="sm" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-neutral-900 truncate">{{ row.titulo }}</p>
              <p class="text-xs text-neutral-500 truncate">{{ row.subtitulo }}</p>
            </div>
            <svg class="w-5 h-5 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
