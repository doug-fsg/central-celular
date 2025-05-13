<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { whatsappService } from '../services/whatsappService'

// Estados
const connectionName = ref('')
const loading = ref(false)
const error = ref('')
const qrCode = ref('')
const hasActiveConnection = ref(false)
const showInstructions = ref(false)
const verifyingConnection = ref(false)
const connectionStatus = ref('')
const countdown = ref(20)
const countdownInterval = ref(null as any)
const deleting = ref(false)
const showDeleteConfirmation = ref(false)
const activeConnectionToken = ref('')
const activeConnectionDetails = ref<{
  name: string;
  phoneNumber?: string;
  status: string;
  connectedAt?: string;
} | null>(null)

// Computados
const countdownProgress = computed(() => {
  return ((20 - countdown.value) / 20) * 100
})

const countdownColor = computed(() => {
  if (countdown.value > 10) return 'text-green-500'
  if (countdown.value > 5) return 'text-yellow-500'
  return 'text-red-500'
})

// Verificar conexão ativa ao montar o componente
onMounted(async () => {
  await checkActiveConnection()
})

// Verificar se existe conexão ativa
async function checkActiveConnection() {
  try {
    loading.value = true
    error.value = ''
    
    hasActiveConnection.value = await whatsappService.hasActiveConnection();
    
    // Se tiver conexão ativa, buscar detalhes
    if (hasActiveConnection.value) {
      const connections = await whatsappService.getAccountConnections();
      const activeConnection = connections.find((c) => c.status === 'connected');
      if (activeConnection && activeConnection.token) {
        activeConnectionToken.value = activeConnection.token;
        activeConnectionDetails.value = {
          name: activeConnection.name,
          phoneNumber: activeConnection.phoneNumber,
          status: activeConnection.status,
          connectedAt: activeConnection.connectedAt
        };
      }
    } else {
      activeConnectionDetails.value = null;
    }
  } catch (error) {
    console.error('Erro ao verificar conexão ativa:', error);
  } finally {
    loading.value = false
  }
}

// Abrir modal de confirmação
function confirmDeleteConnection() {
  showDeleteConfirmation.value = true
}

// Deletar conexão
async function deleteConnection() {
  if (!activeConnectionToken.value) {
    error.value = 'Token da conexão não encontrado'
    showDeleteConfirmation.value = false
    return
  }

  try {
    deleting.value = true
    await whatsappService.deleteConnection(activeConnectionToken.value)
    
    // Atualizar estado
    hasActiveConnection.value = false
    activeConnectionToken.value = ''
    showDeleteConfirmation.value = false
    
    // Mostrar sucesso
    connectionStatus.value = 'Conexão deletada com sucesso!'
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao deletar conexão'
    console.error('Erro ao deletar conexão:', err)
  } finally {
    deleting.value = false
  }
}

// Iniciar contagem regressiva
function startCountdown(token: string) {
  countdown.value = 20
  connectionStatus.value = 'Aguardando leitura do QR Code...'
  
  countdownInterval.value = setInterval(async () => {
    countdown.value--
    
    if (countdown.value <= 0) {
      clearInterval(countdownInterval.value)
      connectionStatus.value = 'Verificando conexão...'
      
      try {
        const isConnected = await whatsappService.checkConnection(token)
        if (isConnected) {
          connectionStatus.value = 'Conexão estabelecida com sucesso!'
          await checkActiveConnection()
          activeConnectionToken.value = token
        } else {
          connectionStatus.value = 'Conexão não estabelecida. Tente novamente.'
          error.value = 'Não foi possível estabelecer a conexão'
        }
      } catch (err) {
        console.error('Erro ao verificar conexão:', err)
        connectionStatus.value = 'Erro ao verificar conexão'
        error.value = 'Erro ao verificar o status da conexão'
      }
    }
  }, 1000)
}

// Gerar QR Code
async function handleGenerateQRCode() {
  if (!connectionName.value.trim()) {
    error.value = 'Por favor, insira um nome para a conexão'
    return
  }

  // Verificar novamente se existe conexão ativa
  await checkActiveConnection()
  
  if (hasActiveConnection.value) {
    error.value = 'Já existe uma conexão ativa. Você precisa deletá-la antes de criar uma nova.'
    return
  }

  try {
    loading.value = true
    error.value = ''
    connectionStatus.value = 'Gerando QR Code...'
    const connection = await whatsappService.generateQRCode(connectionName.value)
    qrCode.value = connection.qrCode || ''
    
    // Iniciar verificação
    verifyingConnection.value = true
    if (connection.token) {
      startCountdown(connection.token)
    }
    
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Erro ao gerar QR Code'
    console.error('Erro ao gerar QR Code:', err)
  } finally {
    loading.value = false
  }
}

// Limpar intervalo ao desmontar o componente
onUnmounted(() => {
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
  }
})
</script>

