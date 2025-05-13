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
  email?: string;
  whatsapp: string;
  cargo: string;
  ativo: boolean;
  status: string;
}

export interface Celula {
  id: number;
  nome: string;
  endereco?: string;
  diaSemana: string;
  horario: string;
  lider_id?: number;
  liderId: number;
  lider?: Usuario;
  coLider_id?: number;
  coLider?: Usuario;
  supervisor_id?: number;
  supervisor?: Usuario;
  regiao_id?: number;
  regiao?: {
    id: number;
    nome: string;
  };
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
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
  async listarUsuarios(page: number = 1, limit: number = 10, cargo?: string | string[]): Promise<PaginatedResponse<Usuario>> {
    try {
      let params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      if (cargo) {
        if (Array.isArray(cargo)) {
          // Se for um array de cargos, adiciona cada um com o mesmo nome de parâmetro
          cargo.forEach(c => params.append('cargo', c));
        } else {
          // Se for um único cargo
          params.append('cargo', cargo);
        }
      }
      
      return await api.get(`/admin/usuarios?${params.toString()}`);
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      throw error;
    }
  },

  // Criar novo usuário
  async criarUsuario(dados: Omit<Usuario, 'id' | 'status'>): Promise<Usuario> {
    try {
      // Garantir que o whatsapp tenha apenas números
      const { whatsapp, nome, email, cargo } = dados
      const dadosFormatados = {
        nome,
        email,
        cargo,
        whatsapp: whatsapp.replace(/\D/g, '')
      }
      
      return await api.post('/admin/usuarios', dadosFormatados);
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
    console.log('[adminService] Obtendo célula:', id);
    try {
      const response = await api.get(`/admin/celulas/${id}`);
      console.log('[adminService] Resposta de obterCelula:', response);
      
      // Verificar se a resposta é válida
      if (!response || typeof response !== 'object') {
        console.error('[adminService] Resposta inválida:', response);
        throw new Error('Resposta inválida do servidor');
      }

      // Se a resposta já tem o formato esperado
      if (response.id && response.nome) {
        return response;
      }
      
      // Se a célula está dentro de data
      if (response.data && typeof response.data === 'object') {
        if (response.data.id && response.data.nome) {
          return response.data;
        }
        
        // Se a célula está dentro de data.celula
        if (response.data.celula && typeof response.data.celula === 'object') {
          return response.data.celula;
        }
      }
      
      // Se a célula está dentro de celula
      if (response.celula && typeof response.celula === 'object') {
        return response.celula;
      }
      
      console.error('[adminService] Formato de resposta inesperado:', response);
      throw new Error('Formato de resposta inválido');
    } catch (error) {
      console.error('[adminService] Erro ao obter célula:', error);
      throw error;
    }
  },

  // Criar nova célula
  async criarCelula(dados: Omit<Celula, 'id'>) {
    // Removemos qualquer referência à região
    const dadosSemRegiao = {
      nome: dados.nome,
      endereco: dados.endereco,
      diaSemana: dados.diaSemana,
      horario: dados.horario,
      liderId: dados.liderId,
      // Usar o formato correto supervisorId esperado pelo backend
      supervisorId: dados.supervisor_id
    }
    const response = await api.post('/admin/celulas', dadosSemRegiao);
    return response.data;
  },

  // Atualizar célula
  async atualizarCelula(id: number, dados: Partial<Omit<Celula, 'id'>>) {
    // Removemos qualquer referência à região
    const dadosSemRegiao = {
      nome: dados.nome,
      endereco: dados.endereco,
      diaSemana: dados.diaSemana,
      horario: dados.horario,
      liderId: dados.liderId,
      // Usar o formato correto supervisorId esperado pelo backend
      supervisorId: dados.supervisor_id
    }
    const response = await api.put(`/admin/celulas/${id}`, dadosSemRegiao);
    return response.data;
  },

  // Excluir célula
  async excluirCelula(id: number) {
    const response = await api.patch(`/admin/celulas/${id}/desativar`, { ativo: false });
    return response.data;
  }
}; 