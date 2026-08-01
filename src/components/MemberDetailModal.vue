<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue'
import AppIcon from './AppIcon.vue'
import type { Member } from '../stores/memberStore'
import { useUserStore } from '../stores/userStore'
import { useMemberCuidadorPicker } from '../composables/useMemberCuidadorPicker'
import { usePlatform } from '../composables/usePlatform'

interface MemberNote {
  authorId: number
  authorName: string
  timestamp: string
  content: string
}

const props = defineProps<{
  open: boolean
  member: Member | null
}>()

const emit = defineEmits<{
  close: []
  edit: [member: Member]
  delete: [member: Member]
  toggleActive: [member: Member]
  saveNotes: [payload: { memberId: string; observacoes: string }]
}>()

const userStore = useUserStore()
const { mobileShell } = usePlatform()
const {
  opcoes: cuidadorOpcoes,
  cuidadorAtualKey,
  cuidadorAtualNome: cuidadorAtualNomeFn,
  atribuir: atribuirCuidador,
  remover: removerAtribuicaoCuidador,
  salvando: cuidadorSalvando,
} = useMemberCuidadorPicker()

const newNote = ref('')
const parsedNotes = ref<MemberNote[]>([])
const showPicker = ref(false)
const selectedCuidadorKey = ref('')
const pickerError = ref<string | null>(null)

function parseObservacoes(observacoes?: string): MemberNote[] {
  if (!observacoes) return []
  try {
    const maybe = JSON.parse(observacoes)
    if (Array.isArray(maybe)) return maybe as MemberNote[]
  } catch {
    return [
      {
        authorId: 0,
        authorName: 'Sistema',
        timestamp: new Date().toISOString(),
        content: observacoes,
      },
    ]
  }
  return []
}

watch(
  () => props.member,
  (member) => {
    newNote.value = ''
    parsedNotes.value = parseObservacoes(member?.observacoes)
    showPicker.value = false
    selectedCuidadorKey.value = member ? cuidadorAtualKey(Number(member.id)) : ''
    pickerError.value = null
  },
  { immediate: true }
)

const sortedNotes = computed(() =>
  [...parsedNotes.value].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
)

const cuidadorAtualNome = computed(() => {
  if (!props.member) return null
  return cuidadorAtualNomeFn(Number(props.member.id))
})

function close() {
  emit('close')
}

function addNote() {
  if (!props.member || !newNote.value.trim()) return
  parsedNotes.value.push({
    authorId: userStore.user?.id || 0,
    authorName: userStore.user?.nome || 'Você',
    timestamp: new Date().toISOString(),
    content: newNote.value.trim(),
  })
  emit('saveNotes', {
    memberId: props.member.id,
    observacoes: JSON.stringify(parsedNotes.value),
  })
  newNote.value = ''
}

function togglePicker() {
  if (!props.member) return
  selectedCuidadorKey.value = cuidadorAtualKey(Number(props.member.id))
  showPicker.value = !showPicker.value
  pickerError.value = null
}

async function salvarCuidador() {
  if (!props.member) return
  pickerError.value = null
  try {
    if (!selectedCuidadorKey.value) {
      await removerAtribuicaoCuidador(Number(props.member.id))
    } else {
      await atribuirCuidador(Number(props.member.id), selectedCuidadorKey.value)
    }
    showPicker.value = false
  } catch (err: any) {
    pickerError.value = err?.message ?? 'Erro ao salvar'
  }
}

async function removerCuidador() {
  if (!props.member) return
  pickerError.value = null
  try {
    await removerAtribuicaoCuidador(Number(props.member.id))
    selectedCuidadorKey.value = ''
    showPicker.value = false
  } catch (err: any) {
    pickerError.value = err?.message ?? 'Erro ao remover'
  }
}

