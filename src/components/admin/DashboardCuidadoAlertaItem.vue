<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppIcon from '../AppIcon.vue'

defineProps<{
  titulo: string
  subtitulo: string
  celulaId: number
  icon: 'heart' | 'grid' | 'users'
  iconClass: string
}>()
</script>

<template>
  <RouterLink
    :to="{ name: 'admin-rede-cuidado', query: { celulaId: String(celulaId) } }"
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
        class="flex size-10 shrink-0 items-center justify-center rounded-lg"
        :class="iconClass"
      >
        <AppIcon :name="icon" size="sm" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-neutral-900">{{ titulo }}</p>
        <p class="truncate text-xs text-neutral-500">{{ subtitulo }}</p>
      </div>
      <svg
        class="size-5 shrink-0 text-neutral-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </a>
  </RouterLink>
</template>
