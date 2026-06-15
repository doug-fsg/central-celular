<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionRoot, TransitionChild } from '@headlessui/vue'
import AppIcon from './AppIcon.vue'
import { adminService } from '../services/adminService'
import celulaService, { type Membro, type NovoMembroInput } from '../services/celulaService'

interface MembroLinha extends Membro {
  ehLider?: boolean
}

const props = defineProps<{
  celulaId: number
  liderNome?: string
  liderId?: number
}>()

const emit = defineEmits<{
  (e: 'updated', count: number): void
}>()

const loading = ref(false)
const membros = ref<MembroLinha[]>([])
const searchTerm = ref('')
const openMenuId = ref<number | null>(null)

// Modais
const showMemberForm = ref(false)
const memberFormMode = ref<'add' | 'edit'>('add')
const editingMemberId = ref<number | null>(null)
const showMoveModal = ref(false)
const showRoleModal = ref(false)
const showDeleteConfirm = ref(false)
const actionMember = ref<MembroLinha | null>(null)
const moveTargetCellId = ref('')
const availableCells = ref<{ id: number; nome: string }[]>([])
const saving = ref(false)
const formError = ref('')

const memberForm = ref({
  nome: '',
  telefone: '',
  dataNascimento: '',
  ehConsolidador: false,
  ehCoLider: false,
  ehAnfitriao: false,
})

const AVATAR_COLORS = [
  'bg-primary-500',
  'bg-pink-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-sky-500',
  'bg-amber-500',
]

function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '?'
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

function avatarColor(nome: string) {
  let hash = 0
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function badges(m: MembroLinha) {
  const list: { key: string; label: string; class: string }[] = []
  if (m.ehLider) list.push({ key: 'lider', label: 'Líder', class: 'bg-primary-100 text-primary-800' })
  if (m.ehConsolidador) list.push({ key: 'cons', label: 'Consolid.', class: 'bg-violet-100 text-violet-800' })
  if (m.ehCoLider) list.push({ key: 'colider', label: 'Co-líder', class: 'bg-amber-100 text-amber-800' })
  if (m.ehAnfitriao) list.push({ key: 'anf', label: 'Anfitrião', class: 'bg-sky-100 text-sky-800' })
  return list
}

const linhasTabela = computed((): MembroLinha[] => {
  const rows: MembroLinha[] = []
  if (props.liderNome) {
    rows.push({
      id: props.liderId ?? -1,
      celulaId: props.celulaId,
      nome: props.liderNome,
      ehConsolidador: false,
      ehCoLider: false,
      ehAnfitriao: false,
      dataCadastro: '',
      ativo: true,
      ehLider: true,
    })
  }
  return [...rows, ...membros.value.filter((m) => !m.ehLider)]
})

const filteredMembros = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  if (!term) return linhasTabela.value
  return linhasTabela.value.filter((m) => m.nome.toLowerCase().includes(term))
})

const totalMembros = computed(() => linhasTabela.value.length)

async function loadMembers() {
  if (!props.celulaId) return
  loading.value = true
  try {
    const data = await adminService.listarMembrosCelula(props.celulaId)
    membros.value = (Array.isArray(data) ? data : []).map((m: Membro) => ({
      ...m,
      ehLider: false,
    }))
    emit('updated', membros.value.length)
  } catch (e) {
    console.error('[CellMembersPanel] erro ao carregar membros:', e)
    membros.value = []
  } finally {
    loading.value = false
  }
}

function resetMemberForm() {
  memberForm.value = {
    nome: '',
    telefone: '',
    dataNascimento: '',
    ehConsolidador: false,
    ehCoLider: false,
    ehAnfitriao: false,
  }
  formError.value = ''
}

function openAddForm() {
  resetMemberForm()
  memberFormMode.value = 'add'
  editingMemberId.value = null
  showMemberForm.value = true
}

