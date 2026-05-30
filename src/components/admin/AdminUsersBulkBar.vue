<script setup lang="ts">
import { computed } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue'
import type { Usuario } from '../../services/adminService'
import AppIcon from '../AppIcon.vue'

const props = defineProps<{
  /** Painel de ações (bottom sheet / modal) */
  sheetOpen: boolean
  selectedUsers: Usuario[]
  busy: boolean
  /** Desativa botões de envio de link (ex.: já enviando SSO) */
  busyLinks?: boolean
  /** Reenvio de convite primeiro acesso em andamento */
  busyConvites?: boolean
}>()

const emit = defineEmits<{
  'update:sheetOpen': [open: boolean]
  clear: []
  ativar: []
  desativar: []
  enviarLinks: []
  reenviarConvites: []
}>()

const count = computed(() => props.selectedUsers.length)

function liderAtivo(u: Usuario) {
  return u.cargo.toUpperCase() === 'LIDER' && u.status === 'ativo'
}

const lideresParaLink = computed(() => props.selectedUsers.filter(liderAtivo))

/** Sem senha ainda (ficam inativos no banco até o primeiro acesso). */
const pendentesPrimeiroAcesso = computed(() =>
  props.selectedUsers.filter((u) => u.possuiSenha === false),
)

const sheetTitleId = 'admin-users-bulk-sheet-title'

function closeSheet() {
  if (!props.busy) emit('update:sheetOpen', false)
}

function rowButtonClass(variant: 'default' | 'danger' | 'primary') {
  const base =
    'w-full flex items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-medium min-h-[48px] touch-manipulation transition-colors'
  if (variant === 'danger') {
    return `${base} text-red-700 bg-red-50/80 active:bg-red-100 sm:hover:bg-red-100`
  }
  if (variant === 'primary') {
    return `${base} text-primary-800 bg-primary-50/90 active:bg-primary-100 sm:hover:bg-primary-100`
  }
  return `${base} text-neutral-800 bg-neutral-50 active:bg-neutral-100 sm:hover:bg-neutral-100`
}
</script>

