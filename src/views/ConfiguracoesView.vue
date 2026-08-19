<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useUsuarioConfigStore } from '../stores/usuarioConfigStore';
import { useUserStore } from '../stores/userStore';
import WhatsAppConnections from '../components/WhatsAppConnections.vue';
import { usePushNotifications } from '../composables/usePushNotifications';

const userStore = useUserStore();
const configStore = useUsuarioConfigStore();
const whatsappRef = ref<any>(null);
const {
  permissionStatus,
  registering,
  errorMessage: pushError,
  refreshPermission,
  enablePush,
  disablePush,
} = usePushNotifications();

const pushStatusLabel = computed(() => {
  switch (permissionStatus.value) {
    case 'granted':
      return 'Ativadas neste dispositivo';
    case 'denied':
      return 'Bloqueadas no navegador';
    case 'prompt':
      return 'Ainda não ativadas';
    case 'ios-browser':
      return 'No iPhone/iPad, instale o app na tela inicial para ativar';
    default:
      return 'Não suportadas neste navegador';
  }
});

// Estados do formulário
const form = ref({
  notificacaoAniversarioAtiva: true,
  diasAntecedencia1: 3,
  diasAntecedencia2: 0,
  notificacaoAniversarioLiderAtiva: false,
  diasAntecedenciaLider1: 3,
  diasAntecedenciaLider2: 0
});

// Estados da UI
const isSaving = ref(false);
const isTesting = ref(false);
const showSuccess = ref(false);
const errorMessage = ref('');
const testMessage = ref('');
const activeTab = ref<'notificacoes' | 'integracoes'>('notificacoes');

// Verificar se o usuário é líder
const isLider = computed(() => {
  return userStore.user?.cargo === 'LIDER';
});

// Verificar se o usuário é admin
const isAdmin = computed(() => {
  return userStore.isAdmin;
});

// Verificar se estamos em ambiente de desenvolvimento
const isDevelopment = computed(() => {
  return import.meta.env.MODE === 'development';
});

// Carregar configurações ao montar o componente
onMounted(async () => {
  refreshPermission();
  await configStore.loadConfig();
  
  if (configStore.config) {
    form.value = {
      notificacaoAniversarioAtiva: configStore.config.notificacaoAniversarioAtiva,
      diasAntecedencia1: configStore.config.diasAntecedencia1,
      diasAntecedencia2: configStore.config.diasAntecedencia2,
      notificacaoAniversarioLiderAtiva: configStore.config.notificacaoAniversarioLiderAtiva ?? false,
      diasAntecedenciaLider1: configStore.config.diasAntecedenciaLider1 ?? 3,
      diasAntecedenciaLider2: configStore.config.diasAntecedenciaLider2 ?? 0
    };
  }
  
  // Verificar conexões do WhatsApp quando a página for carregada (apenas para admin)
  if (isAdmin.value) {
    setTimeout(() => {
      if (whatsappRef.value && typeof whatsappRef.value.checkActiveConnection === 'function') {
        whatsappRef.value.checkActiveConnection();
      }
    }, 100);
  }
});

// Salvar configurações
const saveConfig = async () => {
  isSaving.value = true;
  errorMessage.value = '';
  showSuccess.value = false;
  
  try {
    // Validar dias de antecedência
    if (form.value.diasAntecedencia1 < 0 || form.value.diasAntecedencia1 > 30) {
      throw new Error('O primeiro dia de antecedência deve estar entre 0 e 30');
    }
    
    if (form.value.diasAntecedencia2 < 0 || form.value.diasAntecedencia2 > 30) {
      throw new Error('O segundo dia de antecedência deve estar entre 0 e 30');
    }
    
    if (form.value.diasAntecedenciaLider1 < 0 || form.value.diasAntecedenciaLider1 > 30) {
      throw new Error('O primeiro dia de antecedência para líderes deve estar entre 0 e 30');
    }
    
    if (form.value.diasAntecedenciaLider2 < 0 || form.value.diasAntecedenciaLider2 > 30) {
      throw new Error('O segundo dia de antecedência para líderes deve estar entre 0 e 30');
    }
    
    const success = await configStore.updateConfig({
      notificacaoAniversarioAtiva: form.value.notificacaoAniversarioAtiva,
      diasAntecedencia1: form.value.diasAntecedencia1,
      diasAntecedencia2: form.value.diasAntecedencia2,
      notificacaoAniversarioLiderAtiva: form.value.notificacaoAniversarioLiderAtiva,
      diasAntecedenciaLider1: form.value.diasAntecedenciaLider1,
      diasAntecedenciaLider2: form.value.diasAntecedenciaLider2
    });
    
    if (success) {
      showSuccess.value = true;
      setTimeout(() => {
        showSuccess.value = false;
      }, 3000);
    } else {
      errorMessage.value = configStore.error || 'Erro ao salvar configurações';
    }
  } catch (error: any) {
    errorMessage.value = error.message || 'Erro ao salvar configurações';
  } finally {
    isSaving.value = false;
  }
};

