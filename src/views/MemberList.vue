<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMemberStore, type Member } from '../stores/memberStore'
import { useUserStore } from '../stores/userStore'
import { useRedeCuidadoStore } from '../stores/redeCuidadoStore'
import AppIcon from '../components/AppIcon.vue'
import MemberDetailModal from '../components/MemberDetailModal.vue'
import MobilePageHeader from '../components/MobilePageHeader.vue'
import MobileStickyActionBar from '../components/MobileStickyActionBar.vue'
import { usePlatform } from '../composables/usePlatform'
import { useHaptic } from '../composables/useHaptic'
import { Dialog, DialogPanel, DialogTitle, TransitionRoot, TransitionChild } from '@headlessui/vue'

const router = useRouter()
const memberStore = useMemberStore()
const userStore = useUserStore()
const redeCuidadoStore = useRedeCuidadoStore()
const { mobileShell } = usePlatform()
const { tap } = useHaptic()
const showAddForm = ref(false)
const activeTab = ref('all')
const searchQuery = ref('')
const showDetailModal = ref(false)
const selectedMember = ref<Member | null>(null)

const filterChips = [
  { key: 'all', label: 'Todos' },
  { key: 'consolidators', label: 'Consolidadores' },
  { key: 'birthdays', label: 'Aniversários' },
] as const

const pageSubtitle = computed(() =>
  `${memberStore.getAllMembers.length} membro(s) cadastrado(s)`
)

function handleAddMember() {
  tap()
  toggleAddForm()
}

// Verifica se tem uma célula selecionada
const hasCelula = computed(() => !!memberStore.celulaId)

// Estatísticas da célula
const stats = computed(() => {
  const allMembers = memberStore.getAllMembers;
  const activeMembers = allMembers.filter(m => m.isActive);
  return {
    total: allMembers.length,
    active: activeMembers.length,
    consolidators: activeMembers.filter(m => m.isConsolidator).length,
    coLeaders: activeMembers.filter(m => m.isCoLeader).length,
    hosts: activeMembers.filter(m => m.isHost).length,
    birthdays: birthdayMembers.value.length
  }
})

// Carregar membros quando o componente for montado
onMounted(async () => {
  await memberStore.carregarMembros()
  if (memberStore.celulaId) {
    redeCuidadoStore.carregarRede(memberStore.celulaId)
  }
  
  // Registrar informações para depuração
  console.log('Usuário logado:', userStore.isLoggedIn)
  console.log('Usuário é líder:', userStore.user?.cargo)
  console.log('Célula selecionada:', memberStore.celulaId)
})

// Lógica de abas
const setActiveTab = (tab: string) => {
  activeTab.value = tab
}

const birthdayMembers = computed(() => {
  const currentMonth = new Date().getMonth() + 1
  return memberStore.getAllMembers.filter(member => {
    if (!member.dataNascimento) return false
    const birthMonth = new Date(member.dataNascimento).getMonth() + 1
    return birthMonth === currentMonth && member.isActive
  }).sort((a, b) => {
    const dayA = new Date(a.dataNascimento as string).getDate()
    const dayB = new Date(b.dataNascimento as string).getDate()
    return dayA - dayB
  })
})

const consolidators = computed(() => {
  return memberStore.getAllMembers.filter(member => member.isConsolidator && member.isActive)
})

const coLeaders = computed(() => {
  return memberStore.getAllMembers.filter(member => member.isCoLeader && member.isActive)
})

const hosts = computed(() => {
  return memberStore.getAllMembers.filter(member => member.isHost && member.isActive)
})

const displayedMembers = computed(() => {
  switch (activeTab.value) {
    case 'birthdays':
      return birthdayMembers.value
    case 'consolidators':
      return consolidators.value
    case 'coleaders':
      return coLeaders.value
    case 'hosts':
      return hosts.value
    default:
      return memberStore.getAllMembers
  }
})

