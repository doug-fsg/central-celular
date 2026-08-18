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
    coLideresAtivos: number;
    novosMembros: number;
    mediaMembrosPorCelula: number;
  };
  frequencia: {
    atual: {
      /** Percentual médio de presenças (tipo célula) no período */
      celula: number;
      /** Percentual médio de presenças (tipo culto) no período */
      culto: number;
      /** Média geral ponderada (célula + culto) */
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
  porPublico: Array<{
    publico: string;
    totalCelulas: number;
    totalMembros: number;
    relatoriosEnviados: number;
  }>;
  filtros: {
    liderId: number | null;
    publico: string | null;
  };
}

export type StatusSemafaro = 'ok' | 'atencao' | 'critico';

/** Resposta GET /admin/dashboard-cuidado */
export interface DashboardCuidadoResponse {
  resumo: {
    totalCelulas: number;
    totalMembros: number;
    comCuidador: number;
    semCuidador: number;
    percentualCobertura: number;
    statusSemafaro: StatusSemafaro;
    consolidadoresSobrecarregados: number;
    consolidadoresAtivos: number;
  };
  celulas: Array<{
    celulaId: number;
    nome: string;
    liderNome: string;
    totalMembros: number;
    comCuidador: number;
    semCuidador: number;
    percentualCobertura: number;
    qtdConsolidadores: number;
  }>;
  alertas: {
    membrosSemCuidador: Array<{
      membroId: number;
      nome: string;
      celulaId: number;
      celulaNome: string;
    }>;
    celulasBaixaCobertura: Array<{
      celulaId: number;
      nome: string;
      percentualCobertura: number;
      semCuidador: number;
    }>;
    consolidadoresSobrecarregados: Array<{
      consolidadorId: number;
      nome: string;
      celulaId: number;
      celulaNome: string;
      qtdCuidados: number;
    }>;
  };
  filtros: {
    liderId: number | null;
  };
  limiares: {
    coberturaBaixaPct: number;
    semaforoOkGte: number;
    semaforoCriticoLt: number;
    limiteFeedMembros: number;
    maxAlertasPorTipoUi: number;
  };
  totaisAlertas: {
    membrosSemCuidador: number;
    celulasBaixaCobertura: number;
    consolidadoresSobrecarregados: number;
  };
  listas: {
    membrosSemCuidador: Array<{
      membroId: number;
      nome: string;
      celulaId: number;
      celulaNome: string;
    }>;
    celulasBaixaCobertura: Array<{
      celulaId: number;
      nome: string;
      percentualCobertura: number;
      semCuidador: number;
    }>;
    membrosComCuidador: Array<{
      membroId: number;
      nome: string;
      celulaId: number;
      celulaNome: string;
      cuidadorNome: string | null;
    }>;
    todosMembros: Array<{
      membroId: number;
      nome: string;
      celulaId: number;
      celulaNome: string;
    }>;
  };
}

/** Resposta GET /admin/dashboard-semana */
export interface ParticipacaoMembroItem {
  membroId: number;
  membroNome: string;
  liderNome: string;
  cuidadorNome: string | null;
}

export interface LiderRelatorioItem {
  liderId: number;
  liderNome: string;
  celulas: string[];
}

export interface DashboardSemanaResponse {
  periodo: { inicio: string; fim: string };
  participacao: {
    totalMembros: number;
    culto: { presentes: number; total: number; percentual: number };
    celula: { presentes: number; total: number; percentual: number };
    listas: {
      culto: ParticipacaoMembroItem[];
      celula: ParticipacaoMembroItem[];
    };
  };
  relatorios: {
    lideresTotal: number;
    lideresPreencheram: number;
    pendentes: number;
    percentualAdesao: number;
    listas: {
      preencheram: LiderRelatorioItem[];
      pendentes: LiderRelatorioItem[];
    };
  };
  filtros: { liderId: number | null };
}

export interface Usuario {
  id: number;
  nome: string;
  whatsapp: string;
  cargo: string;
  ativo: boolean;
  status: string;
  /** Indica se já definiu senha (login). Ausente em respostas antigas em cache. */
  possuiSenha?: boolean;
}

export interface Celula {
  id: number;
  nome: string;
  publico?: 'homens' | 'mulheres' | 'misto' | 'nao_informado';
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

export interface MembroCompleto {
  id: number;
  nome: string;
  telefone?: string;
  celulaId: number;
  ativo: boolean;
  ehConsolidador: boolean;
  ehCoLider: boolean;
  ehAnfitriao: boolean;
  celula: {
    id: number;
    nome: string;
    lider: {
      id: number;
      nome: string;
    } | null;
  };
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

export interface PushSubscriber {
  userId: number;
  nome: string;
  cargo: string;
  platforms: string[];
  deviceCount: number;
  updatedAt: string;
}

export interface PushSendResult {
  sent: number;
  skipped: number;
  failed: number;
  message?: string;
  usersTargeted?: number;
  usersWithSend?: number;
}

export interface PushSubscribersResponse {
  subscribers: PushSubscriber[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
  };
}

export interface PushSendPayload {
  title: string;
  body: string;
  url?: string;
}

// Serviço de administração
export const adminService = {
  // Obter estatísticas
  async obterEstatisticas(periodo: string, liderId?: number, publico?: string): Promise<AdminStats> {
    try {
      let url = `/admin/estatisticas?periodo=${periodo}`;
      if (liderId) {
        url += `&liderId=${liderId}`;
      }
      if (publico) {
        url += `&publico=${publico}`;
      }
      return await api.get(url);
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  },

  async obterDashboardCuidado(
    liderId?: number,
    opts?: { signal?: AbortSignal },
  ): Promise<DashboardCuidadoResponse> {
    let url = '/admin/dashboard-cuidado';
    if (liderId != null && !Number.isNaN(liderId)) {
      url += `?liderId=${liderId}`;
    }
    return await api.get(url, opts?.signal ? { signal: opts.signal } : undefined);
  },

  async obterDashboardSemana(
    dataInicio: string,
    dataFim: string,
    liderId?: number,
    opts?: { signal?: AbortSignal },
  ): Promise<DashboardSemanaResponse> {
    const params = new URLSearchParams({ dataInicio, dataFim });
    if (liderId != null && !Number.isNaN(liderId)) {
      params.set('liderId', String(liderId));
    }
    return await api.get(
      `/admin/dashboard-semana?${params}`,
      opts?.signal ? { signal: opts.signal } : undefined,
    );
  },

  // Listar usuários com paginação
  async listarUsuarios(
    page: number = 1,
    limit: number = 10,
    cargo?: string | string[],
    sort?: { sortBy?: string; sortDir?: 'asc' | 'desc' },
  ): Promise<PaginatedResponse<Usuario>> {
    try {
      let params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      
      if (cargo) {
        if (Array.isArray(cargo)) {
          cargo.forEach(c => params.append('cargo', c));
        } else {
          params.append('cargo', cargo);
        }
      }

      if (sort?.sortBy) {
        params.append('sortBy', sort.sortBy);
        params.append('sortDir', sort.sortDir ?? 'asc');
      }
      
      return await api.get(`/admin/usuarios?${params.toString()}`);
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      throw error;
    }
  },

  // Criar novo usuário (conviteEnviado vem do backend quando enviarConvite = true)
  async criarUsuario(
    dados: Omit<Usuario, 'id' | 'status'> & { enviarConvite?: boolean }
  ): Promise<Usuario & { conviteEnviado?: boolean }> {
    try {
      // Garantir que o whatsapp tenha apenas números
      const { whatsapp, nome, cargo, enviarConvite } = dados
      const dadosFormatados: any = {
        nome,
        cargo,
        whatsapp: whatsapp.replace(/\D/g, '')
      }
      
      // Incluir enviarConvite se fornecido
      if (enviarConvite !== undefined) {
        dadosFormatados.enviarConvite = enviarConvite
      }
      
      return await api.post('/admin/usuarios', dadosFormatados);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  },

  /** Reenvia link de primeiro acesso (WhatsApp). Só para usuário ativo sem senha. */
  async reenviarConviteUsuario(userId: number): Promise<{ conviteEnviado: boolean }> {
    return api.post(`/admin/usuarios/${userId}/reenviar-convite`, {});
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

  async alterarStatusUsuariosLote(
    usuarioIds: number[],
    ativo: boolean,
  ): Promise<{
    success: boolean;
    total: number;
    alterados: number;
    falhas: number;
    detalhes: { usuarioId: number; ok: boolean; erro?: string }[];
  }> {
    try {
      return await api.patch('/admin/usuarios/lote/status', { usuarioIds, ativo });
    } catch (error) {
      console.error('Erro ao alterar status em lote:', error);
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

  // Listar células com paginação (opcionalmente filtrando por líder, dia da semana e busca)
  async listarCelulas(
    page: number = 1,
    limit: number = 10,
    liderId?: number,
    diaSemana?: string,
    search?: string,
    publico?: string,
    sort?: { sortBy?: string; sortDir?: 'asc' | 'desc' },
  ) {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (liderId) params.append('lider', String(liderId))
      if (diaSemana) params.append('diaSemana', diaSemana)
      if (search?.trim()) params.append('search', search.trim())
      if (publico) params.append('publico', publico)
      if (sort?.sortBy) {
        params.append('sortBy', sort.sortBy)
        params.append('sortDir', sort.sortDir ?? 'asc')
      }
      const response = await api.get(`/admin/celulas?${params.toString()}`);
      
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

  async statusRelatoriosCelulas(
    celulaIds: number[],
    mes?: number,
    ano?: number
  ): Promise<{ semanas: string[]; porCelula: Record<string, boolean[]> }> {
    if (celulaIds.length === 0) {
      return { semanas: [], porCelula: {} };
    }

    const params = new URLSearchParams({ ids: celulaIds.join(',') });
    if (mes !== undefined) params.append('mes', String(mes));
    if (ano !== undefined) params.append('ano', String(ano));

    return api.get(`/admin/celulas/status-relatorios?${params.toString()}`);
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
      publico: dados.publico,
      endereco: dados.endereco,
      diaSemana: dados.diaSemana,
      horario: dados.horario,
      liderId: dados.liderId,
      supervisorId: dados.supervisor_id
    }
    const response = await api.post('/admin/celulas', dadosSemRegiao);
    return response?.data ?? response;
  },

  // Atualizar célula
  async atualizarCelula(id: number, dados: Partial<Omit<Celula, 'id'>>) {
    const dadosSemRegiao = {
      nome: dados.nome,
      publico: dados.publico,
      endereco: dados.endereco,
      diaSemana: dados.diaSemana,
      horario: dados.horario,
      liderId: dados.liderId,
      supervisorId: dados.supervisor_id
    }
    const response = await api.put(`/admin/celulas/${id}`, dadosSemRegiao);
    return response?.data ?? response;
  },

  // Excluir célula
  async excluirCelula(id: number) {
    const response = await api.delete(`/admin/celulas/${id}`);
    return response.data;
  },

  async exportarCelulasCsv(filters?: {
    publico?: string;
    diaSemana?: string;
    search?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.publico) params.append('publico', filters.publico);
    if (filters?.diaSemana) params.append('diaSemana', filters.diaSemana);
    if (filters?.search?.trim()) params.append('search', filters.search.trim());
    const query = params.toString();
    const endpoint = `/admin/celulas/exportar${query ? `?${query}` : ''}`;
    const mes = new Date().toISOString().slice(0, 7);
    await api.download(endpoint, `celulas-${mes}.csv`);
  },

  // Listar membros de uma célula
  async listarMembrosCelula(celulaId: number) {
    // Endpoint público autenticado para membros da célula
    return api.get(`/celulas/${celulaId}/membros`)
  }
  ,
  // Obter estatísticas de frequência de uma célula (últimos dias/relatórios)
  async obterEstatisticasFrequencia(celulaId: number) {
    // Reaproveita controller de relatorios: GET /api/relatorios/estatisticas/:celulaId
    return api.get(`/relatorios/estatisticas/${celulaId}`)
  },

  // Listar todos os membros com paginação
  async listarMembros(
    page: number = 1,
    limit: number = 20,
    options?: { search?: string; sortBy?: string; sortDir?: 'asc' | 'desc' },
  ) {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (options?.search?.trim()) params.append('search', options.search.trim());
      if (options?.sortBy) {
        params.append('sortBy', options.sortBy);
        params.append('sortDir', options.sortDir ?? 'asc');
      }
      const response = await api.get(`/admin/membros?${params.toString()}`);
      
      if (!response || typeof response !== 'object') {
        throw new Error('Resposta inválida do servidor');
      }

      if (response.membros && response.pagination) {
        return response;
      }

      if (response.data && typeof response.data === 'object') {
        if (response.data.membros && response.data.pagination) {
          return response.data;
        }
      }

      throw new Error('Formato de resposta inválido');
    } catch (error) {
      console.error('Erro ao listar membros:', error);
      throw error;
    }
  },

  async listarInscritosPush(
    search?: string,
    page = 1,
    perPage = 50,
  ): Promise<PushSubscribersResponse> {
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(perPage),
    });
    if (search?.trim()) params.append('search', search.trim());
    const response = await api.get(`/admin/push/subscribers?${params.toString()}`);
    const payload = response?.data ?? response;
    return {
      subscribers: payload.subscribers ?? [],
      pagination: payload.pagination ?? { page, perPage, total: 0 },
    };
  },

  async enviarPushUsuario(userId: number, dados: PushSendPayload): Promise<PushSendResult> {
    const response = await api.post(`/admin/push/users/${userId}/send`, dados);
    return response?.data ?? response;
  },

  async enviarPushTodos(dados: PushSendPayload): Promise<PushSendResult> {
    const response = await api.post('/admin/push/send-all', { ...dados, confirm: true });
    return response?.data ?? response;
  },
}; 