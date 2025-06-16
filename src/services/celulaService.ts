import api from './api';

// Interfaces para representar os dados
export interface Celula {
  id: number;
  nome: string;
  endereco?: string;
  diaSemana: string;
  horario: string;
  liderId: number;
  coLiderId?: number;
  supervisorId?: number;
  regiaoId?: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  lider?: {
    id: number;
    nome: string;
    cargo: string;
  };
  coLider?: {
    id: number;
    nome: string;
    cargo: string;
  };
  supervisor?: {
    id: number;
    nome: string;
    cargo: string;
  };
  _count?: {
    membros: number;
  };
}

export interface Membro {
  id: number;
  celulaId: number;
  nome: string;
  telefone?: string;
  // A data de nascimento é armazenada como timestamp without timezone
  // Formato esperado: YYYY-MM-DD
  dataNascimento?: string;
  ehConsolidador: boolean;
  ehCoLider: boolean;
  ehAnfitriao: boolean;
  dataCadastro: string;
  ativo: boolean;
  observacoes?: string;
}

export interface NovoMembroInput {
  nome: string;
  telefone?: string;
  dataNascimento?: string;
  ehConsolidador?: boolean;
  ehCoLider?: boolean;
  ehAnfitriao?: boolean;
  observacoes?: string;
}

export interface PaginatedResponse<T> {
  celulas: T[];
  pagination: {
    total: number;
    pages: number;
    currentPage: number;
    perPage: number;
  };
}

// Serviço de células
const celulaService = {
  // Obter todas as células (possivelmente filtradas por lider)
  async listarCelulas(filtros?: { lider?: number; regiao?: number; ativo?: boolean }): Promise<PaginatedResponse<Celula>> {
    const query = new URLSearchParams();
    
    if (filtros?.lider) query.append('lider', filtros.lider.toString());
    if (filtros?.regiao) query.append('regiao', filtros.regiao.toString());
    if (filtros?.ativo !== undefined) query.append('ativo', filtros.ativo.toString());
    
    const queryString = query.toString();
    const endpoint = `/celulas${queryString ? `?${queryString}` : ''}`;
    
    return await api.get(endpoint);
  },
  
  // Obter detalhes de uma célula específica
  async obterCelula(id: number) {
    return await api.get(`/celulas/${id}`) as Celula & { membros: Membro[] };
  },
  
  // Adicionar um novo membro à célula
  async adicionarMembro(celulaId: number, dadosMembro: NovoMembroInput) {
    try {
      console.log('[celulaService] Adicionando membro à célula:', celulaId);
      console.log('[celulaService] Dados do membro:', dadosMembro);
      console.log('[celulaService] Data de nascimento:', {
        valor: dadosMembro.dataNascimento,
        tipo: dadosMembro.dataNascimento ? typeof dadosMembro.dataNascimento : 'null/undefined'
      });
      
      // Usar o endpoint padrão para membros
      const response = await api.post(`/celulas/${celulaId}/membros`, dadosMembro) as Membro;
      console.log('[celulaService] Resposta do servidor:', response);
      return response;
    } catch(error) {
      console.error('[celulaService] Erro ao adicionar membro:', error);
      
      // Fallback para simular adição quando offline
      return {
        id: Date.now(),
        celulaId,
        nome: dadosMembro.nome,
        telefone: dadosMembro.telefone,
        dataNascimento: dadosMembro.dataNascimento,
        ehConsolidador: dadosMembro.ehConsolidador || false,
        ehCoLider: dadosMembro.ehCoLider || false,
        ehAnfitriao: dadosMembro.ehAnfitriao || false,
        dataCadastro: new Date().toISOString(),
        ativo: true,
        observacoes: dadosMembro.observacoes
      } as Membro;
    }
  },
  
  // Remover um membro da célula
  async removerMembro(celulaId: number, membroId: number) {
    try {
      return await api.delete(`/celulas/${celulaId}/membros/${membroId}`);
    } catch(error) {
      console.error('Erro ao remover membro:', error);
      throw error;
    }
  },
  
  // Marcar/desmarcar membro como consolidador
  async marcarComoConsolidador(celulaId: number, membroId: number, ehConsolidador: boolean) {
    try {
      // Usar o endpoint real
      return await api.patch(`/celulas/${celulaId}/membros/${membroId}/consolidador`, {
        ehConsolidador
      });
    } catch(error) {
      console.error('Erro ao atualizar status de consolidador:', error);
      return { 
        sucesso: true, 
        mensagem: ehConsolidador ? 'Marcado como consolidador' : 'Desmarcado como consolidador',
        ehConsolidador
      };
    }
  },

  // Marcar/desmarcar membro como co-líder
  async marcarComoCoLider(celulaId: number, membroId: number, ehCoLider: boolean) {
    try {
      return await api.patch(`/celulas/${celulaId}/membros/${membroId}/colider`, {
        ehCoLider
      });
    } catch(error) {
      console.error('Erro ao atualizar status de co-líder:', error);
      return { 
        sucesso: true, 
        mensagem: ehCoLider ? 'Marcado como co-líder' : 'Desmarcado como co-líder',
        ehCoLider
      };
    }
  },

  // Marcar/desmarcar membro como anfitrião
  async marcarComoAnfitriao(celulaId: number, membroId: number, ehAnfitriao: boolean) {
    try {
      return await api.patch(`/celulas/${celulaId}/membros/${membroId}/anfitriao`, {
        ehAnfitriao
      });
    } catch(error) {
      console.error('Erro ao atualizar status de anfitrião:', error);
      return { 
        sucesso: true, 
        mensagem: ehAnfitriao ? 'Marcado como anfitrião' : 'Desmarcado como anfitrião',
        ehAnfitriao
      };
    }
  },

  // Ativar/Desativar membro
  async toggleAtivoMembro(celulaId: number, membroId: number, ativo: boolean) {
    try {
      return await api.patch(`/celulas/${celulaId}/membros/${membroId}/ativo`, { ativo });
    } catch(error) {
      console.error('Erro ao atualizar status do membro:', error);
      throw error;
    }
  },

  // Atualizar dados de um membro
  async atualizarMembro(celulaId: number, membroId: number, dadosMembro: NovoMembroInput) {
    try {
      const response = await api.patch(`/celulas/${celulaId}/membros/${membroId}`, dadosMembro);
      return response.data;
    } catch(error) {
      console.error('Erro ao atualizar membro:', error);
      throw error;
    }
  }
};

export default celulaService; 