const filteredMembers = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return displayedMembers.value
  return displayedMembers.value.filter((m) =>
    m.name.toLowerCase().includes(q) ||
    (m.telefone?.includes(q) ?? false)
  )
})

function openMemberDetail(member: Member) {
  tap()
  selectedMember.value = member
  showDetailModal.value = true
}

function closeMemberDetail() {
  showDetailModal.value = false
  selectedMember.value = null
}

function handleDetailEdit(member: Member) {
  showDetailModal.value = false
  startEditing(member)
}

function handleDetailDelete(member: Member) {
  showDetailModal.value = false
  confirmDelete(member)
}

function handleDetailToggle(member: Member) {
  memberStore.toggleMemberActive(member.id)
}

function handleDetailSaveNotes(payload: { memberId: string; observacoes: string }) {
  memberStore.updateMember(payload.memberId, { observacoes: payload.observacoes })
  const current = selectedMember.value
  if (current && current.id === payload.memberId) {
    selectedMember.value = { ...current, observacoes: payload.observacoes }
  }
}

// removido addMember antigo (não utilizado)

function toggleAddForm() {
  if (!hasCelula.value) {
    alert('Erro: Nenhuma célula selecionada. Você precisa ser líder de uma célula ativa para cadastrar membros.');
    return;
  }
  
  if (!showAddForm.value) {
    form.value = createEmptyForm()
  }
  
  showAddForm.value = !showAddForm.value
}

const editingMember = ref<string | null>(null)
const editForm = ref({
  name: '',
  dataNascimento: '',
  isConsolidator: false,
  isCoLeader: false,
  isHost: false,
  observacoes: ''
})

// Funções de formatação de data
function formatDateForInput(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const datePart = dateStr.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return datePart;
    }
    const [day, month, year] = datePart.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } catch (error) {
    console.error('Erro ao formatar data para input:', dateStr, error);
    return '';
  }
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    // Pegar apenas a parte da data (YYYY-MM-DD)
    const datePart = dateStr.split('T')[0];
    // Extrair ano, mês e dia
    const [, month, day] = datePart.split('-');
    // Retornar no formato DD/MM
    return `${day}/${month}`;
  } catch (error) {
    console.error('Erro ao formatar data:', dateStr, error);
    return '';
  }
}

function getBirthdayDay(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).getDate().toString().padStart(2, '0');
  } catch (error) {
    console.error('Erro ao obter dia do aniversário:', dateStr, error);
    return '';
  }
}

function startEditing(member: Member) {
  console.log('[MemberList] Iniciando edição do membro:', member);
  console.log('[MemberList] Data de nascimento original:', {
    valor: member.dataNascimento,
    tipo: typeof member.dataNascimento
  });
  
  const dataFormatada = formatDateForInput(member.dataNascimento);
  console.log('[MemberList] Data formatada para input:', dataFormatada);
  
  editingMember.value = member.id
  editForm.value = {
    name: member.name,
    dataNascimento: dataFormatada,
    isConsolidator: member.isConsolidator,
    isCoLeader: member.isCoLeader,
    isHost: member.isHost,
    observacoes: member.observacoes || ''
  }
  
  console.log('[MemberList] Formulário de edição:', editForm.value);
}

async function saveEdit() {
  if (editingMember.value && editForm.value.name.trim()) {
    await memberStore.updateMember(editingMember.value, {
      name: editForm.value.name,
      dataNascimento: editForm.value.dataNascimento || undefined,
      isConsolidator: editForm.value.isConsolidator,
      isCoLeader: editForm.value.isCoLeader,
      isHost: editForm.value.isHost,
      observacoes: editForm.value.observacoes
    })
    
    await memberStore.carregarMembros()
    cancelEdit()
  }
}

function cancelEdit() {
  editingMember.value = null
}

const showDeleteModal = ref(false)
const memberToDelete = ref<Member | null>(null)

function confirmDelete(member: Member) {
  memberToDelete.value = member
  showDeleteModal.value = true
}

