import api from './api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MembroCuidado {
  atribuicaoId: number;
  membroId: number;
  nome: string;
  telefone: string | null;
  ehConsolidador: boolean;
  ehCoLider: boolean;
  ehAnfitriao: boolean;
}

export interface Cuidador {
  tipo: 'lider' | 'consolidador';
  cuidadorId: number;
  nome: string;
  cuidados: MembroCuidado[];
}

export interface MembroSemCuidador {
  id: number;
  nome: string;
  telefone: string | null;
  ehConsolidador: boolean;
  ehCoLider: boolean;
  ehAnfitriao: boolean;
}

export interface RedeCuidadoResponse {
  celula: { id: number; nome: string };
  lider: { id: number; nome: string };
  cuidadores: Cuidador[];
  semCuidador: MembroSemCuidador[];
  stats: {
    totalMembros: number;
    totalComCuidador: number;
    totalSemCuidador: number;
    totalCuidadores: number;
  };
}

export interface AtribuicaoInput {
  membroId: number;
  consolidadorId?: number | null;
  liderId?: number | null;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const redeCuidadoService = {
  /** `api.get/post/...` retorna o corpo JSON diretamente (sem wrapper `.data` como axios). */
  async obterRede(celulaId: number): Promise<RedeCuidadoResponse> {
    return api.get(`/celulas/${celulaId}/rede-cuidado`) as Promise<RedeCuidadoResponse>;
  },

  async atribuir(celulaId: number, input: AtribuicaoInput) {
    return api.post(`/celulas/${celulaId}/rede-cuidado`, input);
  },

  async remover(celulaId: number, membroId: number) {
    return api.delete(`/celulas/${celulaId}/rede-cuidado/${membroId}`);
  },

  async salvarLote(celulaId: number, atribuicoes: AtribuicaoInput[]) {
    return api.put(`/celulas/${celulaId}/rede-cuidado`, atribuicoes);
  },
};

export default redeCuidadoService;