function openEditForm(m: MembroLinha) {
  if (m.ehLider) return
  resetMemberForm()
  memberFormMode.value = 'edit'
  editingMemberId.value = m.id
  memberForm.value = {
    nome: m.nome,
    telefone: m.telefone || '',
    dataNascimento: m.dataNascimento ? formatDateBR(m.dataNascimento) : '',
    ehConsolidador: m.ehConsolidador,
    ehCoLider: m.ehCoLider,
    ehAnfitriao: m.ehAnfitriao,
  }
  showMemberForm.value = true
  closeMenu()
}

function formatDateBR(iso: string) {
  const [y, m, d] = iso.split('T')[0].split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function convertDateToISO(dateStr: string): string | undefined {
  if (!dateStr.trim()) return undefined
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return undefined
  const [, dia, mes, ano] = match
  return `${ano}-${mes}-${dia}`
}

function onDateInput(event: Event) {
  const input = event.target as HTMLInputElement
  const digits = input.value.replace(/\D/g, '')
  let formatted = digits
  if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`
  if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`
  memberForm.value.dataNascimento = formatted
}

async function saveMemberForm() {
  if (!memberForm.value.nome.trim()) {
    formError.value = 'Nome é obrigatório'
    return
  }
  saving.value = true
  formError.value = ''
  const payload: NovoMembroInput = {
    nome: memberForm.value.nome.trim(),
    telefone: memberForm.value.telefone.trim() || undefined,
    dataNascimento: convertDateToISO(memberForm.value.dataNascimento),
    ehConsolidador: memberForm.value.ehConsolidador,
    ehCoLider: memberForm.value.ehCoLider,
    ehAnfitriao: memberForm.value.ehAnfitriao,
  }
  try {
    if (memberFormMode.value === 'add') {
      await celulaService.adicionarMembro(props.celulaId, payload)
    } else if (editingMemberId.value) {
      await celulaService.atualizarMembro(props.celulaId, editingMemberId.value, payload)
    }
    showMemberForm.value = false
    await loadMembers()
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : 'Erro ao salvar membro'
  } finally {
    saving.value = false
  }
}

function openMoveModal(m?: MembroLinha) {
  const target = m ?? actionMember.value
  if (!target || target.ehLider) return
  actionMember.value = target
  moveTargetCellId.value = ''
  showMoveModal.value = true
  closeMenu()
  loadCellsForMove()
}

function openRoleModal(m?: MembroLinha) {
  const target = m ?? actionMember.value
  if (!target || target.ehLider) return
  actionMember.value = target
  memberForm.value = {
    nome: target.nome,
    telefone: target.telefone || '',
    dataNascimento: '',
    ehConsolidador: target.ehConsolidador,
    ehCoLider: target.ehCoLider,
    ehAnfitriao: target.ehAnfitriao,
  }
  showRoleModal.value = true
  closeMenu()
}

function openDeleteConfirm(m?: MembroLinha) {
  const target = m ?? actionMember.value
  if (!target || target.ehLider) return
  actionMember.value = target
  showDeleteConfirm.value = true
  closeMenu()
}

async function loadCellsForMove() {
  try {
    const res = await adminService.listarCelulas(1, 500)
    availableCells.value = (res.celulas || [])
      .filter((c) => c.id !== props.celulaId)
      .map((c) => ({ id: c.id, nome: c.nome }))
  } catch {
    availableCells.value = []
  }
}

async function confirmMove() {
  if (!actionMember.value || !moveTargetCellId.value) return
  saving.value = true
  try {
    await celulaService.moverMembro(
      props.celulaId,
      actionMember.value.id,
      Number(moveTargetCellId.value),
    )
    showMoveModal.value = false
    actionMember.value = null
    await loadMembers()
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : 'Erro ao mover membro'
  } finally {
    saving.value = false
  }
}

async function saveRoles() {
  if (!actionMember.value) return
  saving.value = true
  try {
    const m = actionMember.value
    await celulaService.atualizarMembro(props.celulaId, m.id, {
      nome: m.nome,
      telefone: m.telefone,
      dataNascimento: m.dataNascimento,
      ehConsolidador: memberForm.value.ehConsolidador,
      ehCoLider: memberForm.value.ehCoLider,
      ehAnfitriao: memberForm.value.ehAnfitriao,
    })
    showRoleModal.value = false
    actionMember.value = null
    await loadMembers()
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : 'Erro ao atualizar papéis'
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  if (!actionMember.value) return
  saving.value = true
  try {
    await celulaService.removerMembro(props.celulaId, actionMember.value.id)
    showDeleteConfirm.value = false
    actionMember.value = null
    await loadMembers()
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : 'Erro ao remover membro'
  } finally {
    saving.value = false
  }
}

function toggleMenu(id: number, e: Event) {
  e.stopPropagation()
  openMenuId.value = openMenuId.value === id ? null : id
}

function closeMenu() {
  openMenuId.value = null
}

function selectForAction(m: MembroLinha) {
  if (m.ehLider) return
  actionMember.value = m
}

function handleDocClick() {
  closeMenu()
}

watch(
  () => props.celulaId,
  () => {
    if (props.celulaId) loadMembers()
  },
)

onMounted(() => {
  if (props.celulaId) loadMembers()
  document.addEventListener('click', handleDocClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocClick)
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col border-t border-gray-200 lg:min-h-[28rem] lg:border-t-0 lg:border-l lg:border-gray-200 bg-gray-50/40">
    <!-- Cabeçalho -->
    <div class="shrink-0 border-b border-gray-100 bg-white px-4 py-3 sm:px-5">
      <div class="flex items-center gap-2 mb-3">
        <h4 class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Membros da célula
        </h4>
        <span class="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700 tabular-nums">
          {{ totalMembros }} {{ totalMembros === 1 ? 'membro' : 'membros' }}
        </span>
      </div>
      <div class="flex gap-2">
        <div class="relative flex-1 min-w-0">
          <AppIcon name="search" size="sm" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            v-model="searchTerm"
            type="search"
            placeholder="Buscar membro…"
            class="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          />
        </div>
        <button
          type="button"
          class="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary-500 bg-white px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          @click="openAddForm"
        >
          <AppIcon name="add" size="sm" />
          <span class="hidden sm:inline">Adicionar membro</span>
          <span class="sm:hidden">Adicionar</span>
        </button>
      </div>
    </div>

    <!-- Lista -->
    <div class="flex-1 overflow-y-auto overscroll-contain min-h-0 px-4 py-3 sm:px-5">
      <div v-if="loading" class="py-8 text-center text-sm text-gray-500">Carregando membros…</div>
      <div v-else-if="filteredMembros.length === 0" class="py-8 text-center text-sm text-gray-500">
        {{ searchTerm ? 'Nenhum membro encontrado' : 'Nenhum membro cadastrado' }}
      </div>
      <ul v-else class="space-y-1.5">
        <li
          v-for="m in filteredMembros"
          :key="m.ehLider ? 'lider' : m.id"
          class="flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors"
          :class="[
            m.ehLider
              ? 'border-primary-100 bg-primary-50/60'
              : actionMember?.id === m.id
                ? 'border-primary-200 bg-primary-50/40'
                : 'border-gray-100 bg-white hover:border-gray-200',
          ]"
          @click="selectForAction(m)"
        >
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
            :class="m.ehLider ? 'bg-primary-600' : avatarColor(m.nome)"
          >
            {{ iniciais(m.nome) }}
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-gray-900">{{ m.nome }}</p>
            <div v-if="badges(m).length" class="mt-1 flex flex-wrap gap-1">
              <span
                v-for="b in badges(m)"
                :key="b.key"
                class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none"
                :class="b.class"
              >
                {{ b.label }}
              </span>
            </div>
          </div>
          <div v-if="!m.ehLider" class="relative shrink-0" @click.stop>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Mais ações"
              @click="toggleMenu(m.id, $event)"
            >
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
            <div
              v-if="openMenuId === m.id"
              class="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
              @click.stop
            >
              <button type="button" class="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" @click="openEditForm(m)">
                Editar membro
              </button>
              <button type="button" class="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" @click="openRoleModal(m)">
                Definir papel
              </button>
              <button type="button" class="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" @click="openMoveModal(m)">
                Mover para outra célula
              </button>
              <button type="button" class="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50" @click="openDeleteConfirm(m)">
                Remover membro
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <!-- Ações rápidas -->
    <div class="shrink-0 border-t border-gray-100 bg-white px-4 py-3 sm:px-5">
      <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Ações</p>
      <div class="grid grid-cols-4 gap-2">
        <button
          type="button"
          class="flex flex-col items-center gap-1 rounded-lg border border-gray-200 bg-white p-2 text-[10px] font-medium text-gray-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
          title="Adicionar membro"
          @click="openAddForm"
        >
          <AppIcon name="add" size="sm" />
          Adicionar membro
        </button>
        <button
          type="button"
          class="flex flex-col items-center gap-1 rounded-lg border border-gray-200 bg-white p-2 text-[10px] font-medium text-gray-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-40"
          title="Mover para outra célula"
          :disabled="!actionMember"
          @click="openMoveModal()"
        >
          <AppIcon name="refresh" size="sm" />
          Mover para outra célula
        </button>
        <button
          type="button"
          class="flex flex-col items-center gap-1 rounded-lg border border-gray-200 bg-white p-2 text-[10px] font-medium text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-40"
          title="Remover membro"
          :disabled="!actionMember"
          @click="openDeleteConfirm()"
        >
          <AppIcon name="delete" size="sm" />
          Remover membro
        </button>
        <button
          type="button"
          class="flex flex-col items-center gap-1 rounded-lg border border-gray-200 bg-white p-2 text-[10px] font-medium text-gray-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 disabled:opacity-40"
          title="Definir papel"
          :disabled="!actionMember"
          @click="openRoleModal()"
        >
          <AppIcon name="settings" size="sm" />
          Definir papel
        </button>
      </div>
      <p class="mt-2 flex items-center gap-1 text-[11px] text-gray-400">
        <AppIcon name="info" size="xs" />
        Clique nos três pontos ao lado do membro para mais ações.
      </p>
    </div>
  </div>

  <!-- Modal: adicionar / editar membro -->
  <TransitionRoot appear :show="showMemberForm" as="template">
    <Dialog as="div" class="relative z-[60]" @close="showMemberForm = false">
      <TransitionChild as="template" enter="duration-200 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-150 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/30" />
      </TransitionChild>
      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-200 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-150 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="modal-dialog-panel w-full max-w-md p-5">
              <DialogTitle class="text-base font-semibold text-gray-900">
                {{ memberFormMode === 'add' ? 'Adicionar membro' : 'Editar membro' }}
              </DialogTitle>
              <div class="mt-4 space-y-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700">Nome <span class="text-red-500">*</span></label>
                  <input v-model="memberForm.nome" type="text" class="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">Telefone</label>
                  <input v-model="memberForm.telefone" type="tel" class="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700">Data de nascimento</label>
                  <input
                    :value="memberForm.dataNascimento"
                    type="text"
                    inputmode="numeric"
                    placeholder="DD/MM/AAAA"
                    maxlength="10"
                    class="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    @input="onDateInput"
                  />
                </div>
                <div class="flex flex-wrap gap-3 pt-1">
                  <label class="flex items-center gap-2 text-sm text-gray-700">
                    <input v-model="memberForm.ehConsolidador" type="checkbox" class="rounded border-gray-300 text-primary-600" />
                    Consolidador
                  </label>
                  <label class="flex items-center gap-2 text-sm text-gray-700">
                    <input v-model="memberForm.ehCoLider" type="checkbox" class="rounded border-gray-300 text-primary-600" />
                    Co-líder
                  </label>
                  <label class="flex items-center gap-2 text-sm text-gray-700">
                    <input v-model="memberForm.ehAnfitriao" type="checkbox" class="rounded border-gray-300 text-primary-600" />
                    Anfitrião
                  </label>
                </div>
                <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
                <div class="flex gap-2 pt-2">
                  <button type="button" class="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" @click="showMemberForm = false">
                    Cancelar
                  </button>
                  <button type="button" class="flex-1 rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50" :disabled="saving" @click="saveMemberForm">
                    {{ saving ? 'Salvando…' : 'Salvar' }}
                  </button>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>

  <!-- Modal: mover -->
  <TransitionRoot appear :show="showMoveModal" as="template">
    <Dialog as="div" class="relative z-[60]" @close="showMoveModal = false">
      <TransitionChild as="template" enter="duration-200 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-150 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/30" />
      </TransitionChild>
      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-200 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-150 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="modal-dialog-panel w-full max-w-sm p-5">
              <DialogTitle class="text-base font-semibold text-gray-900">Mover membro</DialogTitle>
              <p v-if="actionMember" class="mt-1 text-sm text-gray-600 truncate">{{ actionMember.nome }}</p>
              <div class="mt-4">
                <label class="block text-sm font-medium text-gray-700">Célula de destino</label>
                <select v-model="moveTargetCellId" class="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                  <option value="" disabled>Selecione a célula</option>
                  <option v-for="c in availableCells" :key="c.id" :value="String(c.id)">{{ c.nome }}</option>
                </select>
              </div>
              <p v-if="formError" class="mt-2 text-sm text-red-600">{{ formError }}</p>
              <div class="mt-4 flex gap-2">
                <button type="button" class="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" @click="showMoveModal = false">
                  Cancelar
                </button>
                <button type="button" class="flex-1 rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50" :disabled="saving || !moveTargetCellId" @click="confirmMove">
                  {{ saving ? 'Movendo…' : 'Mover' }}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>

  <!-- Modal: definir papel -->
  <TransitionRoot appear :show="showRoleModal" as="template">
    <Dialog as="div" class="relative z-[60]" @close="showRoleModal = false">
      <TransitionChild as="template" enter="duration-200 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-150 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/30" />
      </TransitionChild>
      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-200 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-150 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="modal-dialog-panel w-full max-w-sm p-5">
              <DialogTitle class="text-base font-semibold text-gray-900">Definir papel</DialogTitle>
              <p v-if="actionMember" class="mt-1 text-sm text-gray-600 truncate">{{ actionMember.nome }}</p>
              <div class="mt-4 space-y-2">
                <label class="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm" :class="memberForm.ehConsolidador ? 'border-violet-300 bg-violet-50' : ''">
                  <input v-model="memberForm.ehConsolidador" type="checkbox" class="rounded border-gray-300 text-primary-600" />
                  Consolidador
                </label>
                <label class="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm" :class="memberForm.ehCoLider ? 'border-amber-300 bg-amber-50' : ''">
                  <input v-model="memberForm.ehCoLider" type="checkbox" class="rounded border-gray-300 text-primary-600" />
                  Co-líder
                </label>
                <label class="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm" :class="memberForm.ehAnfitriao ? 'border-sky-300 bg-sky-50' : ''">
                  <input v-model="memberForm.ehAnfitriao" type="checkbox" class="rounded border-gray-300 text-primary-600" />
                  Anfitrião
                </label>
              </div>
              <div class="mt-4 flex gap-2">
                <button type="button" class="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" @click="showRoleModal = false">
                  Cancelar
                </button>
                <button type="button" class="flex-1 rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50" :disabled="saving" @click="saveRoles">
                  {{ saving ? 'Salvando…' : 'Salvar' }}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>

  <!-- Modal: confirmar exclusão -->
  <TransitionRoot appear :show="showDeleteConfirm" as="template">
    <Dialog as="div" class="relative z-[60]" @close="showDeleteConfirm = false">
      <TransitionChild as="template" enter="duration-200 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-150 ease-in" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-black/30" />
      </TransitionChild>
      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-200 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-150 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="modal-dialog-panel w-full max-w-sm p-5">
              <DialogTitle class="text-base font-semibold text-gray-900">Remover membro</DialogTitle>
              <p class="mt-2 text-sm text-gray-600">
                Tem certeza que deseja remover <strong>{{ actionMember?.nome }}</strong> desta célula? Esta ação não pode ser desfeita.
              </p>
              <div class="mt-4 flex gap-2">
                <button type="button" class="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" @click="showDeleteConfirm = false">
                  Cancelar
                </button>
                <button type="button" class="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50" :disabled="saving" @click="confirmDelete">
                  {{ saving ? 'Removendo…' : 'Remover' }}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
