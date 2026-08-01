<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMemberStore } from '../../stores/memberStore'
import { LEADER_DASHBOARD_COPY } from '../../constants/leaderDashboard'
import AppIcon from '../AppIcon.vue'

const props = defineProps<{
  loading: boolean
}>()

const memberStore = useMemberStore()
const router = useRouter()

const consolidators = computed(() => memberStore.getConsolidators)
const coLeaders = computed(() => memberStore.getCoLeaders)

function goToCell() {
  router.push({ name: 'minha-celula' })
}
</script>

<template>
  <section
    class="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm lg:col-span-2"
    aria-labelledby="equipe-heading"
  >
    <h2 id="equipe-heading" class="mb-4 text-sm font-semibold text-neutral-800">
      {{ LEADER_DASHBOARD_COPY.sections.equipe }}
    </h2>

    <div v-if="loading" class="flex flex-col gap-3" aria-busy="true">
      <div v-for="i in 3" :key="i" class="h-14 animate-pulse rounded-xl bg-neutral-100" />
    </div>

    <div
      v-else-if="consolidators.length === 0 && coLeaders.length === 0"
      class="rounded-xl border border-neutral-100 bg-neutral-50 p-8 text-center"
    >
      <AppIcon name="users" class="mx-auto text-neutral-300" size="lg" />
      <p class="mt-3 text-sm text-neutral-600">Nenhum consolidador ou co-líder cadastrado.</p>
      <button
        type="button"
        class="mt-4 min-h-[44px] touch-manipulation rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white"
        @click="goToCell"
      >
        Gerenciar membros
      </button>
    </div>

    <template v-else>
      <ul class="flex flex-col gap-2">
        <li v-for="member in consolidators" :key="'c-' + member.id">
          <button
            type="button"
            class="flex w-full touch-manipulation items-center gap-3 rounded-xl border border-primary-100 bg-primary-50/40 p-3 text-left active:scale-[0.99]"
            @click="goToCell"
          >
            <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
              {{ member.name.charAt(0) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-neutral-900">{{ member.name }}</p>
              <p class="text-xs text-primary-600">Consolidador</p>
            </div>
          </button>
        </li>
        <li v-for="member in coLeaders" :key="'l-' + member.id">
          <button
            type="button"
            class="flex w-full touch-manipulation items-center gap-3 rounded-xl border border-vibrant-100 bg-vibrant-50/40 p-3 text-left active:scale-[0.99]"
            @click="goToCell"
          >
            <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-vibrant-100 text-sm font-semibold text-vibrant-700">
              {{ member.name.charAt(0) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-neutral-900">{{ member.name }}</p>
              <p class="text-xs text-vibrant-600">Co-líder</p>
            </div>
          </button>
        </li>
      </ul>
    </template>
  </section>
</template>
