import api from './api';

export interface UsuarioConfig {
  id: number;
  usuarioId: number;
  notificacaoAniversarioAtiva: boolean;
  diasAntecedencia1: number;
  diasAntecedencia2: number;
  createdAt: string;
  updatedAt: string;
}

export const usuarioConfigService = {
  // Obter configurações do usuário
  async getConfig(): Promise<UsuarioConfig> {
    const response = await api.get('/usuario/config');
    return response.data;
  },

  // Atualizar configurações do usuário
  async updateConfig(config: {
    notificacaoAniversarioAtiva?: boolean;
    diasAntecedencia1?: number;
    diasAntecedencia2?: number;
  }): Promise<UsuarioConfig> {
    const response = await api.put('/usuario/config', config);
    return response.data;
  },

  // Testar notificação de aniversário (apenas em ambiente de desenvolvimento)
  async testAniversarioNotification(): Promise<{success: boolean; message: string}> {
    const response = await api.post('/usuario/config/test-notification', {});
    return response;
  }
}; 