<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useMemberStore, type Member } from '../stores/memberStore'
import { useUserStore } from '../stores/userStore'
import AppIcon from '../components/AppIcon.vue'
import { Menu, MenuButton, MenuItems, MenuItem, Dialog, DialogPanel, DialogTitle, TransitionRoot, TransitionChild } from '@headlessui/vue'

const memberStore = useMemberStore()
const userStore = useUserStore()
const showAddForm = ref(false)
const activeTab = ref('all')

// Formulário para novo membro
const newMember = ref({
  name: '',
  telefone: '',
  dataNascimento: '',
  isConsolidator: false,
  isCoLeader: false,
  isHost: false
})

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

function addMember() {
  if (!hasCelula.value) {
    alert('Erro: Nenhuma célula selecionada. Você precisa ser líder de uma célula ativa para cadastrar membros.');
    return;
  }
  
  if (newMember.value.name.trim()) {
    console.log('[MemberList] Adicionando membro com dados:', newMember.value);
    console.log('[MemberList] Data de nascimento:', {
      valor: newMember.value.dataNascimento,
      tipo: typeof newMember.value.dataNascimento
    });
    
    memberStore.addMember({
      name: newMember.value.name,
      telefone: newMember.value.telefone,
      dataNascimento: newMember.value.dataNascimento,
      isConsolidator: newMember.value.isConsolidator,
      isCoLeader: newMember.value.isCoLeader,
      isHost: newMember.value.isHost
    })
    
    // Reset form
    newMember.value = {
      name: '',
      telefone: '',
      dataNascimento: '',
      isConsolidator: false,
      isCoLeader: false,
      isHost: false
    }
    
    showAddForm.value = false
  }
}

function toggleAddForm() {
  if (!hasCelula.value) {
    alert('Erro: Nenhuma célula selecionada. Você precisa ser líder de uma célula ativa para cadastrar membros.');
    return;
  }
  
  showAddForm.value = !showAddForm.value
}

const editingMember = ref<string | null>(null)
const editForm = ref({
  name: '',
  telefone: '',
  dataNascimento: '',
  isConsolidator: false,
  isCoLeader: false,
  isHost: false
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
    const [year, month, day] = datePart.split('-');
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
    telefone: member.telefone || '',
    dataNascimento: dataFormatada,
    isConsolidator: member.isConsolidator,
    isCoLeader: member.isCoLeader,
    isHost: member.isHost
  }
  
  console.log('[MemberList] Formulário de edição:', editForm.value);
}