<template>
  <div class="bg-white shadow-sm rounded-lg">
    <div class="px-4 py-5 sm:p-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-lg font-medium text-gray-900">Gerar QR Code</h2>
        <button
          type="button"
          class="inline-flex items-center text-sm text-primary-600 hover:text-primary-500"
          @click="showInstructions = !showInstructions"
        >
          <svg 
            class="h-5 w-5 mr-1" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
          </svg>
          {{ showInstructions ? 'Ocultar ajuda' : 'Preciso de ajuda' }}
        </button>
      </div>

      <!-- Instruções (colapsável) -->
      <div
        v-show="showInstructions"
        class="mb-6 bg-blue-50 rounded-lg p-4 transition-all duration-200 ease-in-out"
      >
        <div class="text-sm text-blue-700">
          <ol class="list-decimal list-inside space-y-1">
            <li>Digite um nome para identificar esta conexão</li>
            <li>Clique em "Gerar QR Code"</li>
            <li>Abra o WhatsApp no seu celular</li>
            <li>Toque em Menu (⋮) > WhatsApp Web</li>
            <li>Aponte a câmera do celular para o QR Code</li>
          </ol>
        </div>
      </div>

      <!-- Status da Conexão com Cronômetro -->
      <div v-if="verifyingConnection" class="mb-6">
        <div class="flex items-center justify-center mb-4">
          <div class="relative">
            <!-- Círculo de progresso -->
            <svg class="w-20 h-20 transform -rotate-90">
              <circle
                class="text-gray-200"
                stroke-width="5"
                stroke="currentColor"
                fill="transparent"
                r="30"
                cx="40"
                cy="40"
              />
              <circle
                :class="countdownColor"
                stroke-width="5"
                :stroke-dasharray="188.5"
                :stroke-dashoffset="188.5 - (188.5 * countdownProgress) / 100"
                stroke-linecap="round"
                stroke="currentColor"
                fill="transparent"
                r="30"
                cx="40"
                cy="40"
              />
            </svg>
            <!-- Número do countdown -->
            <div 
              class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold"
              :class="countdownColor"
            >
              {{ countdown }}
            </div>
          </div>
        </div>

        <div class="text-center">
          <p class="text-sm font-medium" :class="countdownColor">
            {{ connectionStatus }}
          </p>
        </div>
      </div>

      <!-- Alerta de conexão ativa -->
      <div v-if="hasActiveConnection" class="mb-6 rounded-md bg-green-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3 flex-grow">
            <h3 class="text-sm font-medium text-green-800">
              Conexão WhatsApp Ativa
            </h3>
            <div class="mt-2 text-sm text-green-700 space-y-1">
              <p v-if="activeConnectionDetails?.name">
                <span class="font-semibold">Nome:</span> {{ activeConnectionDetails.name }}
              </p>
              <p v-if="activeConnectionDetails?.phoneNumber">
                <span class="font-semibold">Telefone:</span> {{ activeConnectionDetails.phoneNumber }}
              </p>
              <p v-if="activeConnectionDetails?.connectedAt">
                <span class="font-semibold">Conectado em:</span> {{ new Date(activeConnectionDetails.connectedAt).toLocaleString() }}
              </p>
              <p>
                <span class="font-semibold">Status:</span> 
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Conectado
                </span>
              </p>
            </div>
          </div>
          <div class="ml-3">
            <button
              type="button"
              @click="confirmDeleteConnection"
              class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              :disabled="deleting"
            >
              <svg v-if="deleting" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ deleting ? 'Deletando...' : 'Deletar Conexão' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal de confirmação -->
      <div v-if="showDeleteConfirmation" class="fixed inset-0 z-10 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <!-- Background overlay -->
          <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

          <!-- Modal panel -->
          <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
            <div>
              <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg class="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-5">
                <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Confirmar exclusão
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">
                    Tem certeza que deseja deletar esta conexão? Esta ação não pode ser desfeita e você perderá o acesso a este dispositivo WhatsApp.
                  </p>
                </div>
              </div>
            </div>
            <div class="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
              <button 
                type="button" 
                @click="deleteConnection"
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm"
                :disabled="deleting"
              >
                {{ deleting ? 'Deletando...' : 'Deletar' }}
              </button>
              <button 
                type="button" 
                @click="showDeleteConfirmation = false"
                class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                :disabled="deleting"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Formulário -->
      <form v-if="!hasActiveConnection" @submit.prevent="handleGenerateQRCode" class="space-y-6">
        <div>
          <label for="connectionName" class="block text-sm font-medium text-gray-700">
            Nome da Conexão
          </label>
          <div class="mt-1">
            <input
              type="text"
              id="connectionName"
              v-model="connectionName"
              :disabled="loading"
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              placeholder="Ex: WhatsApp Principal"
            />
          </div>
        </div>

        <!-- Mensagem de erro -->
        <div v-if="error" class="rounded-md bg-red-50 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">
                Erro
              </h3>
              <div class="mt-2 text-sm text-red-700">
                <p>{{ error }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end">
          <button
            type="submit"
            :disabled="loading"
            class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              v-if="loading"
              class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {{ loading ? 'Gerando...' : 'Gerar QR Code' }}
          </button>
        </div>
      </form>

      <!-- Mensagem informativa quando já existe conexão ativa -->
      <div v-if="hasActiveConnection && !verifyingConnection && !qrCode" class="text-center py-8">
        <p class="text-gray-500">
          Já existe uma conexão WhatsApp ativa. Se desejar criar uma nova conexão, delete a conexão atual.
        </p>
      </div>

      <!-- QR Code -->
      <div v-if="qrCode" class="mt-8">
        <div class="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <h2 class="text-lg font-medium text-gray-900 mb-4">QR Code Gerado</h2>
          <div class="flex justify-center">
            <img
              :src="qrCode"
              alt="QR Code para conexão do WhatsApp"
              class="max-w-full h-auto"
            />
          </div>
          <p class="mt-4 text-sm text-gray-500 text-center">
            Escaneie este QR Code com seu WhatsApp para estabelecer a conexão
          </p>
        </div>
      </div>
    </div>
  </div>
</template> 