async function handleDelete() {
  if (memberToDelete.value) {
    await memberStore.deleteMember(memberToDelete.value.id)
    showDeleteModal.value = false
    memberToDelete.value = null
  }
}

function cancelDelete() {
  showDeleteModal.value = false
  memberToDelete.value = null
}

function getAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

const createEmptyForm = () => ({
  name: '',
  dataNascimento: '',
  isConsolidator: false,
  isCoLeader: false,
  isHost: false,
  isActive: true
})

const form = ref(createEmptyForm())

// Máscara de data DD/MM/AAAA
const formatDateInput = (value: string) => {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`
}

const onDateInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  const formatted = formatDateInput(input.value)
  form.value.dataNascimento = formatted
}

// Converter DD/MM/AAAA para AAAA-MM-DD antes de salvar
const convertDateToISO = (dateStr: string): string | undefined => {
  if (!dateStr.trim()) return undefined
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
  const match = dateStr.match(dateRegex)
  if (!match) return undefined
  const [, dia, mes, ano] = match
  return `${ano}-${mes}-${dia}`
}

async function handleSubmit() {
  try {
    await memberStore.addMember({
      ...form.value,
      dataNascimento: convertDateToISO(form.value.dataNascimento),
      isActive: true
    })
    await memberStore.carregarMembros()
    toggleAddForm()
  } catch (error) {
    console.error('Erro ao adicionar membro:', error)
  }
}
</script>

<template>
  <div
    class="min-h-screen bg-neutral-50"
    :class="{ 'mobile-page': mobileShell, 'pb-28 sm:pb-0': mobileShell }"
  >
    <MobilePageHeader
      v-if="mobileShell"
      title="Minha Célula"
      :subtitle="pageSubtitle"
    />

    <main
      class="container-layout"
      :class="{ 'mobile-page__content': mobileShell }"
    >
      
      <!-- Cabeçalho da Página (desktop) -->
      <div v-if="!mobileShell" class="flex flex-col md:flex-row md:items-center md:justify-between mb-5">
        <div>
          <h1 class="text-xl font-bold text-neutral-800">Minha Célula</h1>
          <p class="mt-1 text-xs text-neutral-500">
            {{ memberStore.getAllMembers.length }} membro(s) cadastrado(s)
          </p>
        </div>
        <div class="flex items-center gap-2 mt-3 md:mt-0">
          <button
            @click="router.push({ name: 'rede-cuidado' })"
            class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-300 transition-colors flex-shrink-0"
            title="Rede de cuidado"
          >
            <AppIcon name="heart" size="sm" class="mr-1.5" />
            <span>Rede de cuidado</span>
            <span
              v-if="redeCuidadoStore.rede && redeCuidadoStore.rede.stats.totalSemCuidador > 0"
              class="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-amber-500 rounded-full"
            >
              {{ redeCuidadoStore.rede.stats.totalSemCuidador }}
            </span>
          </button>
          <button 
            @click="toggleAddForm"
            class="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-md hover:shadow-lg flex items-center gap-2 transform hover:scale-105 active:scale-95 transition-all duration-200 flex-shrink-0"
          >
            <AppIcon name="add" size="sm" />
            <span class="text-sm font-medium">Adicionar Membro</span>
          </button>
        </div>
      </div>
      
      <!-- Busca (mobile-first) -->
      <div class="mb-4">
        <div class="relative">
          <AppIcon name="search" size="sm" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Buscar membro..."
            class="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-10 pr-4 text-base text-neutral-900 shadow-sm placeholder:text-neutral-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>
      </div>

      <!-- Alerta rede de cuidado (mobile) -->
      <button
        v-if="mobileShell && redeCuidadoStore.rede && redeCuidadoStore.rede.stats.totalSemCuidador > 0"
        type="button"
        class="mb-4 flex w-full touch-manipulation items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left active:scale-[0.99]"
        @click="router.push({ name: 'rede-cuidado' })"
      >
        <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <AppIcon name="heart" size="sm" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-amber-900">
            {{ redeCuidadoStore.rede.stats.totalSemCuidador }} sem cuidador
          </p>
          <p class="text-xs text-amber-700">Toque para organizar a rede de cuidado</p>
        </div>
      </button>
      
      <!-- Resumo Estatístico (desktop) -->
      <div class="mb-6 hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div class="card p-3 flex flex-col items-center justify-center">
          <span class="text-xl font-bold text-neutral-800">{{ stats.active }}</span>
          <span class="text-xs text-neutral-500 mt-1">Membros Ativos</span>
        </div>
        <div class="card p-3 flex flex-col items-center justify-center bg-primary-50">
          <span class="text-xl font-bold text-primary-700">{{ stats.consolidators }}</span>
          <span class="text-xs text-primary-600 mt-1">Consolidadores</span>
        </div>
        <div class="card p-3 flex flex-col items-center justify-center bg-vibrant-50">
          <span class="text-xl font-bold text-vibrant-700">{{ stats.coLeaders }}</span>
          <span class="text-xs text-vibrant-600 mt-1">Co-líderes</span>
        </div>
        <div class="card p-3 flex flex-col items-center justify-center bg-neutral-50">
          <span class="text-xl font-bold text-neutral-800">{{ stats.birthdays }}</span>
          <span class="text-xs text-neutral-500 mt-1">Aniversariantes</span>
        </div>
      </div>
      
      <!-- Modal de Adicionar Membro -->
      <TransitionRoot appear :show="showAddForm" as="template">
        <Dialog as="div" @close="toggleAddForm" class="relative z-10">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0"
            enter-to="opacity-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100"
            leave-to="opacity-0"
          >
            <div class="fixed inset-0 bg-black bg-opacity-25" />
          </TransitionChild>

          <div class="fixed inset-0 overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as="template"
                enter="duration-300 ease-out"
                enter-from="opacity-0 scale-95"
                enter-to="opacity-100 scale-100"
                leave="duration-200 ease-in"
                leave-from="opacity-100 scale-100"
                leave-to="opacity-0 scale-95"
              >
                <DialogPanel class="modal-dialog-panel max-w-sm p-6 text-left align-middle">
                  <DialogTitle as="h3" class="text-xl font-semibold text-neutral-900 text-center">
                    Adicionar membro
                  </DialogTitle>
                  <p class="text-sm text-neutral-500 text-center mt-1 mb-6">
                    Complete os dados abaixo para cadastrar rapidamente.
                  </p>

                  <form @submit.prevent="handleSubmit" class="space-y-5">
                    <div>
                      <label for="name" class="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">Nome *</label>
                      <input
                        type="text"
                        id="name"
                        v-model="form.name"
                        required
                        placeholder="Nome completo"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      />
                    </div>

                    <div>
                      <label for="dataNascimento" class="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                        Data de nascimento <span class="text-neutral-400 lowercase">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        id="dataNascimento"
                        :value="form.dataNascimento"
                        @input="onDateInput"
                        placeholder="DD/MM/AAAA"
                        maxlength="10"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      />
                    </div>

                      <div class="space-y-2">
                      <span class="block text-xs font-medium text-neutral-500 uppercase tracking-wide">Funções</span>
                      <div class="grid grid-cols-3 gap-2 pt-1">
                        <label
                          class="flex flex-col items-center justify-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium cursor-pointer transition-all hover:bg-gray-50"
                          :class="form.isConsolidator ? 'bg-primary-50 border-primary-500 text-primary-700' : 'text-neutral-600'"
                        >
                          <input type="checkbox" v-model="form.isConsolidator" class="sr-only" />
                          <span>Consol.</span>
                        </label>
                        <label
                          class="flex flex-col items-center justify-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium cursor-pointer transition-all hover:bg-gray-50"
                          :class="form.isCoLeader ? 'bg-vibrant-50 border-vibrant-500 text-vibrant-700' : 'text-neutral-600'"
                        >
                          <input type="checkbox" v-model="form.isCoLeader" class="sr-only" />
                          <span>Co-líder</span>
                        </label>
                        <label
                          class="flex flex-col items-center justify-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium cursor-pointer transition-all hover:bg-gray-50"
                          :class="form.isHost ? 'bg-fun-50 border-fun-500 text-fun-700' : 'text-neutral-600'"
                        >
                          <input type="checkbox" v-model="form.isHost" class="sr-only" />
                          <span>Anfitrião</span>
                        </label>
                      </div>
                    </div>

                    <div class="flex items-center justify-end gap-3 pt-4">
                      <button
                        type="button"
                        @click="toggleAddForm"
                        class="px-4 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-700 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        class="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                      >
                        Adicionar membro
                      </button>
                    </div>
                  </form>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </TransitionRoot>
      
      <!-- Lista de membros -->
      <div>
        <!-- Filtros em chips -->
        <div class="mb-4 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          <button
            v-for="chip in filterChips"
            :key="chip.key"
            type="button"
            class="shrink-0 touch-manipulation rounded-full px-4 py-2 text-sm font-medium transition-colors"
            :class="
              activeTab === chip.key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-neutral-600 border border-neutral-200'
            "
            @click="setActiveTab(chip.key)"
          >
            {{ chip.label }}
            <span
              v-if="chip.key === 'birthdays' && stats.birthdays > 0"
              class="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-white/20 px-1 text-xs"
              :class="activeTab === chip.key ? '' : 'bg-fun-100 text-fun-700'"
            >
              {{ stats.birthdays }}
            </span>
          </button>
        </div>
        
        <!-- Conteúdo -->
        <div>
          <!-- Loading, Error, Empty States -->
          <div v-if="memberStore.loading" class="text-center py-8">
              <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500 mx-auto"></div>
              <p class="mt-4 text-sm text-neutral-600">Carregando membros...</p>
          </div>
          <div v-else-if="memberStore.error" class="mb-6 bg-red-50 border border-red-100 p-4 rounded-lg">
              <h3 class="text-base font-medium text-red-800">Ocorreu um erro</h3>
              <p class="text-sm text-red-700 mt-1">{{ memberStore.error }}</p>
          </div>
          <div v-else-if="filteredMembers.length === 0" class="text-center py-12">
              <AppIcon name="users" class="mx-auto h-12 w-12 text-neutral-300" />
              <h3 class="mt-3 text-base font-medium text-neutral-800">Nenhum membro encontrado</h3>
              <p class="mt-1 text-xs text-neutral-500 max-w-md mx-auto">
                {{ searchQuery ? 'Tente outro termo de busca.' : 'Não há membros nesta visualização.' }}
              </p>
              <button v-if="activeTab !== 'all' && !searchQuery" @click="setActiveTab('all')" class="mt-3 btn btn-xs btn-outline">
                Ver todos os membros
              </button>
          </div>

          <!-- Lista estilo app -->
          <ul v-else class="flex flex-col gap-2">
            <li v-for="member in filteredMembers" :key="member.id">
              <button
                type="button"
                class="flex w-full touch-manipulation items-center gap-3 rounded-xl border border-neutral-200/80 bg-white p-3 text-left shadow-sm active:scale-[0.99] transition-transform"
                :class="{ 'opacity-60': !member.isActive }"
                @click="openMemberDetail(member)"
              >
                <!-- Avatar / aniversário -->
                <div
                  v-if="activeTab === 'birthdays' && member.dataNascimento"
                  class="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-fun-100 text-fun-700"
                >
                  <span class="text-lg font-bold leading-none">{{ getBirthdayDay(member.dataNascimento) }}</span>
                  <span class="text-[10px] uppercase">{{ new Date(member.dataNascimento as string).toLocaleString('default', { month: 'short' }) }}</span>
                </div>
                <div
                  v-else
                  class="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                  :class="member.isActive ? 'bg-primary-100 text-primary-700' : 'bg-neutral-100 text-neutral-500'"
                >
                  {{ member.name.charAt(0).toUpperCase() }}
                </div>

                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold text-neutral-900">{{ member.name }}</p>
                  <p class="mt-0.5 truncate text-xs text-neutral-500">
                    <span v-if="member.telefone">{{ member.telefone }}</span>
                    <span v-else-if="member.dataNascimento && activeTab !== 'birthdays'">{{ formatDate(member.dataNascimento) }}</span>
                    <span v-else-if="activeTab === 'birthdays' && member.dataNascimento">{{ getAge(member.dataNascimento) }} anos</span>
                  </p>
                  <div v-if="member.isConsolidator || member.isCoLeader || member.isHost || !member.isActive || redeCuidadoStore.mapaCuidadores.get(Number(member.id))" class="mt-1.5 flex flex-wrap gap-1">
                    <span v-if="!member.isActive" class="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">Inativo</span>
                    <span v-if="member.isConsolidator" class="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-700">Consolidador</span>
                    <span v-if="member.isCoLeader" class="rounded-full bg-vibrant-50 px-2 py-0.5 text-[10px] font-medium text-vibrant-700">Co-líder</span>
                    <span v-if="member.isHost" class="rounded-full bg-fun-50 px-2 py-0.5 text-[10px] font-medium text-fun-700">Anfitrião</span>
                    <span v-if="redeCuidadoStore.mapaCuidadores.get(Number(member.id))" class="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-600">
                      <AppIcon name="heart" size="xs" />{{ redeCuidadoStore.mapaCuidadores.get(Number(member.id)) }}
                    </span>
                  </div>
                </div>

                <AppIcon name="dots" size="sm" class="shrink-0 text-neutral-400" />
              </button>
            </li>
          </ul>
              </div>
            </div>
            
      <!-- Modal de Editar Membro -->
      <TransitionRoot appear :show="editingMember !== null" as="template">
        <Dialog as="div" @close="cancelEdit" class="relative z-10">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0"
            enter-to="opacity-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100"
            leave-to="opacity-0"
          >
            <div class="fixed inset-0 bg-black bg-opacity-25" />
          </TransitionChild>

          <div class="fixed inset-0 overflow-y-auto">
            <div class="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as="template"
                enter="duration-300 ease-out"
                enter-from="opacity-0 scale-95"
                enter-to="opacity-100 scale-100"
                leave="duration-200 ease-in"
                leave-from="opacity-100 scale-100"
                leave-to="opacity-0 scale-95"
              >
                <DialogPanel class="modal-dialog-panel max-w-sm p-6 text-left align-middle">
                  <DialogTitle as="h3" class="text-xl font-semibold text-neutral-900 text-center">
                    Editar membro
                  </DialogTitle>
                  <p class="text-sm text-neutral-500 text-center mt-1 mb-6">
                    Atualize as informações e mantenha os dados organizados.
                  </p>

                  <form @submit.prevent="saveEdit" class="space-y-5">
                <div>
                      <label :for="'edit-name-' + editingMember" class="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                        Nome *
                      </label>
                      <input
                        v-model="editForm.name"
                        :id="'edit-name-' + editingMember"
                        type="text"
                        required
                        placeholder="Nome completo"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                      />
                    </div>

                <div>
                      <label :for="'edit-dataNascimento-' + editingMember" class="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                        Data de nascimento <span class="text-neutral-400 lowercase">(opcional)</span>
                      </label>
                      <input
                        v-model="editForm.dataNascimento"
                        :id="'edit-dataNascimento-' + editingMember"
                        type="date"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                        :max="new Date().toISOString().split('T')[0]"
                      />
                    </div>

                    <div class="space-y-2">
                      <span class="block text-xs font-medium text-neutral-500 uppercase tracking-wide">Funções</span>
                      <div class="grid grid-cols-3 gap-2 pt-1">
                        <label
                          class="flex flex-col items-center justify-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium cursor-pointer transition-all hover:bg-gray-50"
                          :class="editForm.isConsolidator ? 'bg-primary-50 border-primary-500 text-primary-700' : 'text-neutral-600'"
                        >
                          <input type="checkbox" v-model="editForm.isConsolidator" class="sr-only" />
                          <span>Consol.</span>
                        </label>
                        <label
                          class="flex flex-col items-center justify-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium cursor-pointer transition-all hover:bg-gray-50"
                          :class="editForm.isCoLeader ? 'bg-vibrant-50 border-vibrant-500 text-vibrant-700' : 'text-neutral-600'"
                        >
                          <input type="checkbox" v-model="editForm.isCoLeader" class="sr-only" />
                          <span>Co-líder</span>
                        </label>
                        <label
                          class="flex flex-col items-center justify-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium cursor-pointer transition-all hover:bg-gray-50"
                          :class="editForm.isHost ? 'bg-fun-50 border-fun-500 text-fun-700' : 'text-neutral-600'"
                        >
                          <input type="checkbox" v-model="editForm.isHost" class="sr-only" />
                          <span>Anfitrião</span>
                        </label>
                </div>
                    </div>

                    <div>
                      <label :for="'edit-notes-' + editingMember" class="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                        Observações
                      </label>
                  <textarea
                    v-model="editForm.observacoes"
                    :id="'edit-notes-' + editingMember"
                    rows="3"
                        placeholder="Adicione observações relevantes sobre o membro"
                        class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                  />
                </div>

                    <div class="flex items-center justify-end gap-3 pt-4">
                      <button
                        type="button"
                        @click="cancelEdit"
                        class="px-4 py-2 text-sm font-medium text-neutral-500 hover:text-neutral-700 transition-colors"
                      >
                  Cancelar
                </button>
                      <button
                        type="submit"
                        class="px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                      >
                        Salvar alterações
                      </button>
                    </div>
                  </form>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </TransitionRoot>

      <!-- Delete Confirmation Modal -->
      <div v-if="showDeleteModal" class="modal-backdrop" @click.self="showDeleteModal = false">
          <div class="modal-panel modal-panel-md text-left" @click.stop>
            <div class="bg-white px-4 pt-4 pb-3 sm:p-5 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div class="mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-red-100 sm:mx-0 sm:h-8 sm:w-8">
                  <AppIcon name="alert-triangle" class="text-red-600" size="sm" />
                </div>
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 class="text-base leading-6 font-medium text-neutral-900">Confirmar exclusão</h3>
                  <div class="mt-2">
                    <p class="text-xs text-neutral-500">
                      Você tem certeza que deseja apagar permanentemente o membro <strong>{{ memberToDelete?.name }}</strong>? Esta ação não poderá ser desfeita.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-neutral-50 px-4 py-2 sm:px-5 sm:flex sm:flex-row-reverse">
              <button @click="handleDelete" class="btn btn-danger btn-xs">
                <AppIcon name="trash" class="mr-1" size="xs" />
                Apagar
              </button>
              <button @click="cancelDelete" class="btn btn-outline btn-xs mr-2">
                <AppIcon name="x" class="mr-1" size="xs" />
                Cancelar
              </button>
            </div>
          </div>
        </div>
    </main>

    <MobileStickyActionBar
      v-if="mobileShell && !showAddForm"
      label="Adicionar Membro"
      @click="handleAddMember"
    />
  </div>

  <MemberDetailModal
    :open="showDetailModal"
    :member="selectedMember"
    @close="closeMemberDetail"
    @edit="handleDetailEdit"
    @delete="handleDetailDelete"
    @toggle-active="handleDetailToggle"
    @save-notes="handleDetailSaveNotes"
  />
</template>