// Testar notificação de aniversário
const testAniversarioNotification = async () => {
  isTesting.value = true;
  testMessage.value = '';
  errorMessage.value = '';
  
  try {
    const result = await configStore.testAniversarioNotification();
    if (result.success) {
      testMessage.value = result.message || 'Notificação de teste enviada com sucesso!';
    } else {
      errorMessage.value = result.message || 'Erro ao enviar notificação de teste';
    }
  } catch (error: any) {
    errorMessage.value = error.message || 'Erro ao testar notificação';
  } finally {
    isTesting.value = false;
  }
};
</script>

<template>
  <div>
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">
        <div class="bg-white shadow rounded-lg">
          <div class="px-4 py-5 sm:px-6">
            <h3 class="text-lg font-medium text-gray-900">
              Configurações
            </h3>
            <p class="mt-2 text-sm text-gray-500">
              Personalize suas preferências de notificação
            </p>
          </div>
          
          <!-- Alerta de sucesso -->
          <div v-if="showSuccess" class="mx-4 mb-4 p-4 rounded-lg bg-green-50 border border-green-200">
            <p class="text-sm font-medium text-green-800">Configurações atualizadas com sucesso!</p>
          </div>
          
          <!-- Alerta de teste -->
          <div v-if="testMessage" class="mx-4 mb-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <p class="text-sm font-medium text-blue-800">{{ testMessage }}</p>
          </div>

          <!-- Alerta de erro -->
          <div v-if="errorMessage || pushError" class="mx-4 mb-4 p-4 rounded-lg bg-red-50 border border-red-200">
            <p class="text-sm font-medium text-red-800">{{ errorMessage || pushError }}</p>
          </div>
          
          <!-- Tabs de navegação -->
          <div class="border-t border-gray-200">
            <div class="px-4 sm:px-6">
              <nav class="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto [&::-webkit-scrollbar]:hidden" aria-label="Tabs" style="scrollbar-width: none; -ms-overflow-style: none;">
                <button
                  @click="activeTab = 'notificacoes'"
                  :class="activeTab === 'notificacoes' 
                    ? 'border-primary-500 text-primary-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
                  class="whitespace-nowrap py-4 px-2 sm:px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5 sm:gap-2 min-w-fit"
                >
                  <svg class="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span>Notificações</span>
                </button>
                <button
                  v-if="isAdmin"
                  @click="activeTab = 'integracoes'"
                  :class="activeTab === 'integracoes' 
                    ? 'border-primary-500 text-primary-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
                  class="whitespace-nowrap py-4 px-2 sm:px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5 sm:gap-2 min-w-fit"
                >
                  <svg class="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span>Integrações</span>
                </button>
              </nav>
            </div>
          </div>

          <div class="px-4 py-6 sm:px-6 sm:py-6">
            <form @submit.prevent="saveConfig" class="space-y-8">
              <!-- Tab: Notificações -->
              <div v-show="activeTab === 'notificacoes'">
                <div class="space-y-4">
                  <h4 class="text-base font-semibold text-gray-900">Notificações no aplicativo</h4>
                  <p class="text-sm text-gray-500">
                    Status: {{ pushStatusLabel }}
                  </p>
                  <div class="flex flex-wrap gap-3">
                    <button
                      v-if="permissionStatus !== 'granted'"
                      type="button"
                      :disabled="registering || permissionStatus === 'unsupported'"
                      class="inline-flex items-center gap-2 rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                      @click="enablePush"
                    >
                      {{ registering ? 'Ativando...' : 'Ativar notificações' }}
                    </button>
                    <button
                      v-if="permissionStatus === 'granted'"
                      type="button"
                      :disabled="registering"
                      class="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                      @click="disablePush"
                    >
                      {{ registering ? 'Desativando...' : 'Desativar notificações' }}
                    </button>
                  </div>
                  <p v-if="permissionStatus === 'ios-browser'" class="text-xs text-gray-500">
                    No Safari do iPhone, toque em Compartilhar e depois em Adicionar à Tela de Início.
                  </p>
                </div>

                <!-- Seção de notificações de aniversário (apenas para líderes) -->
                <div v-if="isLider" class="space-y-6 mt-8 pt-8 border-t border-gray-200">
                  <h4 class="text-base font-semibold text-gray-900">Aniversários de Membros</h4>
                
                <div class="flex items-start">
                  <div class="flex items-center h-5 pt-0.5">
                    <input
                      id="notificacaoAniversarioAtiva"
                      type="checkbox"
                      v-model="form.notificacaoAniversarioAtiva"
                      class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </div>
                  <div class="ml-3 text-sm">
                    <label for="notificacaoAniversarioAtiva" class="font-medium text-gray-900">
                      Receber notificações de aniversário no WhatsApp
                    </label>
                    <p class="mt-1 text-gray-500">
                      Você receberá notificações sobre aniversários dos membros de suas células
                    </p>
                  </div>
                </div>
                
                <div v-if="form.notificacaoAniversarioAtiva" class="ml-7 space-y-5">
                  <div>
                    <label for="diasAntecedencia1" class="block text-sm font-medium text-gray-900">
                      Primeiro aviso (dias antes)
                    </label>
                    <div class="mt-2">
                      <input
                        id="diasAntecedencia1"
                        type="number"
                        min="0"
                        max="30"
                        v-model.number="form.diasAntecedencia1"
                        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2"
                      />
                      <p class="mt-2 text-xs text-gray-500">
                        Receba um aviso com esta antecedência (0 = no dia)
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label for="diasAntecedencia2" class="block text-sm font-medium text-gray-900">
                      Segundo aviso (dias antes)
                    </label>
                    <div class="mt-2">
                      <input
                        id="diasAntecedencia2"
                        type="number"
                        min="0"
                        max="30"
                        v-model.number="form.diasAntecedencia2"
                        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2"
                      />
                      <p class="mt-2 text-xs text-gray-500">
                        Receba um segundo aviso com esta antecedência (0 = no dia)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
                  <!-- Seção de notificações de aniversário de líderes (apenas para admins) -->
                  <div v-if="isAdmin" class="space-y-6 border-t border-gray-200 pt-8 mt-8">
                    <h4 class="text-base font-semibold text-gray-900">Aniversários de Líderes</h4>
                
                <div class="flex items-start">
                  <div class="flex items-center h-5 pt-0.5">
                    <input
                      id="notificacaoAniversarioLiderAtiva"
                      type="checkbox"
                      v-model="form.notificacaoAniversarioLiderAtiva"
                      class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </div>
                  <div class="ml-3 text-sm">
                    <label for="notificacaoAniversarioLiderAtiva" class="font-medium text-gray-900">
                      Receber notificações de aniversário de líderes no WhatsApp
                    </label>
                    <p class="mt-1 text-gray-500">
                      Você receberá notificações sobre aniversários dos líderes de células
                    </p>
                  </div>
                </div>
                
                <div v-if="form.notificacaoAniversarioLiderAtiva" class="ml-7 space-y-5">
                  <div>
                    <label for="diasAntecedenciaLider1" class="block text-sm font-medium text-gray-900">
                      Primeiro aviso (dias antes)
                    </label>
                    <div class="mt-2">
                      <input
                        id="diasAntecedenciaLider1"
                        type="number"
                        min="0"
                        max="30"
                        v-model.number="form.diasAntecedenciaLider1"
                        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2"
                      />
                      <p class="mt-2 text-xs text-gray-500">
                        Receba um aviso com esta antecedência (0 = no dia)
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label for="diasAntecedenciaLider2" class="block text-sm font-medium text-gray-900">
                      Segundo aviso (dias antes)
                    </label>
                    <div class="mt-2">
                      <input
                        id="diasAntecedenciaLider2"
                        type="number"
                        min="0"
                        max="30"
                        v-model.number="form.diasAntecedenciaLider2"
                        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2"
                      />
                      <p class="mt-2 text-xs text-gray-500">
                        Receba um segundo aviso com esta antecedência (0 = no dia)
                      </p>
                    </div>
                  </div>
                  </div>
                </div>
                
                <!-- Botão de salvar (apenas na tab de notificações) -->
                <div v-if="(isLider || isAdmin)" class="mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    :disabled="isSaving || (!isLider && !isAdmin)"
                    class="inline-flex items-center gap-2 rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  >
                    <template v-if="isSaving">
                      <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Salvando...</span>
                    </template>
                    <template v-else>
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Salvar Configurações</span>
                    </template>
                  </button>
                  
                  <!-- Botão de teste (apenas em ambiente de desenvolvimento) -->
                  <button
                    v-if="isDevelopment && isLider && form.notificacaoAniversarioAtiva"
                    type="button"
                    :disabled="isTesting"
                    @click="testAniversarioNotification"
                    class="mt-3 inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  >
                    <template v-if="isTesting">
                      <svg class="animate-spin h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Testando...</span>
                    </template>
                    <template v-else>
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Testar Notificações Agora</span>
                    </template>
                  </button>
                  
                  <p v-if="isDevelopment && isLider && form.notificacaoAniversarioAtiva" class="mt-2 text-xs text-gray-500">
                    Este botão executa o job de notificação de aniversário imediatamente (apenas em ambiente de desenvolvimento)
                  </p>
                </div>
                
                <!-- Mensagem para não-líderes e não-admins -->
                <div v-if="!isLider && !isAdmin" class="rounded-lg bg-gray-50 p-4">
                  <p class="text-sm text-gray-700">
                    As configurações de notificação de aniversário estão disponíveis apenas para líderes de célula e administradores.
                  </p>
                </div>
              </div>

              <!-- Tab: Integrações -->
              <div v-show="activeTab === 'integracoes' && isAdmin" class="space-y-6">
                <WhatsAppConnections ref="whatsappRef" />
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  </div>
</template> 