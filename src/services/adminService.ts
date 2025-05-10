import api from './api';

// Interfaces
export interface AdminStats {
  resumo: {
    totalCelulas: number;
    totalSupervisores: number;
    totalLideres: number;
    totalMembros: number;
    mediaFrequencia: number;
    crescimentoMembros: number;
    variacaoFrequencia: number;
  };
  indicadores: {
    relatoriosEnviados: number;
    consolidadoresAtivos: number;
    novosMembros: number;
    mediaMembrosPorCelula: number;
  };
  frequencia: {
    atual: {
      celula: number;
      culto: number;
      media: number;
    };
    anterior: {
      celula: number;
      culto: number;
      media: number;
    };
  };
  regioes: Array<{
    id: number;
    nome: string;
    totalCelulas: number;
    totalMembros: number;
    mediaMembros: number;
  }>;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  cargo: string;
  ativo: boolean;
  status: string;
}

export interface Celula {
  id: number;
  nome: string;
  endereco: string;
  bairro: string;
  cidade: string;
  diaSemana: string;
  horario: string;
  lider_id: number;
  lider?: Usuario;
}

export interface PaginatedResponse<T> {
  usuarios: T[];
  pagination: {
    total: number;
    pages: number;
    currentPage: number;
    perPage: number;
  };
}

// Serviço de administração
export const adminService = {
  // Obter estatísticas
  async obterEstatisticas(periodo: string): Promise<AdminStats> {
    try {
      return await api.get(`/admin/estatisticas?periodo=${periodo}`);
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  },

  // Listar usuários com paginação
  async listarUsuarios(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Usuario>> {
    try {
      return await api.get(`/admin/usuarios?page=${page}&limit=${limit}`);
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      throw error;
    }
  },

  // Criar novo usuário
  async criarUsuario(dados: Omit<Usuario, 'id' | 'status'> & { senha: string }): Promise<Usuario> {
    try {
      return await api.post('/admin/usuarios', dados);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  },

  // Atualizar usuário
  async atualizarUsuario(id: number, dados: Partial<Omit<Usuario, 'id'>>): Promise<Usuario> {
    try {
      return await api.put(`/admin/usuarios/${id}`, dados);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  },

  // Ativar/desativar usuário
  async toggleStatusUsuario(userId: number, ativo: boolean): Promise<Usuario> {
    try {
      return await api.patch(`/admin/usuarios/${userId}/status`, { ativo });
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      throw error;
    }
  },

  // Excluir usuário
  async excluirUsuario(id: number): Promise<void> {
    try {
      await api.delete(`/admin/usuarios/${id}`);
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      throw error;
    }
  },

  // Listar células com paginação
  async listarCelulas(page: number = 1, limit: number = 10) {
    console.log('[adminService] Iniciando busca de células:', { page, limit });
    try {
      const response = await api.get(`/admin/celulas?page=${page}&limit=${limit}`);
      console.log('[adminService] Resposta da API:', response);
      
      // Verificar se a resposta é válida
      if (!response || typeof response !== 'object') {
        console.error('[adminService] Resposta inválida:', response);
        throw new Error('Resposta inválida do servidor');
      }

      // Se a resposta já é o objeto que precisamos, retornar diretamente
      if (response.celulas && response.pagination) {
        return response;
      }

      // Se a resposta está dentro de data, retornar response.data
      if (response.data && typeof response.data === 'object') {
        if (response.data.celulas && response.data.pagination) {
          return response.data;
        }
      }

      console.error('[adminService] Formato de resposta inesperado:', response);
      throw new Error('Formato de resposta inválido');
    } catch (error) {
      console.error('[adminService] Erro ao listar células:', error);
      throw error;
    }
  },

  // Obter célula por ID
  async obterCelula(id: number) {
    const response = await api.get(`/admin/celulas/${id}`);
    return response.data;
  },

  // Criar nova célula
  async criarCelula(dados: Omit<Celula, 'id'>) {
    const response = await api.post('/admin/celulas', dados);
    return response.data;
  },

  // Atualizar célula
  async atualizarCelula(id: number, dados: Partial<Omit<Celula, 'id'>>) {
    const response = await api.put(`/admin/celulas/${id}`, dados);
    return response.data;
  },

  // Excluir célula
  async excluirCelula(id: number) {
    const response = await api.patch(`/admin/celulas/${id}/desativar`, { ativo: false });
    return response.data;
  }
}; 