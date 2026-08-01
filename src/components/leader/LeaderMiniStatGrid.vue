<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DashboardCuidadoResponse } from '../../services/adminService'
import { LEADER_DASHBOARD_COPY } from '../../constants/leaderDashboard'
import AppIcon from '../AppIcon.vue'
import type { IconName } from '../AppIcon.vue'
import DashboardResumoDetailModal, {
  type ResumoDetailKind,
} from '../admin/dashboard/DashboardResumoDetailModal.vue'

const props = defineProps<{
  resumo: DashboardCuidadoResponse['resumo'] | null
  totaisAlertas: DashboardCuidadoResponse['totaisAlertas'] | null
  listas: DashboardCuidadoResponse['listas'] | null
  consolidadoresCount: number
  loading: boolean
}>()

const activeKind = ref<ResumoDetailKind | null>(null)

type LeaderStatKey = 'sem-cuidador' | 'consolidadores' | 'acompanhados' | 'total-membros'

const cards = computed(() => {
  const r = props.resumo
  const t = props.totaisAlertas
  if (!r || !t) return []

  return [
    {
      key: 'sem-cuidador' as LeaderStatKey,
      modalKey: 'sem-cuidador' as ResumoDetailKind,
      label: LEADER_DASHBOARD_COPY.miniStats.semCuidador.label,
      hint: LEADER_DASHBOARD_COPY.miniStats.semCuidador.hint(t.membrosSemCuidador),
      value: t.membrosSemCuidador,
      icon: 'user' as IconName,
      iconWrap: 'bg-rose-100 text-rose-600',
      cardClass:
        t.membrosSemCuidador > 0 ? 'border-rose-100 bg-rose-50/30' : 'border-neutral-200 bg-white',
    },
    {
      key: 'consolidadores' as LeaderStatKey,
      modalKey: 'rede-incompleta' as ResumoDetailKind,
      label: LEADER_DASHBOARD_COPY.miniStats.consolidadores.label,
      hint: LEADER_DASHBOARD_COPY.miniStats.consolidadores.hint(props.consolidadoresCount),
      value: props.consolidadoresCount,
      icon: 'star' as IconName,
      iconWrap: 'bg-amber-100 text-amber-600',
      cardClass: 'border-neutral-200 bg-white',
    },
    {
      key: 'acompanhados' as LeaderStatKey,
      modalKey: 'acompanhados' as ResumoDetailKind,
      label: LEADER_DASHBOARD_COPY.miniStats.acompanhados.label,
      hint: LEADER_DASHBOARD_COPY.miniStats.acompanhados.hint(r.comCuidador),
      value: r.comCuidador,
      icon: 'heart' as IconName,
      iconWrap: 'bg-emerald-100 text-emerald-600',
      cardClass: 'border-neutral-200 bg-white',
    },
    {
      key: 'total-membros' as LeaderStatKey,
      modalKey: 'total-membros' as ResumoDetailKind,
      label: LEADER_DASHBOARD_COPY.miniStats.totalMembros.label,
      hint: LEADER_DASHBOARD_COPY.miniStats.totalMembros.hint,
      value: r.totalMembros,
      icon: 'users' as IconName,
      iconWrap: 'bg-sky-100 text-sky-600',
      cardClass: 'border-neutral-200 bg-white',
    },
  ]
})

const activeCard = computed(() => cards.value.find((c) => c.key === activeKind.value) ?? null)

const modalMembros = computed(() => {
  if (!props.listas || !activeKind.value) return []
  if (activeKind.value === 'sem-cuidador') return props.listas.membrosSemCuidador
  if (activeKind.value === 'acompanhados') return props.listas.membrosComCuidador
  if (activeKind.value === 'total-membros') return props.listas.todosMembros
  return []
})

const modalCelulas = computed(() => [])

function openDetail(key: LeaderStatKey) {
  if (key === 'consolidadores') return
  activeKind.value = key as ResumoDetailKind
}

function closeDetail() {
  activeKind.value = null
}
</script>

<template>
  <div v-if="loading" class="grid h-full grid-cols-2 gap-3" aria-busy="true">
    <div v-for="i in 4" :key="i" class="h-[132px] animate-pulse rounded-2xl bg-neutral-100" />
  </div>

  <div v-else class="grid h-full grid-cols-2 gap-3">
    <button
      v-for="card in cards"
      :key="card.key"
      type="button"
      class="relative flex min-h-[132px] flex-col rounded-2xl border p-4 text-left shadow-sm transition-colors touch-manipulation"
      :class="[
        card.cardClass,
        card.key !== 'consolidadores' ? 'hover:border-primary-200 hover:shadow-md' : 'cursor-default',
      ]"
      @click="openDetail(card.key)"
    >
      <div class="flex items-center gap-2">
        <div
          class="flex size-8 shrink-0 items-center justify-center rounded-lg"
          :class="card.iconWrap"
        >
          <AppIcon :name="card.icon" size="sm" />
        </div>
        <p class="text-sm font-medium text-neutral-700">{{ card.label }}</p>
      </div>

      <p class="mt-3 text-[1.75rem] font-bold leading-none tabular-nums text-neutral-900">
        {{ card.value }}
      </p>
      <p class="mt-1.5 pr-10 text-xs leading-snug text-neutral-500">{{ card.hint }}</p>

      <span
        v-if="card.key !== 'consolidadores'"
        class="absolute bottom-3.5 right-3.5 flex size-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm"
        aria-hidden="true"
      >
        <svg class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </button>
  </div>

  <DashboardResumoDetailModal
    :open="activeKind !== null"
    :kind="activeKind"
    :title="activeCard?.label ?? ''"
    :icon="activeCard?.icon ?? 'users'"
    :icon-wrap="activeCard?.iconWrap ?? 'bg-neutral-100 text-neutral-600'"
    :membros="modalMembros"
    :celulas="modalCelulas"
    @close="closeDetail"
  />
</template>
