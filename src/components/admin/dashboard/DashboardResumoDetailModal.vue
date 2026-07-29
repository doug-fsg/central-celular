<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue'
import AppIcon from '../../AppIcon.vue'
import type { IconName } from '../../AppIcon.vue'

export type ResumoDetailKind =
  | 'sem-cuidador'
  | 'rede-incompleta'
  | 'acompanhados'
  | 'total-membros'

export interface ResumoMembroItem {
  membroId: number
  nome: string
  celulaId: number
  celulaNome: string
  cuidadorNome?: string | null
}

export interface ResumoCelulaItem {
  celulaId: number
  nome: string
  percentualCobertura: number
  semCuidador: number
}

const props = defineProps<{
  open: boolean
  kind: ResumoDetailKind | null
  title: string
  icon: IconName
  iconWrap: string
  membros?: ResumoMembroItem[]
  celulas?: ResumoCelulaItem[]
}>()

const emit = defineEmits<{
  close: []
}>()

const isCelulaList = computed(() => props.kind === 'rede-incompleta')

const emptyMessage = computed(() => {
  if (props.kind === 'sem-cuidador') return 'Nenhum membro aguardando cuidador.'
  if (props.kind === 'rede-incompleta') return 'Nenhuma célula com rede incompleta.'
  if (props.kind === 'acompanhados') return 'Nenhum membro sendo acompanhado.'
  return 'Nenhum membro ativo neste recorte.'
})

const itemCount = computed(() =>
  isCelulaList.value ? (props.celulas?.length ?? 0) : (props.membros?.length ?? 0),
)
</script>

<template>
  <TransitionRoot appear :show="open" as="template">
    <Dialog as="div" class="relative z-[60]" @close="emit('close')">
      <TransitionChild
        as="template"
        enter="duration-200 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-150 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/30" aria-hidden="true" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 sm:items-center">
          <TransitionChild
            as="template"
            enter="duration-200 ease-out"
            enter-from="opacity-0 translate-y-4 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="duration-150 ease-in"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:scale-95"
          >
            <DialogPanel
              class="flex max-h-[min(85vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            >
              <div class="flex items-start gap-3 border-b border-neutral-100 px-5 py-4">
                <div
                  class="flex size-10 shrink-0 items-center justify-center rounded-xl"
                  :class="iconWrap"
                >
                  <AppIcon :name="icon" size="sm" />
                </div>
                <div class="min-w-0 flex-1">
                  <DialogTitle class="text-base font-semibold text-neutral-900">
                    {{ title }}
                  </DialogTitle>
                  <p class="mt-0.5 text-xs text-neutral-500">
                    {{ itemCount }} {{ itemCount === 1 ? 'registro' : 'registros' }}
                  </p>
                </div>
                <button
                  type="button"
                  class="flex size-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                  aria-label="Fechar"
                  @click="emit('close')"
                >
                  <AppIcon name="close" size="sm" />
                </button>
              </div>

              <ul class="flex-1 overflow-y-auto px-3 py-3">
                <li v-if="itemCount === 0" class="px-2 py-8 text-center text-sm text-neutral-500">
                  {{ emptyMessage }}
                </li>

                <template v-else-if="isCelulaList">
                  <li
                    v-for="c in celulas"
                    :key="c.celulaId"
                    class="border-b border-neutral-50 last:border-0"
                  >
                    <RouterLink
                      :to="{ name: 'admin-rede-cuidado', query: { celulaId: String(c.celulaId) } }"
                      class="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-neutral-50 touch-manipulation"
                      @click="emit('close')"
                    >
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-neutral-900">{{ c.nome }}</p>
                        <p class="mt-0.5 text-xs text-neutral-500">
                          {{ c.percentualCobertura }}% cobertura · {{ c.semCuidador }}
                          sem cuidador
                        </p>
                      </div>
                      <svg
                        class="size-4 shrink-0 text-neutral-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </RouterLink>
                  </li>
                </template>

                <template v-else>
                  <li
                    v-for="m in membros"
                    :key="m.membroId"
                    class="border-b border-neutral-50 last:border-0"
                  >
                    <RouterLink
                      :to="{ name: 'admin-rede-cuidado', query: { celulaId: String(m.celulaId) } }"
                      class="flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-neutral-50 touch-manipulation"
                      @click="emit('close')"
                    >
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-neutral-900">{{ m.nome }}</p>
                        <p class="mt-0.5 truncate text-xs text-neutral-500">
                          {{ m.celulaNome }}
                          <template v-if="m.cuidadorNome"> · Cuidador: {{ m.cuidadorNome }}</template>
                        </p>
                      </div>
                      <svg
                        class="size-4 shrink-0 text-neutral-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </RouterLink>
                  </li>
                </template>
              </ul>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
