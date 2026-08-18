<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { DashboardCuidadoResponse } from '../../../services/adminService'
import { DASHBOARD_UNIFIED_COPY } from '../../../constants/dashboardUnified'
import {
  coverageBarClass,
  coverageCardClass,
  coverageRowClass,
  resolveDashboardLimiares,
} from '../../../utils/dashboardCuidadoUi'

const PREVIEW_LIMIT = 5

const props = defineProps<{
  celulas: DashboardCuidadoResponse['celulas']
  limiares: DashboardCuidadoResponse['limiares'] | null
  loading: boolean
}>()

const expanded = ref(false)

const limiaresResolved = computed(() => resolveDashboardLimiares(props.limiares))

const visibleCelulas = computed(() =>
  expanded.value ? props.celulas : props.celulas.slice(0, PREVIEW_LIMIT),
)

const hiddenCount = computed(() => Math.max(0, props.celulas.length - PREVIEW_LIMIT))

const showToggle = computed(() => props.celulas.length > PREVIEW_LIMIT)

function barClass(pct: number) {
  return coverageBarClass(pct, limiaresResolved.value)
}

function rowClass(pct: number, totalMembros: number) {
  return coverageRowClass(pct, totalMembros, limiaresResolved.value)
}

function cardClass(pct: number, totalMembros: number) {
  return coverageCardClass(pct, totalMembros, limiaresResolved.value)
}
</script>

<template>
  <section
    class="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-2"
    aria-labelledby="celulas-heading"
  >
    <h2 id="celulas-heading" class="mb-4 text-sm font-semibold text-neutral-800">
      {{ DASHBOARD_UNIFIED_COPY.sections.celulas }}
    </h2>

    <div v-if="loading" class="flex flex-col gap-3" aria-busy="true">
      <div v-for="i in 5" :key="i" class="h-12 animate-pulse rounded-lg bg-neutral-100" />
    </div>

    <div
      v-else-if="celulas.length === 0"
      class="rounded-lg border border-neutral-100 bg-neutral-50 p-8 text-center"
    >
      <p class="text-sm text-neutral-600">Nenhuma célula ativa neste recorte.</p>
    </div>

    <template v-else>
      <ul class="flex flex-col gap-2 sm:hidden">
        <li v-for="c in visibleCelulas" :key="c.celulaId">
          <RouterLink
            :to="{ name: 'admin-rede-cuidado', query: { celulaId: String(c.celulaId) } }"
            custom
            v-slot="{ navigate, href }"
          >
            <a
              :href="href"
              class="block touch-manipulation rounded-xl border p-4 active:scale-[0.99]"
              :class="cardClass(c.percentualCobertura, c.totalMembros)"
              @click="(e) => navigate(e)"
            >
              <div class="mb-2 flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-neutral-900">{{ c.nome }}</p>
                  <p class="mt-0.5 truncate text-xs text-neutral-500">{{ c.liderNome }}</p>
                </div>
                <span class="shrink-0 text-sm font-bold tabular-nums text-neutral-800">
                  {{ c.percentualCobertura }}%
                </span>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                <div
                  class="h-2 rounded-full"
                  :class="barClass(c.percentualCobertura)"
                  :style="{ width: `${Math.min(100, c.percentualCobertura)}%` }"
                />
              </div>
              <p class="mt-2 text-xs text-neutral-500">
                {{ c.comCuidador }} / {{ c.totalMembros }} com cuidador
              </p>
            </a>
          </RouterLink>
        </li>
      </ul>

      <div class="hidden overflow-hidden rounded-lg border border-neutral-100 sm:block">
        <table class="min-w-full text-sm">
          <thead class="bg-neutral-50 text-left text-xs font-semibold uppercase text-neutral-600">
            <tr>
              <th class="px-4 py-3">Célula</th>
              <th class="px-4 py-3">Líder</th>
              <th class="px-4 py-3">Membros</th>
              <th class="px-4 py-3 w-48">Cobertura</th>
              <th class="px-4 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in visibleCelulas"
              :key="c.celulaId"
              class="border-t border-neutral-100 hover:bg-neutral-50/80"
              :class="rowClass(c.percentualCobertura, c.totalMembros)"
            >
              <td class="px-4 py-3 font-medium text-neutral-900">{{ c.nome }}</td>
              <td class="px-4 py-3 text-neutral-600">{{ c.liderNome }}</td>
              <td class="px-4 py-3 tabular-nums text-neutral-600">{{ c.totalMembros }}</td>
              <td class="px-4 py-3 align-middle">
                <div class="flex items-center gap-3">
                  <div class="h-2 min-w-[80px] flex-1 overflow-hidden rounded-full bg-neutral-200">
                    <div
                      class="h-2 rounded-full"
                      :class="barClass(c.percentualCobertura)"
                      :style="{ width: `${Math.min(100, c.percentualCobertura)}%` }"
                    />
                  </div>
                  <span class="w-11 text-right font-semibold tabular-nums text-neutral-900">
                    {{ c.percentualCobertura }}%
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-right">
                <RouterLink
                  :to="{ name: 'admin-rede-cuidado', query: { celulaId: String(c.celulaId) } }"
                  class="font-medium text-primary-600 hover:text-primary-700"
                >
                  Ver rede
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="showToggle" class="mt-4 text-center">
        <button
          type="button"
          class="text-sm font-medium text-primary-600 hover:text-primary-700 touch-manipulation"
          @click="expanded = !expanded"
        >
          {{
            expanded
              ? DASHBOARD_UNIFIED_COPY.celulas.verMenos
              : DASHBOARD_UNIFIED_COPY.celulas.verMais(hiddenCount)
          }}
        </button>
      </div>
    </template>
  </section>
</template>
