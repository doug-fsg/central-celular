<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { useUserStore } from '../stores/userStore'

export interface MemberLite {
  id: string
  name: string
  observacoes?: string
}

interface MemberNote {
  authorId: number
  authorName: string
  timestamp: string // ISO string
  content: string
}

const props = defineProps<{
  isOpen: boolean
  member: MemberLite | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', payload: { memberId: string, observacoes: string }): void
}>()

const userStore = useUserStore()
const newNote = ref('')
const parsedNotes = ref<MemberNote[]>([])

function parseObservacoes(observacoes?: string): MemberNote[] {
  if (!observacoes) return []
  try {
    const maybe = JSON.parse(observacoes)
    if (Array.isArray(maybe)) {
      return maybe as MemberNote[]
    }
  } catch (_) {
    // Conteúdo legado (texto simples) vira primeira nota
    return [
      {
        authorId: 0,
        authorName: 'Sistema',
        timestamp: new Date().toISOString(),
        content: observacoes
      }
    ]
  }
  return []
}

watch(
  () => props.member,
  (member) => {
    newNote.value = ''
    parsedNotes.value = parseObservacoes(member?.observacoes)
  },
  { immediate: true }
)

const sortedNotes = computed(() =>
  [...parsedNotes.value].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
)

function close() {
  emit('close')
}

function addNote() {
  if (!props.member || !newNote.value.trim()) return
  parsedNotes.value.push({
    authorId: userStore.user?.id || 0,
    authorName: userStore.user?.nome || 'Você',
    timestamp: new Date().toISOString(),
    content: newNote.value.trim()
  })
  const observacoes = JSON.stringify(parsedNotes.value)
  emit('save', { memberId: props.member.id, observacoes })
  newNote.value = ''
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
</script>

<template>
  <div v-if="isOpen && member" class="fixed inset-0 z-50">
    <div class="absolute inset-0 bg-black/40" @click="close" />
    <div class="absolute inset-0 p-4 md:p-8 overflow-y-auto">
      <div class="mx-auto max-w-2xl rounded-2xl bg-white shadow-xl">
        <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <div>
            <h3 class="text-base font-semibold text-neutral-800">Observações</h3>
            <p class="text-xs text-neutral-500 mt-0.5">{{ member.name }}</p>
          </div>
          <button class="btn btn-icon btn-xs" @click="close">
            <AppIcon name="close" size="xs" />
          </button>
        </div>

        <div class="p-4">
          <!-- Editor simples -->
          <div class="bg-white border border-neutral-200 rounded-xl overflow-hidden">
            <textarea
              v-model="newNote"
              rows="4"
              class="w-full p-3 text-sm outline-none border-0 focus:ring-0"
              placeholder="Adicione uma nota"
            />
          </div>

          <div class="flex justify-end mt-3">
            <button @click="addNote" class="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-500 text-white text-sm font-medium">
              Adicionar
            </button>
          </div>

          <!-- Lista de notas -->
          <div v-if="sortedNotes.length" class="mt-4 space-y-3">
            <div v-for="(note, idx) in sortedNotes" :key="idx" class="border border-neutral-100 rounded-xl p-3">
              <div class="flex items-center gap-2 text-xs text-neutral-500">
                <div class="w-6 h-6 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center font-semibold">
                  {{ note.authorName?.charAt(0) || 'U' }}
                </div>
                <span class="text-neutral-800 font-medium">{{ note.authorName }}</span>
                <span>adicionou uma anotação</span>
                <span class="ml-auto">{{ relativeTimeFromNow(note.timestamp) }}</span>
              </div>
              <p class="mt-2 text-sm text-neutral-800 whitespace-pre-line">{{ note.content }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn { @apply inline-flex items-center justify-center rounded-md transition-colors; }
.btn-icon { @apply bg-white hover:bg-neutral-100 border border-neutral-300; }
</style>


