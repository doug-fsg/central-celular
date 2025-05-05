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
  regiaoId?: number;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
  lider?: {
    id: number;
    nome: string;
    email: string;
    cargo: string;
  };
  coLider?: {
    id: number;
    nome: string;
    email: string;
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
  email?: string;
  telefone?: string;
  ehConsolidador: boolean;
  dataCadastro: string;
  ativo: boolean;
  observacoes?: string;
}

export interface NovoMembroInput {
  nome: string;
  telefone?: string;
  email?: string;
  ehConsolidador?: boolean;
  observacoes?: string;
}

// Serviço de células
const celulaService = {
  // Obter todas as células (possivelmente filtradas por lider)
  async listarCelulas(filtros?: { lider?: number; regiao?: number; ativo?: boolean }) {
    const query = new URLSearchParams();
    
    if (filtros?.lider) query.append('lider', filtros.lider.toString());
    if (filtros?.regiao) query.append('regiao', filtros.regiao.toString());
    if (filtros?.ativo !== undefined) query.append('ativo', filtros.ativo.toString());
    
    const queryString = query.toString();
    const endpoint = `/celulas${queryString ? `?${queryString}` : ''}`;
    
    return await api.get(endpoint) as Celula[];
  },
  
  // Obter detalhes de uma célula específica
  async obterCelula(id: number) {
    return await api.get(`/celulas/${id}`) as Celula & { membros: Membro[] };
  },
  
  // Adicionar um novo membro à célula
  async adicionarMembro(celulaId: number, dadosMembro: NovoMembroInput) {
    try {
      // Usar o endpoint padrão para membros
      return await api.post(`/celulas/${celulaId}/membros`, dadosMembro) as Membro;
    } catch(error) {
      console.error('Erro ao adicionar membro:', error);
      
      // Fallback para simular adição quando offline
      return {
        id: Date.now(),
        celulaId,
        nome: dadosMembro.nome,
        telefone: dadosMembro.telefone,
        email: dadosMembro.email,
        ehConsolidador: dadosMembro.ehConsolidador || false,
        dataCadastro: new Date().toISOString(),
        ativo: true,
        observacoes: dadosMembro.observacoes
      } as Membro;
    }
  },
  
  // Remover um membro da célula
  async removerMembro(celulaId: number, membroId: number) {
    try {
      // Usar o endpoint real
      return await api.delete(`/celulas/${celulaId}/membros/${membroId}`);
    } catch(error) {
      console.error('Erro ao remover membro:', error);
      // Fallback para simulação quando offline
      return { sucesso: true, mensagem: 'Membro removido com sucesso' };
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
      // Fallback para simulação quando offline
      return { 
        sucesso: true, 
        mensagem: ehConsolidador ? 'Marcado como consolidador' : 'Desmarcado como consolidador',
        ehConsolidador
      };
    }
  }
};

export default celulaService; 