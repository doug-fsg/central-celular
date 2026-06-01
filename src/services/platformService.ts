import api from './api';

export interface PlatformAccount {
  id: number;
  nome: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    usuarios: number;
    celulas: number;
    regioes: number;
  };
}

export interface PlatformAccountUser {
  id: number;
  nome: string;
  whatsapp: string;
  cargo: string;
  ativo: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
}

export const platformService = {
  async listarContas(): Promise<PlatformAccount[]> {
    return api.get('/accounts');
  },

  async criarConta(nome: string): Promise<PlatformAccount> {
    return api.post('/accounts', { nome });
  },

  async alternarContaAtiva(id: number, ativo: boolean): Promise<PlatformAccount> {
    return api.patch(`/accounts/${id}/toggle-active`, { ativo });
  },

  async listarUsuariosDaConta(accountId: number): Promise<{
    account: { id: number; nome: string };
    usuarios: PlatformAccountUser[];
  }> {
    return api.get(`/accounts/${accountId}/usuarios`);
  },
};
