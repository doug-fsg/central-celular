<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { DashboardCuidadoResponse } from '../../services/adminService'
import { DASHBOARD_CUIDADO_COPY } from '../../constants/dashboardCuidado'

defineProps<{
  celulas: DashboardCuidadoResponse['celulas']
  loading: boolean
}>()
</script>

<template>
  <section aria-labelledby="celulas-heading">
    <h2 id="celulas-heading" class="text-sm font-semibold text-neutral-800 mb-2">
      {{ DASHBOARD_CUIDADO_COPY.rankingHeading }}
    </h2>

    <div v-if="loading" class="hidden sm:block space-y-2" aria-busy="true">
      <div v-for="i in 4" :key="i" class="h-12 rounded-lg bg-neutral-100 animate-pulse" />
    </div>

    <!-- Mobile cards -->
    <div v-if="loading" class="sm:hidden space-y-2">
      <div v-for="i in 4" :key="i" class="h-24 rounded-xl bg-neutral-100 animate-pulse" />
    </div>

    <template v-else>
      <!-- Mobile -->
      <ul class="space-y-2 sm:hidden">
        <li v-for="c in celulas" :key="c.celulaId">
          <RouterLink
            :to="{ name: 'admin-rede-cuidado', query: { celulaId: String(c.celulaId) } }"
            custom
            v-slot="{ navigate, href }"
          >
            <a
              :href="href"
              class="block rounded-xl border p-4 touch-manipulation active:scale-[0.99]"
              style="-webkit-tap-highlight-color: rgba(244, 63, 94, 0.1)"
              :class="
                c.totalMembros > 0 && c.percentualCobertura < 80
                  ? 'bg-rose-50/60 border-rose-100'
                  : 'bg-white border-neutral-100'
              "
              @click="(e) => navigate(e)"
            >
              <div class="flex justify-between items-start gap-2 mb-2">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-neutral-900 truncate">{{ c.nome }}</p>
                  <p class="text-xs text-neutral-500 truncate mt-0.5">{{ c.liderNome }}</p>
                </div>
                <span class="text-sm font-bold tabular-nums text-neutral-800 flex-shrink-0">
                  {{ c.percentualCobertura }}%
                </span>
              </div>
              <div class="w-full h-2 rounded-full bg-neutral-200 overflow-hidden">
                <div
                  class="h-2 rounded-full bg-rose-500"
                  :style="{ width: `${Math.min(100, c.percentualCobertura)}%` }"
                />
              </div>
              <p class="text-xs text-neutral-500 mt-2">
                {{ c.comCuidador }} / {{ c.totalMembros }} com cuidador
              </p>
            </a>
          </RouterLink>
        </li>
      </ul>

      <!-- Desktop -->
      <div class="hidden sm:block overflow-hidden rounded-xl border border-neutral-200 shadow-sm bg-white">
        <table class="min-w-full text-sm">
          <thead class="bg-neutral-50 text-left text-xs font-semibold uppercase text-neutral-600">
            <tr>
              <th class="px-4 py-3">Nome</th>
              <th class="px-4 py-3">Líder</th>
              <th class="px-4 py-3 w-48">Cobertura</th>
              <th class="px-4 py-3 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in celulas"
              :key="c.celulaId"
              class="border-t border-neutral-100 hover:bg-neutral-50/80"
              :class="c.totalMembros > 0 && c.percentualCobertura < 80 ? 'bg-rose-50/30' : ''"
            >
              <td class="px-4 py-3 font-medium text-neutral-900">{{ c.nome }}</td>
              <td class="px-4 py-3 text-neutral-600">{{ c.liderNome }}</td>
              <td class="px-4 py-3 align-middle">
                <div class="flex items-center gap-3">
                  <div class="flex-1 min-w-[80px] h-2 rounded-full bg-neutral-200 overflow-hidden">
                    <div
                      class="h-2 rounded-full bg-rose-500"
                      :style="{ width: `${Math.min(100, c.percentualCobertura)}%` }"
                    />
                  </div>
                  <span class="tabular-nums font-semibold w-11 text-neutral-900"
                    >{{ c.percentualCobertura }}%</span
                  >
                </div>
              </td>
              <td class="px-4 py-3 text-right">
                <RouterLink
                  :to="{ name: 'admin-rede-cuidado', query: { celulaId: String(c.celulaId) } }"
                  class="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Ver rede
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
