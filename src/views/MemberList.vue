<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useMemberStore, type Member } from '../stores/memberStore'
import { useUserStore } from '../stores/userStore'
import { useRedeCuidadoStore } from '../stores/redeCuidadoStore'
import AppIcon from '../components/AppIcon.vue'
import MemberNotesModal from '../components/MemberNotesModal.vue'
import { Dialog, DialogPanel, DialogTitle, TransitionRoot, TransitionChild } from '@headlessui/vue'

const router = useRouter()
const memberStore = useMemberStore()
const userStore = useUserStore()
const redeCuidadoStore = useRedeCuidadoStore()
const showAddForm = ref(false)
const activeTab = ref('all')

// (removido estado legado de novo membro)

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

function recarregarMembros() {
  memberStore.carregarMembros()
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

// Notes modal state
const showNotesModal = ref(false)
const selectedForNotes = ref<Member | null>(null)

function openNotes(member: Member) {
  selectedForNotes.value = member
  showNotesModal.value = true
}

function closeNotes() {
  showNotesModal.value = false
  selectedForNotes.value = null
}

function saveNotes(payload: { memberId: string; observacoes: string }) {
  memberStore.updateMember(payload.memberId, { observacoes: payload.observacoes })
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
  <div class="min-h-screen bg-neutral-50">
    <main class="container-layout">
      
      <!-- Cabeçalho da Página -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-5">
        <div>
          <h1 class="text-xl font-bold text-neutral-800">Minha Célula</h1>
          <p class="mt-1 text-xs text-neutral-500">
            {{ memberStore.getAllMembers.length }} membro(s) cadastrado(s)
          </p>
        </div>
        <div class="flex items-center gap-2 mt-3 md:mt-0">
          <button 
            @click="recarregarMembros"
            class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-300 transition-colors"
          >
            <AppIcon name="refresh" size="sm" class="mr-1.5" />
            Atualizar
          </button>
          <button
            @click="router.push({ name: 'rede-cuidado' })"
            class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 transition-colors flex-shrink-0"
            title="Rede de cuidado"
          >
            <AppIcon name="heart" size="sm" class="mr-1.5" />
            <span class="hidden sm:inline">Rede de Cuidado</span>
            <span class="sm:hidden">Rede</span>
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
      
      <!-- Resumo Estatístico -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
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
          <span class="text-xs text-neutral-500 mt-1">Aniversariantes do Mês</span>
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
                <DialogPanel class="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
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
      
      <!-- Card Principal com Abas -->
      <div class="card p-4">
        <!-- Abas de Navegação -->
        <div class="flex justify-between border-b border-neutral-200 mb-4">
          <button @click="setActiveTab('all')" class="pb-2 flex-1 text-sm font-medium transition-colors text-center" :class="activeTab === 'all' ? 'border-b-2 border-primary-500 text-primary-700' : 'text-neutral-500 hover:text-neutral-700'">
            <div class="flex items-center justify-center">
              <AppIcon name="users" class="mr-1" size="xs" :color="activeTab === 'all' ? '#0074ff' : undefined" />
              Todos
            </div>
          </button>
          <button @click="setActiveTab('consolidators')" class="pb-2 flex-1 text-sm font-medium transition-colors text-center" :class="activeTab === 'consolidators' ? 'border-b-2 border-primary-500 text-primary-700' : 'text-neutral-500 hover:text-neutral-700'">
            <div class="flex items-center justify-center">
              <AppIcon name="star" class="mr-1" size="xs" :color="activeTab === 'consolidators' ? '#0074ff' : undefined" />
              Consolidadores
            </div>
          </button>
          <button
            @click="setActiveTab('birthdays')"
            class="pb-2 flex-1 text-sm font-medium transition-colors text-center"
            :class="activeTab === 'birthdays' ? 'border-b-2 border-primary-500 text-primary-700' : 'text-neutral-500 hover:text-neutral-700'"
          >
            <div class="flex items-center justify-center">
              <AppIcon name="calendar" class="mr-1" size="xs" :color="activeTab === 'birthdays' ? '#0074ff' : undefined" />
              Aniversariantes(Mês)
            </div>
          </button>
        </div>
        
        <!-- Conteúdo das Abas -->
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
          <div v-else-if="displayedMembers.length === 0" class="text-center py-8">
              <AppIcon name="users" class="mx-auto h-12 w-12 text-neutral-400" />
              <h3 class="mt-3 text-base font-medium text-neutral-800">Nenhum membro encontrado</h3>
              <p class="mt-1 text-xs text-neutral-500 max-w-md mx-auto">Não há membros que correspondam a esta visualização.</p>
              <button v-if="activeTab !== 'all'" @click="setActiveTab('all')" class="mt-3 btn btn-xs btn-outline">
                Ver todos os membros
              </button>
          </div>

          <!-- Lista de Membros -->
          <ul v-else class="divide-y divide-neutral-100">
            <li v-for="member in displayedMembers" :key="member.id" class="py-3">
              <!-- Card de Aniversariante -->
              <div v-if="activeTab === 'birthdays'" class="flex items-center" :class="{'opacity-60': !member.isActive}">
                <div class="bg-fun-100 text-fun-700 font-bold p-2 rounded-lg text-center mr-3">
                  <span class="block text-xl">{{ getBirthdayDay(member.dataNascimento) }}</span>
                  <span class="block text-xs uppercase">{{ new Date(member.dataNascimento as string).toLocaleString('default', { month: 'short' }) }}</span>
                </div>
                <div class="flex-1">
                    <button
                      @click="openNotes(member)"
                    class="text-left w-full"
                    >
                    <div class="flex items-center gap-1">
                      <h3 class="font-medium text-neutral-800">{{ member.name }}</h3>
                  </div>
                    <div class="text-xs text-neutral-500 mt-0.5 flex items-center gap-3">
                    <span class="inline-flex items-center">
                      <AppIcon name="calendar" class="mr-1" size="xs"/>
                      {{ getAge(member.dataNascimento) }} anos
                    </span>
                      <span v-if="member.telefone" class="inline-flex items-center">
                      <AppIcon name="phone" class="mr-1" size="xs"/>{{ member.telefone }}
                    </span>
                  </div>
                  </button>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <span v-if="!member.isActive" class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">Inativo</span>
                    <span v-if="member.isConsolidator" class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">Consolidador</span>
                    <span v-if="member.isCoLeader" class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-vibrant-100 text-vibrant-700">Co-líder</span>
                    <span v-if="member.isHost" class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-fun-100 text-fun-700">Anfitrião</span>
                    <span v-if="redeCuidadoStore.mapaCuidadores.get(Number(member.id))" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-600">
                      <AppIcon name="heart" size="xs" />{{ redeCuidadoStore.mapaCuidadores.get(Number(member.id)) }}
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <button @click="startEditing(member)" class="p-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors" title="Editar">
                    <AppIcon name="edit" size="xs" class="text-neutral-600" />
                  </button>
                  <button @click="memberStore.toggleMemberActive(member.id)" class="p-1.5 rounded-full transition-colors" 
                    :class="member.isActive ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-600' : 'bg-green-100 hover:bg-green-200 text-green-600'" 
                    :title="member.isActive ? 'Desativar' : 'Ativar'">
                    <AppIcon v-if="member.isActive" name="close" size="xs" />
                    <AppIcon v-else name="check" size="xs" />
                  </button>
                  <button @click="confirmDelete(member)" class="p-1.5 rounded-full bg-red-100 hover:bg-red-200 transition-colors text-red-600" title="Excluir">
                    <AppIcon name="delete" size="xs" />
                  </button>
                </div>
              </div>

              <!-- Card de Membro Padrão -->
              <div v-else class="flex items-center justify-between" :class="{'opacity-60': !member.isActive}">
                <div class="flex-1">
                    <button
                      @click="openNotes(member)"
                    class="text-left w-full"
                    >
                    <div class="flex items-center gap-1">
                      <p class="text-sm font-medium text-neutral-800">{{ member.name }}</p>
                  </div>
                  <div class="flex flex-wrap items-center text-xs text-neutral-500 mt-0.5">
                    <span v-if="member.telefone" class="inline-flex items-center mr-3">
                      <AppIcon name="phone" class="mr-1" size="xs"/>{{ member.telefone }}
                        </span>
                    <span v-if="member.dataNascimento" class="inline-flex items-center">
                      <AppIcon name="calendar" class="mr-1" size="xs"/>{{ formatDate(member.dataNascimento) }}
                        </span>
                  </div>
                  </button>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <span v-if="!member.isActive" class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">Inativo</span>
                    <span v-if="member.isConsolidator" class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">Consolidador</span>
                    <span v-if="member.isCoLeader" class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-vibrant-100 text-vibrant-700">Co-líder</span>
                    <span v-if="member.isHost" class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-fun-100 text-fun-700">Anfitrião</span>
                    <span v-if="redeCuidadoStore.mapaCuidadores.get(Number(member.id))" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-600">
                      <AppIcon name="heart" size="xs" />{{ redeCuidadoStore.mapaCuidadores.get(Number(member.id)) }}
                    </span>
                  </div>
                </div>
                
                <div class="flex items-center gap-2">
                  <button @click="startEditing(member)" class="p-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors" title="Editar">
                    <AppIcon name="edit" size="xs" class="text-neutral-600" />
                  </button>
                  <button @click="memberStore.toggleMemberActive(member.id)" class="p-1.5 rounded-full transition-colors" 
                    :class="member.isActive ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-600' : 'bg-green-100 hover:bg-green-200 text-green-600'" 
                    :title="member.isActive ? 'Desativar' : 'Ativar'">
                    <AppIcon v-if="member.isActive" name="close" size="xs" />
                    <AppIcon v-else name="check" size="xs" />
                  </button>
                  <button @click="confirmDelete(member)" class="p-1.5 rounded-full bg-red-100 hover:bg-red-200 transition-colors text-red-600" title="Excluir">
                    <AppIcon name="delete" size="xs" />
                  </button>
                </div>
              </div>
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
                <DialogPanel class="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
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
      <div v-if="showDeleteModal" class="fixed inset-0 overflow-y-auto z-50">
        <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div class="fixed inset-0 transition-opacity" aria-hidden="true">
            <div class="absolute inset-0 bg-neutral-900 opacity-75"></div>
          </div>
          <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
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
      </div>
    </main>
  </div>

  <!-- Modal de Observações do Membro -->
  <MemberNotesModal
    :is-open="showNotesModal"
    :member="selectedForNotes ? { id: selectedForNotes.id, name: selectedForNotes.name, observacoes: selectedForNotes.observacoes } : null"
    @close="closeNotes"
    @save="saveNotes"
  />
</template>