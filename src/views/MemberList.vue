<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useMemberStore, type Member } from '../stores/memberStore'
import { useUserStore } from '../stores/userStore'

const memberStore = useMemberStore()
const userStore = useUserStore()
const showAddForm = ref(false)

// Formulário expandido para incluir mais informações do membro
const newMember = ref({
  name: '',
  telefone: '',
  email: '',
  isConsolidator: false,
  isCoLeader: false,
  isHost: false
})

// Verifica se tem uma célula selecionada
const hasCelula = computed(() => !!memberStore.celulaId)

// Carregar membros quando o componente for montado
onMounted(async () => {
  await memberStore.carregarMembros()
  
  // Registrar informações para depuração
  console.log('Usuário logado:', userStore.isLoggedIn)
  console.log('Usuário é líder:', userStore.user?.cargo)
  console.log('Célula selecionada:', memberStore.celulaId)
})

function addMember() {
  if (!hasCelula.value) {
    alert('Erro: Nenhuma célula selecionada. Você precisa ser líder de uma célula ativa para cadastrar membros.');
    return;
  }
  
  if (newMember.value.name.trim()) {
    memberStore.addMember({
      name: newMember.value.name,
      telefone: newMember.value.telefone,
      email: newMember.value.email,
      isConsolidator: newMember.value.isConsolidator,
      isCoLeader: newMember.value.isCoLeader,
      isHost: newMember.value.isHost
    })
    
    // Reset form
    newMember.value = {
      name: '',
      telefone: '',
      email: '',
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
  email: '',
  isConsolidator: false,
  isCoLeader: false,
  isHost: false
})

function startEditing(member: Member) {
  editingMember.value = member.id
  editForm.value = {
    name: member.name,
    telefone: member.telefone || '',
    email: member.email || '',
    isConsolidator: member.isConsolidator,
    isCoLeader: member.isCoLeader,
    isHost: member.isHost
  }
}

function saveEdit() {
  if (editingMember.value && editForm.value.name.trim()) {
    memberStore.updateMember(editingMember.value, {
      name: editForm.value.name,
      telefone: editForm.value.telefone,
      email: editForm.value.email,
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
</script>

<template>
  <div class="min-h-screen bg-neutral-50">
    <main class="container-layout">
      <div class="page-header flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-neutral-800">Membros</h1>
          <p class="mt-1 text-neutral-500">Gerenciar todos os membros da célula</p>
        </div>
        
        <div class="mt-4 md:mt-0 flex space-x-3">
          <button 
            @click="recarregarMembros"
            class="btn btn-outline"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
          
          <button 
            @click="toggleAddForm"
            class="btn btn-primary"
            :disabled="!hasCelula"
          >
            <svg v-if="!showAddForm" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span v-if="!showAddForm">Adicionar Membro</span>
            <span v-else>Cancelar</span>
          </button>
        </div>
      </div>
      
      <!-- Add Member Form -->
      <div v-if="showAddForm" class="mb-8 card animate-fade-in">
        <h2 class="text-xl font-semibold text-neutral-800 mb-5">Adicionar Novo Membro</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label for="name" class="form-label">Nome Completo</label>
            <input
              v-model="newMember.name"
              type="text"
              id="name"
              class="form-input"
              placeholder="Nome do membro"
            />
          </div>
          
          <div>
            <label for="telefone" class="form-label">Telefone</label>
            <input
              v-model="newMember.telefone"
              type="text"
              id="telefone"
              class="form-input"
              placeholder="(00) 00000-0000"
            />
          </div>
          
          <div>
            <label for="email" class="form-label">Email</label>
            <input
              v-model="newMember.email"
              type="email"
              id="email"
              class="form-input"
              placeholder="email@exemplo.com"
            />
          </div>
          
          <div class="flex items-center">
            <input
              v-model="newMember.isConsolidator"
              type="checkbox"
              id="isConsolidator"
              class="h-4 w-4 text-primary-500 focus:ring-primary-400 border-neutral-300 rounded"
            />
            <label for="isConsolidator" class="ml-2 block text-sm text-neutral-700">
              Consolidador
            </label>
          </div>

          <div class="flex items-center">
            <input
              v-model="newMember.isCoLeader"
              type="checkbox"
              id="isCoLeader"
              class="h-4 w-4 text-primary-500 focus:ring-primary-400 border-neutral-300 rounded"
            />
            <label for="isCoLeader" class="ml-2 block text-sm text-neutral-700">
              Co-líder
            </label>
          </div>

          <div class="flex items-center">
            <input
              v-model="newMember.isHost"
              type="checkbox"
              id="isHost"
              class="h-4 w-4 text-primary-500 focus:ring-primary-400 border-neutral-300 rounded"
            />
            <label for="isHost" class="ml-2 block text-sm text-neutral-700">
              Anfitrião
            </label>
          </div>
        </div>
        
        <div class="mt-6 flex justify-end">
          <button
            @click="addMember"
            class="btn btn-primary"
            :disabled="!newMember.name.trim()"
          >
            Adicionar Membro
          </button>
        </div>
      </div>
      
      <!-- Loading State -->
      <div v-if="memberStore.loading" class="card text-center py-10">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
        <p class="mt-5 text-neutral-600">Carregando membros...</p>
      </div>
      
      <!-- Error State -->
      <div v-else-if="memberStore.error" class="card mb-6 bg-red-50 border border-red-100">
        <div class="flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div class="flex-1">
            <h3 class="text-lg font-medium text-red-800 mb-2">Ocorreu um erro</h3>
            <p class="text-red-700">{{ memberStore.error }}</p>
            <div class="mt-4">
              <p class="text-sm text-neutral-700 mb-2">Possíveis soluções:</p>
              <ul class="list-disc pl-5 text-sm text-neutral-700">
                <li>Verifique se você está logado corretamente</li>
                <li>Verifique se sua conta tem cargo de Líder</li>
                <li>Verifique se você está associado a pelo menos uma célula ativa</li>
              </ul>
              <button 
                @click="recarregarMembros"
                class="mt-4 btn btn-primary inline-flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-else-if="memberStore.members.length === 0 && !memberStore.error" class="card text-center py-10">
        <svg class="mx-auto h-16 w-16 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <h3 class="mt-4 text-lg font-medium text-neutral-800">Nenhum membro cadastrado</h3>
        <p class="mt-2 text-neutral-500 max-w-md mx-auto">Comece adicionando seu primeiro membro à célula.</p>
        <div class="mt-6">
          <button
            @click="toggleAddForm"
            class="btn btn-primary inline-flex items-center"
            :disabled="!hasCelula"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
            </svg>
            Adicionar Membro
          </button>
        </div>
      </div>
      
      <!-- Members List -->
      <div v-else class="section">
        <ul class="grid grid-cols-1 gap-4">
          <li v-for="member in memberStore.getAllMembers" :key="member.id" 
            class="card transition-all duration-200"
            :class="{
              'opacity-75 bg-neutral-50 border border-neutral-200': !member.isActive,
              'bg-white hover:shadow-md': member.isActive
            }"
          >
            <!-- Display Mode -->
            <div v-if="editingMember !== member.id" class="flex flex-col space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center gap-4">
                <div class="flex-1">
                  <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div class="flex items-center gap-2 flex-wrap">
                      <h3 class="text-lg font-medium" :class="member.isActive ? 'text-neutral-800' : 'text-neutral-600'">
                        {{ member.name }}
                      </h3>
                      <div class="flex flex-wrap gap-1.5">
                        <span 
                          v-if="!member.isActive" 
                          class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-neutral-100 text-neutral-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Inativo
                        </span>
                        <span 
                          v-if="member.isConsolidator" 
                          class="badge badge-primary"
                        >
                          Consolidador
                        </span>
                        <span 
                          v-if="member.isCoLeader" 
                          class="badge badge-success"
                        >
                          Co-líder
                        </span>
                        <span 
                          v-if="member.isHost" 
                          class="badge badge-info"
                        >
                          Anfitrião
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="mt-2 text-sm" :class="member.isActive ? 'text-neutral-500' : 'text-neutral-400'">
                    <p v-if="member.telefone" class="mb-1">
                      <span class="inline-flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" :class="member.isActive ? 'text-neutral-400' : 'text-neutral-300'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {{ member.telefone }}
                      </span>
                    </p>
                    <p v-if="member.email">
                      <span class="inline-flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1.5" :class="member.isActive ? 'text-neutral-400' : 'text-neutral-300'" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {{ member.email }}
                      </span>
                    </p>
                  </div>
                </div>
                
                <div class="flex items-center gap-2 sm:gap-3 justify-end">
                  <!-- Botão Editar -->
                  <button
                    @click="startEditing(member)"
                    class="btn btn-icon btn-ghost"
                    :class="{'opacity-75': !member.isActive}"
                    title="Editar membro"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <!-- Botão Ativar/Desativar -->
                  <button
                    @click="memberStore.toggleMemberActive(member.id)"
                    class="btn btn-icon"
                    :class="member.isActive ? 'btn-warning' : 'btn-success'"
                    :title="member.isActive ? 'Desativar membro' : 'Ativar membro'"
                  >
                    <svg v-if="member.isActive" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>

                  <!-- Botão Apagar -->
                  <button
                    @click="confirmDelete(member)"
                    class="btn btn-icon btn-error"
                    :class="{'opacity-75': !member.isActive}"
                    title="Apagar membro permanentemente"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <!-- Edit Mode -->
            <div v-else class="animate-fade-in">
              <h3 class="text-lg font-medium text-neutral-800 mb-4">Editar Membro</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label :for="'edit-name-' + member.id" class="form-label">Nome</label>
                  <input
                    v-model="editForm.name"
                    :id="'edit-name-' + member.id"
                    type="text"
                    class="form-input"
                    placeholder="Nome do membro"
                  />
                </div>
                
                <div>
                  <label :for="'edit-telefone-' + member.id" class="form-label">Telefone</label>
                  <input
                    v-model="editForm.telefone"
                    :id="'edit-telefone-' + member.id"
                    type="text"
                    class="form-input"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                
                <div>
                  <label :for="'edit-email-' + member.id" class="form-label">Email</label>
                  <input
                    v-model="editForm.email"
                    :id="'edit-email-' + member.id"
                    type="email"
                    class="form-input"
                    placeholder="email@exemplo.com"
                  />
                </div>
                
                <div class="flex flex-col gap-3">
                  <div class="flex items-center">
                    <input
                      v-model="editForm.isConsolidator"
                      :id="'edit-consolidator-' + member.id"
                      type="checkbox"
                      class="h-4 w-4 text-primary-500 focus:ring-primary-400 border-neutral-300 rounded"
                    />
                    <label :for="'edit-consolidator-' + member.id" class="ml-2 block text-sm text-neutral-700">
                      Consolidador
                    </label>
                  </div>

                  <div class="flex items-center">
                    <input
                      v-model="editForm.isCoLeader"
                      :id="'edit-coleader-' + member.id"
                      type="checkbox"
                      class="h-4 w-4 text-primary-500 focus:ring-primary-400 border-neutral-300 rounded"
                    />
                    <label :for="'edit-coleader-' + member.id" class="ml-2 block text-sm text-neutral-700">
                      Co-líder
                    </label>
                  </div>

                  <div class="flex items-center">
                    <input
                      v-model="editForm.isHost"
                      :id="'edit-host-' + member.id"
                      type="checkbox"
                      class="h-4 w-4 text-primary-500 focus:ring-primary-400 border-neutral-300 rounded"
                    />
                    <label :for="'edit-host-' + member.id" class="ml-2 block text-sm text-neutral-700">
                      Anfitrião
                    </label>
                  </div>
                </div>
              </div>
              
              <div class="flex justify-end space-x-3 mt-6">
                <button
                  @click="cancelEdit"
                  class="btn btn-outline"
                >
                  Cancelar
                </button>
                <button
                  @click="saveEdit"
                  class="btn btn-primary"
                  :disabled="!editForm.name.trim()"
                >
                  Salvar
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <!-- Delete Confirmation Modal -->
      <div v-if="showDeleteModal" class="fixed inset-0 overflow-y-auto z-50">
        <div class="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <!-- Background overlay -->
          <div class="fixed inset-0 transition-opacity" aria-hidden="true">
            <div class="absolute inset-0 bg-neutral-900 opacity-75"></div>
          </div>

          <!-- Modal panel -->
          <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 class="text-lg leading-6 font-medium text-neutral-900">
                    Confirmar exclusão
                  </h3>
                  <div class="mt-2">
                    <p class="text-sm text-neutral-500">
                      Você tem certeza que deseja apagar permanentemente o membro <strong>{{ memberToDelete?.name }}</strong>? 
                      Esta ação não poderá ser desfeita e todos os registros de presença associados também serão removidos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-neutral-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button 
                @click="handleDelete" 
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Apagar
              </button>
              <button 
                @click="cancelDelete" 
                class="mt-3 w-full inline-flex justify-center rounded-md border border-neutral-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>