<script setup lang="ts">
import { computed } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue'
import AppIcon from '../../AppIcon.vue'
import type { IconName } from '../../AppIcon.vue'
import type { LiderRelatorioItem, ParticipacaoMembroItem } from '../../../services/adminService'

export type SemanaDetailVariant = 'participacao-culto' | 'participacao-celula' | 'relatorios'

const props = defineProps<{
  open: boolean
  variant: SemanaDetailVariant | null
  title: string
  icon: IconName
  iconWrap: string
  participacaoItems?: ParticipacaoMembroItem[]
  relatorioPreencheram?: LiderRelatorioItem[]
  relatorioPendentes?: LiderRelatorioItem[]
}>()

const emit = defineEmits<{
  close: []
}>()

const isParticipacao = computed(
  () => props.variant === 'participacao-culto' || props.variant === 'participacao-celula',
)

const isRelatorios = computed(() => props.variant === 'relatorios')

const itemCount = computed(() => {
  if (isParticipacao.value) return props.participacaoItems?.length ?? 0
  if (isRelatorios.value) {
    return (props.relatorioPreencheram?.length ?? 0) + (props.relatorioPendentes?.length ?? 0)
  }
  return 0
})

const emptyMessage = computed(() => {
  if (props.variant === 'participacao-culto') return 'Nenhuma presença registrada no culto.'
  if (props.variant === 'participacao-celula') return 'Nenhuma presença registrada na célula.'
  return 'Nenhum líder neste recorte.'
})
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
              class="flex max-h-[min(85vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
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

              <div class="flex-1 overflow-y-auto px-3 py-3">
                <p
                  v-if="itemCount === 0"
                  class="px-2 py-8 text-center text-sm text-neutral-500"
                >
                  {{ emptyMessage }}
                </p>

                <!-- Participação: tabela 3 colunas -->
                <template v-else-if="isParticipacao">
                  <div class="hidden overflow-hidden rounded-lg border border-neutral-100 sm:block">
                    <table class="min-w-full text-sm">
                      <thead class="bg-neutral-50 text-left text-xs font-semibold uppercase text-neutral-600">
                        <tr>
                          <th class="px-3 py-2.5">Membro</th>
                          <th class="px-3 py-2.5">Líder</th>
                          <th class="px-3 py-2.5">Cuidador</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="item in participacaoItems"
                          :key="item.membroId"
                          class="border-t border-neutral-100"
                        >
                          <td class="px-3 py-2.5 font-medium text-neutral-900">{{ item.membroNome }}</td>
                          <td class="px-3 py-2.5 text-neutral-600">{{ item.liderNome }}</td>
                          <td class="px-3 py-2.5 text-neutral-600">
                            {{ item.cuidadorNome ?? '—' }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <ul class="flex flex-col gap-2 sm:hidden">
                    <li
                      v-for="item in participacaoItems"
                      :key="item.membroId"
                      class="rounded-xl border border-neutral-100 bg-neutral-50/50 px-3 py-3"
                    >
                      <p class="text-sm font-medium text-neutral-900">{{ item.membroNome }}</p>
                      <p class="mt-1 text-xs text-neutral-500">
                        Líder: {{ item.liderNome }}
                      </p>
                      <p class="mt-0.5 text-xs text-neutral-500">
                        Cuidador: {{ item.cuidadorNome ?? '—' }}
                      </p>
                    </li>
                  </ul>
                </template>

                <!-- Relatórios: preencheram / pendentes -->
                <template v-else-if="isRelatorios">
                  <section v-if="relatorioPreencheram?.length" class="mb-4">
                    <h3 class="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Preencheram ({{ relatorioPreencheram.length }})
                    </h3>
                    <ul class="flex flex-col gap-1">
                      <li
                        v-for="lider in relatorioPreencheram"
                        :key="`ok-${lider.liderId}`"
                        class="rounded-xl px-2 py-2.5 hover:bg-neutral-50"
                      >
                        <p class="text-sm font-medium text-neutral-900">{{ lider.liderNome }}</p>
                        <p class="mt-0.5 text-xs text-neutral-500">
                          {{ lider.celulas.join(' · ') }}
                        </p>
                      </li>
                    </ul>
                  </section>

                  <section v-if="relatorioPendentes?.length">
                    <h3 class="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Pendentes ({{ relatorioPendentes.length }})
                    </h3>
                    <ul class="flex flex-col gap-1">
                      <li
                        v-for="lider in relatorioPendentes"
                        :key="`pend-${lider.liderId}`"
                        class="rounded-xl px-2 py-2.5 hover:bg-neutral-50"
                      >
                        <p class="text-sm font-medium text-neutral-900">{{ lider.liderNome }}</p>
                        <p class="mt-0.5 text-xs text-neutral-500">
                          {{ lider.celulas.join(' · ') }}
                        </p>
                      </li>
                    </ul>
                  </section>
                </template>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
