import { defineStore } from 'pinia';
import { ref } from 'vue';
import { usuarioConfigService, UsuarioConfig } from '../services/usuarioConfigService';

export const useUsuarioConfigStore = defineStore('usuarioConfig', () => {
  const config = ref<UsuarioConfig | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  // Carregar configurações do usuário
  async function loadConfig() {
    loading.value = true;
    error.value = null;
    
    try {
      config.value = await usuarioConfigService.getConfig();
    } catch (err: any) {
      console.error('Erro ao carregar configurações:', err);
      error.value = err.message || 'Erro ao carregar configurações';
      config.value = null;
    } finally {
      loading.value = false;
    }
  }
  
  // Atualizar configurações do usuário
  async function updateConfig(newConfig: {
    notificacaoAniversarioAtiva?: boolean;
    diasAntecedencia1?: number;
    diasAntecedencia2?: number;
  }) {
    loading.value = true;
    error.value = null;
    
    try {
      config.value = await usuarioConfigService.updateConfig(newConfig);
      return true;
    } catch (err: any) {
      console.error('Erro ao atualizar configurações:', err);
      error.value = err.message || 'Erro ao atualizar configurações';
      return false;
    } finally {
      loading.value = false;
    }
  }
  
  // Testar notificação de aniversário (apenas em ambiente de desenvolvimento)
  async function testAniversarioNotification() {
    loading.value = true;
    error.value = null;
    
    try {
      const result = await usuarioConfigService.testAniversarioNotification();
      return result;
    } catch (err: any) {
      console.error('Erro ao testar notificação:', err);
      error.value = err.message || 'Erro ao testar notificação';
      return { success: false, message: error.value };
    } finally {
      loading.value = false;
    }
  }
  
  return {
    config,
    loading,
    error,
    loadConfig,
    updateConfig,
    testAniversarioNotification
  };
}); 