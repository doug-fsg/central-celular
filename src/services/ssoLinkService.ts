import api from './api';

export interface SsoLinkConfig {
  id: number;
  accountId: number;
  envioLinkSsoAtivo: boolean;
  createdAt: string;
  updatedAt: string;
}

export const ssoLinkService = {
  // Obter configuração de envio de links SSO
  async getConfig(): Promise<SsoLinkConfig> {
    try {
      return await api.get('/sso/config');
    } catch (error) {
      console.error('Erro ao obter configuração de links SSO:', error);
      throw error;
    }
  },

  // Atualizar configuração de envio de links SSO
  async updateConfig(envioLinkSsoAtivo: boolean): Promise<SsoLinkConfig> {
    try {
      return await api.put('/sso/config', { envioLinkSsoAtivo });
    } catch (error) {
      console.error('Erro ao atualizar configuração de links SSO:', error);
      throw error;
    }
  },

  // Gerar e enviar link SSO para um líder
  async gerarEnviarLink(usuarioId: number): Promise<{ success: boolean; message: string }> {
    try {
      return await api.post(`/sso/gerar/${usuarioId}`, {});
    } catch (error) {
      console.error('Erro ao gerar e enviar link SSO:', error);
      throw error;
    }
  },

  async gerarEnviarLinkLote(usuarioIds: number[]): Promise<{
    success: boolean
    total: number
    enviados: number
    falhas: number
    detalhes: { usuarioId: number; ok: boolean; erro?: string }[]
  }> {
    try {
      return await api.post('/sso/gerar-lote', { usuarioIds });
    } catch (error) {
      console.error('Erro ao gerar e enviar links SSO em lote:', error);
      throw error;
    }
  },

  // Validar link SSO (usado na página pública)
  async validarLink(token: string): Promise<{ 
    valid: boolean; 
    message: string; 
    usuario?: { 
      id: number; 
      nome: string; 
      cargo: string; 
      accountId: number;
      celulaId: number | null;
      isSuperAdmin?: boolean;
    };
    token?: string;
  }> {
    try {
      return await api.get(`/sso/validate/${token}`);
    } catch (error) {
      console.error('Erro ao validar link SSO:', error);
      throw error;
    }
  }
}; 