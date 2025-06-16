<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useUsuarioConfigStore } from '../stores/usuarioConfigStore';
import { useUserStore } from '../stores/userStore';

const userStore = useUserStore();
const configStore = useUsuarioConfigStore();

// Estados do formulário
const form = ref({
  notificacaoAniversarioAtiva: true,
  diasAntecedencia1: 3,
  diasAntecedencia2: 0
});

// Estados da UI
const isSaving = ref(false);
const isTesting = ref(false);
const showSuccess = ref(false);
const errorMessage = ref('');
const testMessage = ref('');

// Verificar se o usuário é líder
const isLider = computed(() => {
  return userStore.user?.cargo === 'LIDER';
});

// Verificar se estamos em ambiente de desenvolvimento
const isDevelopment = computed(() => {
  return import.meta.env.MODE === 'development';
});

// Carregar configurações ao montar o componente
onMounted(async () => {
  await configStore.loadConfig();
  
  if (configStore.config) {
    form.value = {
      notificacaoAniversarioAtiva: configStore.config.notificacaoAniversarioAtiva,
      diasAntecedencia1: configStore.config.diasAntecedencia1,
      diasAntecedencia2: configStore.config.diasAntecedencia2
    };
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
    
    const success = await configStore.updateConfig({
      notificacaoAniversarioAtiva: form.value.notificacaoAniversarioAtiva,
      diasAntecedencia1: form.value.diasAntecedencia1,
      diasAntecedencia2: form.value.diasAntecedencia2
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
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Configurações
            </h3>
            <p class="mt-1 max-w-2xl text-sm text-gray-500">
              Personalize suas preferências de notificação
            </p>
          </div>
          
          <!-- Alerta de sucesso -->
          <div v-if="showSuccess" class="mx-4 mb-4 p-4 rounded-md bg-green-50 border border-green-200">
            <p class="text-sm text-green-700">Configurações atualizadas com sucesso!</p>
          </div>
          
          <!-- Alerta de teste -->
          <div v-if="testMessage" class="mx-4 mb-4 p-4 rounded-md bg-blue-50 border border-blue-200">
            <p class="text-sm text-blue-700">{{ testMessage }}</p>
          </div>
          
          <!-- Alerta de erro -->
          <div v-if="errorMessage" class="mx-4 mb-4 p-4 rounded-md bg-red-50 border border-red-200">
            <p class="text-sm text-red-700">{{ errorMessage }}</p>
          </div>
          
          <div class="border-t border-gray-200 px-4 py-5 sm:p-6">
            <form @submit.prevent="saveConfig" class="space-y-6">
              <!-- Seção de notificações de aniversário (apenas para líderes) -->
              <div v-if="isLider" class="space-y-6">
                <h4 class="text-md font-medium text-gray-900">Notificações de Aniversário</h4>
                
                <div class="flex items-center">
                  <div class="flex items-center h-5">
                    <input
                      id="notificacaoAniversarioAtiva"
                      type="checkbox"
                      v-model="form.notificacaoAniversarioAtiva"
                      class="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                    />
                  </div>
                  <div class="ml-3 text-sm">
                    <label for="notificacaoAniversarioAtiva" class="font-medium text-gray-700">
                      Receber notificações de aniversário no WhatsApp
                    </label>
                    <p class="text-gray-500">
                      Você receberá notificações sobre aniversários dos membros de suas células
                    </p>
                  </div>
                </div>
                
                <div v-if="form.notificacaoAniversarioAtiva" class="space-y-4 pl-7">
                  <div>
                    <label for="diasAntecedencia1" class="block text-sm font-medium text-gray-700">
                      Primeiro aviso (dias antes)
                    </label>
                    <div class="mt-1">
                      <input
                        id="diasAntecedencia1"
                        type="number"
                        min="0"
                        max="30"
                        v-model.number="form.diasAntecedencia1"
                        class="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                      <p class="mt-1 text-xs text-gray-500">
                        Receba um aviso com esta antecedência (0 = no dia)
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label for="diasAntecedencia2" class="block text-sm font-medium text-gray-700">
                      Segundo aviso (dias antes)
                    </label>
                    <div class="mt-1">
                      <input
                        id="diasAntecedencia2"
                        type="number"
                        min="0"
                        max="30"
                        v-model.number="form.diasAntecedencia2"
                        class="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      />
                      <p class="mt-1 text-xs text-gray-500">
                        Receba um segundo aviso com esta antecedência (0 = no dia)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Mensagem para não-líderes -->
              <div v-else class="bg-gray-50 p-4 rounded-md">
                <p class="text-sm text-gray-700">
                  As configurações de notificação de aniversário estão disponíveis apenas para líderes de célula.
                </p>
              </div>
              
              <div class="flex flex-col space-y-3">
                <button
                  type="submit"
                  :disabled="isSaving || !isLider"
                  class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <template v-if="isSaving">
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Salvando...
                  </template>
                  <template v-else>
                    Salvar Configurações
                  </template>
                </button>
                
                <!-- Botão de teste (apenas em ambiente de desenvolvimento) -->
                <button
                  v-if="isDevelopment && isLider && form.notificacaoAniversarioAtiva"
                  type="button"
                  :disabled="isTesting"
                  @click="testAniversarioNotification"
                  class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <template v-if="isTesting">
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Testando...
                  </template>
                  <template v-else>
                    Testar Notificações Agora
                  </template>
                </button>
                
                <p v-if="isDevelopment && isLider && form.notificacaoAniversarioAtiva" class="text-xs text-gray-500 text-center">
                  Este botão executa o job de notificação de aniversário imediatamente (apenas em ambiente de desenvolvimento)
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  </div>
</template> 