function relativeTimeFromNow(iso: string): string {
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
  const diffMs = new Date(iso).getTime() - Date.now()
  const minutes = Math.round(diffMs / 60000)
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
  const days = Math.round(hours / 24)
  return rtf.format(days, 'day')
}

const badges = computed(() => {
  if (!props.member) return [] as { label: string; cls: string }[]
  const out: { label: string; cls: string }[] = []
  if (!props.member.isActive)
    out.push({ label: 'Inativo', cls: 'bg-neutral-100 text-neutral-600' })
  if (props.member.isConsolidator)
    out.push({ label: 'Consolidador', cls: 'bg-primary-50 text-primary-700' })
  if (props.member.isCoLeader)
    out.push({ label: 'Co-líder', cls: 'bg-vibrant-50 text-vibrant-700' })
  if (props.member.isHost)
    out.push({ label: 'Anfitrião', cls: 'bg-fun-50 text-fun-700' })
  return out
})
</script>

<template>
  <TransitionRoot appear :show="open" as="template">
    <Dialog as="div" class="relative z-50" @close="close">
      <TransitionChild
        as="template"
        enter="duration-200 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-150 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden="true" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div
          class="flex min-h-full justify-center"
          :class="mobileShell ? 'items-end' : 'items-center p-4'"
        >
          <TransitionChild
            as="template"
            :enter="mobileShell ? 'duration-250 ease-out' : 'duration-300 ease-out'"
            :enter-from="mobileShell ? 'opacity-0 translate-y-8' : 'opacity-0 scale-95'"
            :enter-to="mobileShell ? 'opacity-100 translate-y-0' : 'opacity-100 scale-100'"
            :leave="mobileShell ? 'duration-200 ease-in' : 'duration-200 ease-in'"
            :leave-from="mobileShell ? 'opacity-100 translate-y-0' : 'opacity-100 scale-100'"
            :leave-to="mobileShell ? 'opacity-0 translate-y-8' : 'opacity-0 scale-95'"
          >
            <DialogPanel
              :class="[
                mobileShell
                  ? 'bottom-sheet-panel w-full max-w-lg max-h-[92dvh] overflow-y-auto'
                  : 'modal-dialog-panel w-full max-w-lg max-h-[85vh] overflow-y-auto p-6',
              ]"
            >
              <div v-if="mobileShell" class="bottom-sheet-handle" aria-hidden="true" />

              <template v-if="member">
                <div class="flex items-start gap-3">
                  <div
                    class="flex size-12 shrink-0 items-center justify-center rounded-full text-base font-semibold"
                    :class="member.isActive ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-500'"
                  >
                    {{ member.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <DialogTitle as="h3" class="truncate text-lg font-semibold text-neutral-900">
                      {{ member.name }}
                    </DialogTitle>
                    <p v-if="member.telefone" class="mt-0.5 truncate text-sm text-neutral-500">
                      {{ member.telefone }}
                    </p>
                    <div v-if="badges.length" class="mt-2 flex flex-wrap gap-1">
                      <span
                        v-for="badge in badges"
                        :key="badge.label"
                        class="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        :class="badge.cls"
                      >
                        {{ badge.label }}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    class="p-2 rounded-full text-neutral-400 hover:bg-neutral-100"
                    aria-label="Fechar"
                    @click="close"
                  >
                    <AppIcon name="close" size="sm" />
                  </button>
                </div>

                <!-- Rede de cuidado (linha sutil, estilo settings iOS) -->
                <div class="mt-5 rounded-xl border border-neutral-200/80 bg-neutral-50/60">
                  <button
                    type="button"
                    class="flex w-full items-center gap-3 px-4 py-3 text-left touch-manipulation"
                    @click="togglePicker"
                  >
                    <div class="flex size-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                      <AppIcon name="heart" size="sm" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-medium text-neutral-500">Cuidado por</p>
                      <p
                        class="mt-0.5 truncate text-sm"
                        :class="cuidadorAtualNome ? 'text-neutral-800 font-medium' : 'text-neutral-400'"
                      >
                        {{ cuidadorAtualNome ?? 'Ninguém — toque para atribuir' }}
                      </p>
                    </div>
                    <AppIcon
                      name="edit"
                      size="xs"
                      class="text-neutral-400"
                    />
                  </button>

                  <div v-if="showPicker" class="border-t border-neutral-200/80 px-4 py-3">
                    <label class="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                      Selecionar cuidador
                    </label>
                    <select
                      v-model="selectedCuidadorKey"
                      class="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Ninguém</option>
                      <option v-for="opt in cuidadorOpcoes" :key="opt.key" :value="opt.key">
                        {{ opt.nome }}
                      </option>
                    </select>
                    <p v-if="pickerError" class="mt-2 text-xs text-red-600">{{ pickerError }}</p>
                    <div class="mt-3 flex gap-2">
                      <button
                        type="button"
                        class="flex-1 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50"
                        @click="showPicker = false"
                      >
                        Cancelar
                      </button>
                      <button
                        v-if="cuidadorAtualNome"
                        type="button"
                        class="py-2 px-3 text-sm font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100"
                        :disabled="cuidadorSalvando"
                        @click="removerCuidador"
                      >
                        Remover
                      </button>
                      <button
                        type="button"
                        class="flex-1 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg"
                        :disabled="cuidadorSalvando"
                        @click="salvarCuidador"
                      >
                        <span v-if="cuidadorSalvando">Salvando...</span>
                        <span v-else>Salvar</span>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Observações -->
                <div class="mt-5">
                  <h4 class="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                    Observações
                  </h4>
                  <div class="rounded-xl border border-neutral-200 bg-white">
                    <textarea
                      v-model="newNote"
                      rows="3"
                      class="w-full p-3 text-sm outline-none border-0 rounded-xl focus:ring-0 resize-none"
                      placeholder="Adicione uma nota"
                    />
                  </div>
                  <div class="mt-2 flex justify-end">
                    <button
                      type="button"
                      class="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-500 text-white text-sm font-medium disabled:opacity-50"
                      :disabled="!newNote.trim()"
                      @click="addNote"
                    >
                      Adicionar nota
                    </button>
                  </div>

                  <div v-if="sortedNotes.length" class="mt-3 space-y-2">
                    <div
                      v-for="(note, idx) in sortedNotes"
                      :key="idx"
                      class="rounded-xl border border-neutral-100 bg-white p-3"
                    >
                      <div class="flex items-center gap-2 text-xs text-neutral-500">
                        <div class="w-6 h-6 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center font-semibold">
                          {{ note.authorName?.charAt(0) || 'U' }}
                        </div>
                        <span class="text-neutral-800 font-medium">{{ note.authorName }}</span>
                        <span class="ml-auto">{{ relativeTimeFromNow(note.timestamp) }}</span>
                      </div>
                      <p class="mt-2 text-sm text-neutral-800 whitespace-pre-line">{{ note.content }}</p>
                    </div>
                  </div>
                </div>

                <!-- Ações -->
                <div class="mt-6 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 touch-manipulation min-h-[44px]"
                    @click="emit('edit', member)"
                  >
                    <AppIcon name="edit" size="sm" />
                    Editar
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg touch-manipulation min-h-[44px]"
                    :class="member.isActive
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                      : 'bg-green-50 hover:bg-green-100 text-green-700'"
                    @click="emit('toggleActive', member)"
                  >
                    <AppIcon :name="member.isActive ? 'close' : 'check'" size="sm" />
                    {{ member.isActive ? 'Desativar' : 'Reativar' }}
                  </button>
                  <button
                    type="button"
                    class="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-red-50 hover:bg-red-100 text-red-600 touch-manipulation min-h-[44px]"
                    @click="emit('delete', member)"
                  >
                    <AppIcon name="delete" size="sm" />
                    Excluir
                  </button>
                </div>
              </template>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