function saveEdit() {
  if (editingMember.value && editForm.value.name.trim()) {
    memberStore.updateMember(editingMember.value, {
      name: editForm.value.name,
      telefone: editForm.value.telefone,
      dataNascimento: editForm.value.dataNascimento,
      isConsolidator: editForm.value.isConsolidator,
      isCoLeader: editForm.value.isCoLeader,
      isHost: editForm.value.isHost
    })
    
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

const form = ref({
  name: '',
  telefone: '',
  dataNascimento: '',
  isConsolidator: false,
  isCoLeader: false,
  isHost: false,
  isActive: true
})

async function handleSubmit() {
  try {
    await memberStore.addMember({
      ...form.value,
      id: Date.now().toString() // temporary ID
    })
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
            @click="toggleAddForm"
            class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 transition-colors"
          >
            <AppIcon name="add" size="sm" class="mr-1.5" />
            Adicionar
          </button>
        </div>
      </div>
      
      <!-- Resumo Estatístico -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <div class="card p-3 flex flex-col items-center justify-center">
          <span class="text-xl font-bold text-neutral-800">{{ stats.total }}</span>
          <span class="text-xs text-neutral-500 mt-1">Total de Membros</span>
        </div>
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
                <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Adicionar Novo Membro
                  </DialogTitle>

                  <form @submit.prevent="handleSubmit" class="space-y-4">
                    <div>
                      <label for="name" class="block text-sm font-medium text-gray-700">Nome</label>
                      <input
                        type="text"
                        id="name"
                        v-model="form.name"
                        required
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label for="telefone" class="block text-sm font-medium text-gray-700">Telefone</label>
                      <input
                        type="tel"
                        id="telefone"
                        v-model="form.telefone"
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label for="dataNascimento" class="block text-sm font-medium text-gray-700">Data de Nascimento</label>
                      <input
                        type="date"
                        id="dataNascimento"
                        v-model="form.dataNascimento"
                        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                      />
                    </div>

                    <div class="flex flex-col gap-2">
                      <label class="text-sm font-medium text-gray-700">Funções</label>
                      <div class="space-y-2">
                        <label class="inline-flex items-center">
                          <input type="checkbox" v-model="form.isConsolidator" class="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                          <span class="ml-2 text-sm text-gray-700">Consolidador</span>
                        </label>
                        <label class="inline-flex items-center">
                          <input type="checkbox" v-model="form.isCoLeader" class="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                          <span class="ml-2 text-sm text-gray-700">Co-líder</span>
                        </label>
                        <label class="inline-flex items-center">
                          <input type="checkbox" v-model="form.isHost" class="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                          <span class="ml-2 text-sm text-gray-700">Anfitrião</span>
                        </label>
                      </div>
                    </div>

                    <div class="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        @click="toggleAddForm"
                        class="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        class="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                      >
                        Adicionar
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
                  <h3 class="font-medium text-neutral-800">{{ member.name }}</h3>
                  <div class="text-xs text-neutral-500">
                    <span class="inline-flex items-center">
                      <AppIcon name="calendar" class="mr-1" size="xs"/>
                      {{ getAge(member.dataNascimento) }} anos
                    </span>
                    <span v-if="member.telefone" class="inline-flex items-center ml-3">
                      <AppIcon name="phone" class="mr-1" size="xs"/>{{ member.telefone }}
                    </span>
                  </div>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <span v-if="!member.isActive" class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">Inativo</span>
                    <span v-if="member.isConsolidator" class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">Consolidador</span>
                    <span v-if="member.isCoLeader" class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-vibrant-100 text-vibrant-700">Co-líder</span>
                    <span v-if="member.isHost" class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-fun-100 text-fun-700">Anfitrião</span>
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
                  <p class="text-sm font-medium text-neutral-800">{{ member.name }}</p>
                  <div class="flex flex-wrap items-center text-xs text-neutral-500 mt-0.5">
                    <span v-if="member.telefone" class="inline-flex items-center mr-3">
                      <AppIcon name="phone" class="mr-1" size="xs"/>{{ member.telefone }}
                        </span>
                    <span v-if="member.dataNascimento" class="inline-flex items-center">
                      <AppIcon name="calendar" class="mr-1" size="xs"/>{{ formatDate(member.dataNascimento) }}
                        </span>
                  </div>
                  <div class="flex flex-wrap gap-1 mt-1">
                    <span v-if="!member.isActive" class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">Inativo</span>
                    <span v-if="member.isConsolidator" class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">Consolidador</span>
                    <span v-if="member.isCoLeader" class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-vibrant-100 text-vibrant-700">Co-líder</span>
                    <span v-if="member.isHost" class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-fun-100 text-fun-700">Anfitrião</span>
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
            
      <!-- Modo de Edição (Modal) -->
      <div v-if="editingMember !== null" class="fixed inset-0 overflow-y-auto z-50">
        <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div class="fixed inset-0 transition-opacity" aria-hidden="true">
            <div class="absolute inset-0 bg-neutral-900 opacity-75"></div>
          </div>
          <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div class="bg-white px-4 pt-4 pb-3 sm:p-5">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-base font-medium text-neutral-800">Editar Membro</h3>
                <button @click="cancelEdit" class="btn btn-icon btn-xs">
                  <AppIcon name="close" size="xs" />
                </button>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label :for="'edit-name-' + editingMember" class="form-label text-sm">Nome</label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <AppIcon name="user" size="xs" class="text-neutral-400" />
                    </div>
                    <input v-model="editForm.name" :id="'edit-name-' + editingMember" type="text" class="form-input pl-7 py-1 text-sm" />
                  </div>
                </div>
                <div>
                  <label :for="'edit-telefone-' + editingMember" class="form-label text-sm">Telefone</label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <AppIcon name="phone" size="xs" class="text-neutral-400" />
                    </div>
                    <input v-model="editForm.telefone" :id="'edit-telefone-' + editingMember" type="text" class="form-input pl-7 py-1 text-sm" />
                  </div>
                </div>
                <div>
                  <label :for="'edit-dataNascimento-' + editingMember" class="form-label text-sm">Data de Nascimento</label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                      <AppIcon name="calendar" size="xs" class="text-neutral-400" />
                    </div>
                    <input v-model="editForm.dataNascimento" :id="'edit-dataNascimento-' + editingMember" type="date" class="form-input pl-7 py-1 text-sm" />
                  </div>
                </div>
                <div class="flex flex-col justify-center gap-2">
                  <div class="flex items-center">
                    <input v-model="editForm.isConsolidator" :id="'edit-consolidator-' + editingMember" type="checkbox" class="h-4 w-4 text-primary-500 focus:ring-primary-400 border-neutral-300 rounded" />
                    <label :for="'edit-consolidator-' + editingMember" class="ml-2 block text-xs text-neutral-700">Consolidador</label>
                  </div>
                  <div class="flex items-center">
                    <input v-model="editForm.isCoLeader" :id="'edit-coleader-' + editingMember" type="checkbox" class="h-4 w-4 text-vibrant-500 focus:ring-vibrant-400 border-neutral-300 rounded" />
                    <label :for="'edit-coleader-' + editingMember" class="ml-2 block text-xs text-neutral-700">Co-líder</label>
                  </div>
                  <div class="flex items-center">
                    <input v-model="editForm.isHost" :id="'edit-host-' + editingMember" type="checkbox" class="h-4 w-4 text-fun-500 focus:ring-fun-400 border-neutral-300 rounded" />
                    <label :for="'edit-host-' + editingMember" class="ml-2 block text-xs text-neutral-700">Anfitrião</label>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-neutral-50 px-4 py-2 sm:px-5 sm:flex sm:flex-row-reverse">
              <button @click="saveEdit" class="btn btn-primary btn-xs" :disabled="!editForm.name.trim()">
                <AppIcon name="save" class="mr-1" size="xs" />
                Salvar
              </button>
              <button @click="cancelEdit" class="btn btn-outline btn-xs mr-2">
                <AppIcon name="x" class="mr-1" size="xs" />
                  Cancelar
                </button>
            </div>
          </div>
        </div>
      </div>

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
</template>