<template>
  <!-- Barra fixa — mobile: thumb zone + safe area; desktop: ancorada ao fluxo -->
  <div
    v-if="count > 0"
    class="fixed bottom-0 inset-x-0 z-40 sm:relative sm:inset-auto sm:bottom-auto border-t border-neutral-200/80 bg-white/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.08)] sm:shadow-sm sm:rounded-lg sm:border sm:mt-0"
    style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0px))"
  >
    <div
      class="max-w-7xl mx-auto px-3 pt-3 pb-3 sm:py-3 sm:px-4 flex items-center gap-3 sm:gap-4"
    >
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-neutral-900 tabular-nums">
          {{ count }} selecionado{{ count === 1 ? '' : 's' }}
        </p>
        <p class="text-xs text-neutral-500 mt-0.5 truncate">
          Toque em <span class="font-medium text-neutral-700">Ações</span> para ativar, desativar ou
          enviar links.
        </p>
      </div>
      <button
        type="button"
        class="flex-shrink-0 min-h-[48px] min-w-[48px] px-5 rounded-xl border border-neutral-300 bg-white text-sm font-medium text-neutral-700 active:bg-neutral-50 sm:hover:bg-neutral-50 touch-manipulation"
        :disabled="busy"
        @click="emit('clear')"
      >
        Limpar
      </button>
      <button
        type="button"
        class="flex-shrink-0 min-h-[48px] px-5 rounded-xl bg-primary-600 text-white text-sm font-semibold shadow-sm active:bg-primary-700 sm:hover:bg-primary-700 disabled:opacity-50 touch-manipulation"
        :disabled="busy"
        @click="emit('update:sheetOpen', true)"
      >
        Ações
      </button>
    </div>
  </div>

  <TransitionRoot appear :show="sheetOpen" as="template">
    <Dialog as="div" class="relative z-[100]" @close="closeSheet">
      <TransitionChild
        as="template"
        enter="duration-200 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-150 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-neutral-900/40 backdrop-blur-[2px]" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-end justify-center sm:items-center sm:p-4">
          <TransitionChild
            as="template"
            enter="duration-200 ease-out"
            enter-from="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="duration-150 ease-in"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-full sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel
              class="modal-dialog-panel modal-panel-lg max-w-lg"
              style="padding-bottom: max(1rem, env(safe-area-inset-bottom, 0px))"
            >
              <div class="px-4 pt-4 pb-2 border-b border-neutral-100">
                <DialogTitle
                  :id="sheetTitleId"
                  class="text-lg font-semibold text-neutral-900"
                >
                  Ações em massa
                </DialogTitle>
                <p class="text-sm text-neutral-500 mt-1">
                  {{ count }} usuário{{ count === 1 ? '' : 's' }} selecionado{{
                    count === 1 ? '' : 's'
                  }}.
                  <span v-if="lideresParaLink.length > 0" class="block mt-1">
                    {{ lideresParaLink.length }} líder{{
                      lideresParaLink.length === 1 ? '' : 'es'
                    }}
                    ativo{{ lideresParaLink.length === 1 ? '' : 's' }} podem receber o link do
                    relatório.
                  </span>
                  <span v-if="pendentesPrimeiroAcesso.length > 0" class="block mt-1">
                    {{ pendentesPrimeiroAcesso.length }} pendente{{
                      pendentesPrimeiroAcesso.length === 1 ? '' : 's'
                    }}
                    (sem senha) — podem receber novo link do Aprisco.
                  </span>
                </p>
              </div>

              <div class="p-3 space-y-2 max-h-[min(70vh,520px)] overflow-y-auto overscroll-contain">
                <button
                  type="button"
                  :class="rowButtonClass('primary')"
                  :disabled="busy || busyLinks || lideresParaLink.length === 0"
                  @click="
                    () => {
                      emit('update:sheetOpen', false)
                      emit('enviarLinks')
                    }
                  "
                >
                  <span
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700"
                  >
                    <AppIcon name="email" size="sm" />
                  </span>
                  <span class="flex-1">
                    <span class="block font-semibold">Enviar link do relatório</span>
                    <span class="block text-xs font-normal text-neutral-500 mt-0.5">
                      WhatsApp com link SSO (só líderes ativos; exige célula cadastrada).
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  :class="rowButtonClass('default')"
                  :disabled="busy || busyConvites || pendentesPrimeiroAcesso.length === 0"
                  @click="
                    () => {
                      emit('update:sheetOpen', false)
                      emit('reenviarConvites')
                    }
                  "
                >
                  <span
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-800"
                  >
                    <AppIcon name="email" size="sm" />
                  </span>
                  <span class="flex-1">
                    <span class="block font-semibold">Reenviar link primeiro acesso</span>
                    <span class="block text-xs font-normal text-neutral-500 mt-0.5">
                      Convite para criar senha no Aprisco (só quem ainda não tem senha na seleção).
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  :class="rowButtonClass('default')"
                  :disabled="busy"
                  @click="
                    () => {
                      emit('update:sheetOpen', false)
                      emit('ativar')
                    }
                  "
                >
                  <span
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"
                  >
                    <AppIcon name="refresh" size="sm" />
                  </span>
                  <span class="flex-1">
                    <span class="block font-semibold">Ativar</span>
                    <span class="block text-xs font-normal text-neutral-500 mt-0.5">
                      Marca os selecionados como ativos.
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  :class="rowButtonClass('danger')"
                  :disabled="busy"
                  @click="
                    () => {
                      emit('update:sheetOpen', false)
                      emit('desativar')
                    }
                  "
                >
                  <span
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-800"
                  >
                    <AppIcon name="logout" size="sm" />
                  </span>
                  <span class="flex-1">
                    <span class="block font-semibold">Desativar</span>
                    <span class="block text-xs font-normal text-neutral-500 mt-0.5">
                      Impede login. Regras de último admin continuam valendo.
                    </span>
                  </span>
                </button>
              </div>

              <div class="px-3 pb-2 pt-1 border-t border-neutral-100">
                <button
                  type="button"
                  class="w-full py-3 text-sm font-medium text-neutral-600 min-h-[48px] touch-manipulation rounded-xl active:bg-neutral-50 sm:hover:bg-neutral-50"
                  :disabled="busy"
                  @click="closeSheet"
                >
                  Fechar
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
