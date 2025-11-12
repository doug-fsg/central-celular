import api from './api';
import { Membro } from './celulaService';
import { format, startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Constantes para os tipos de evento e status
export const TIPO_EVENTO = {
  CELULA: 0,
  CULTO: 1
};

export const STATUS_RELATORIO = {
  RASCUNHO: 0,
  ENVIADO: 1
};

export const STATUS_PRESENCA = {
  AUSENTE: 0,
  PRESENTE: 1
};

// Interfaces para representar os dados
export interface Relatorio {
  id: number;
  celulaId: number;
  dataInicio: string | Date;
  dataFim: string | Date;
  evento: number; // 0 = célula, 1 = culto
  status: number; // 0 = rascunho, 1 = enviado
  dataEnvio?: string | Date;
  observacoes?: string;
  teveCelula: boolean;
  celula?: {
    id: number;
    nome: string;
    lider: {
      id: number;
      nome: string;
    }
  };
  _count?: {
    presencas: number;
  };
}

export interface Presenca {
  id: number;
  relatorioId: number;
  membroId: number;
  status: number; // 0 = ausente, 1 = presente
  membro?: Membro;
}

export interface RelatorioEstatisticas {
  totalMembros: number;
  presencaCulto: number;
  presencaCelula: number;
  taxaPresenca: number;
}

// Serviço de relatórios
const relatorioService = {
  // Obter a data de início e fim da semana atual
  obterSemanaAtual() {
    const hoje = new Date();
    const inicioSemana = startOfWeek(hoje, { weekStartsOn: 1 }); // Segunda-feira
    const fimSemana = endOfWeek(hoje, { weekStartsOn: 1 }); // Domingo
    
    return {
      dataInicio: inicioSemana,
      dataFim: fimSemana
    };
  },
  
  // Formatar período para exibição
  formatarPeriodo(dataInicio: Date | string, dataFim: Date | string) {
    const inicio = typeof dataInicio === 'string' ? new Date(dataInicio) : dataInicio;
    const fim = typeof dataFim === 'string' ? new Date(dataFim) : dataFim;
    
    return `${format(inicio, 'dd/MM', { locale: ptBR })} - ${format(fim, 'dd/MM/yyyy', { locale: ptBR })}`;
  },
  
  // Listar relatórios com filtros obrigatórios
  async listarRelatorios(filtros: { 
    celulaId?: number; 
    celula?: number;
    dataInicio?: Date | string; 
    dataFim?: Date | string;
    mes?: number;
    ano?: number;
    evento?: number;
    status?: number;
  }) {
    try {
      const params = new URLSearchParams();
      
      const celulaId = filtros.celulaId ?? filtros.celula;
      if (!celulaId) {
        console.error('Parâmetro obrigatório celulaId não fornecido');
        return [];
      }
      params.append('celulaId', celulaId.toString());

      let dataInicioParam: string | undefined;
      let dataFimParam: string | undefined;

      if (filtros.dataInicio && filtros.dataFim) {
        dataInicioParam = typeof filtros.dataInicio === 'string'
          ? filtros.dataInicio
          : format(filtros.dataInicio, 'yyyy-MM-dd');
        dataFimParam = typeof filtros.dataFim === 'string'
          ? filtros.dataFim
          : format(filtros.dataFim, 'yyyy-MM-dd');
      } else if (filtros.mes !== undefined && filtros.ano !== undefined) {
        const ano = Number(filtros.ano);
        const mes = Number(filtros.mes);
        const inicioMes = startOfMonth(new Date(ano, mes - 1, 1));
        const fimMes = endOfMonth(inicioMes);
        dataInicioParam = format(inicioMes, 'yyyy-MM-dd');
        dataFimParam = format(fimMes, 'yyyy-MM-dd');
      }

      if (!dataInicioParam || !dataFimParam) {
        console.error('Parâmetros de data não fornecidos');
        return [];
      }

      params.append('dataInicio', dataInicioParam);
      params.append('dataFim', dataFimParam);
      
      if (filtros.evento !== undefined) params.append('evento', filtros.evento.toString());
      if (filtros.status !== undefined) params.append('status', filtros.status.toString());
      
      const response = await api.get(`/relatorios?${params.toString()}`) as Relatorio[];
      return response;
    } catch (error) {
      console.error('Erro ao listar relatórios:', error);
      throw error;
    }
  },
  
  // Obter detalhes de um relatório específico
  async obterRelatorio(id: number) {
    try {
      return await api.get(`/relatorios/${id}`) as Relatorio & { presencas: Presenca[]; membros?: Membro[] };
    } catch (error) {
      console.error("Erro ao obter relatório:", error);
      throw error;
    }
  },
  
  // Verificar se existe um relatório para a semana/evento/célula específicos
  async verificarRelatorioExistente(celulaId: number, dataInicio: Date | string, dataFim: Date | string, evento: number) {
    try {
      const dataInicioFormatada = typeof dataInicio === 'string' 
        ? dataInicio 
        : format(dataInicio, 'yyyy-MM-dd');
      
      const dataFimFormatada = typeof dataFim === 'string' 
        ? dataFim 
        : format(dataFim, 'yyyy-MM-dd');
      
      const relatorios = await this.listarRelatorios({
        celulaId,
        dataInicio: dataInicioFormatada,
        dataFim: dataFimFormatada,
        evento
      });
      
      if (relatorios && relatorios.length > 0) {
        return relatorios[0];
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao verificar relatório existente:', error);
      return null;
    }
  },
  
  // Criar um novo relatório
  async criarRelatorio(dados: {
    celulaId: number;
    dataInicio: Date | string;
    dataFim: Date | string;
    evento: number;
    teveCelula: boolean;
    observacoes?: string;
  }) {
    try {
      const response = await api.post('/relatorios', {
        celulaId: dados.celulaId,
        dataInicio: typeof dados.dataInicio === 'string' ? dados.dataInicio : format(dados.dataInicio, 'yyyy-MM-dd'),
        dataFim: typeof dados.dataFim === 'string' ? dados.dataFim : format(dados.dataFim, 'yyyy-MM-dd'),
        evento: dados.evento,
        teveCelula: dados.teveCelula,
        observacoes: dados.observacoes
      }) as Relatorio;
      return response;
    } catch (error) {
      console.error('Erro ao criar relatório:', error);
      throw error;
    }
  },

  // Atualizar um relatório
  async atualizarRelatorio(id: number, dados: {
    observacoes?: string;
    teveCelula?: boolean;
  }) {
    try {
      const response = await api.put(`/relatorios/${id}`, dados) as Relatorio;
      return response;
    } catch (error) {
      console.error('Erro ao atualizar relatório:', error);
      throw error;
    }
  },
  
  // Registrar presença de um membro
  async registrarPresenca(relatorioId: number, membroId: number, status: number, tipo: number) {
    try {
      return await api.post(`/relatorios/${relatorioId}/presencas`, {
        membroId,
        status,
        tipo
      }) as Presenca;
    } catch (error) {
      console.error("Erro ao registrar presença:", error);
      throw error;
    }
  },
  
  // Atualizar presença de um membro
  async atualizarPresenca(relatorioId: number, membroId: number, status: number, tipo: number) {
    try {
      // Reutiliza a mesma lógica do upsert do backend, então podemos usar o mesmo endpoint
      return await api.post(`/relatorios/${relatorioId}/presencas`, {
        membroId,
        status,
        tipo
      }) as Presenca;
    } catch (error) {
      console.error("Erro ao atualizar presença:", error);
      throw error;
    }
  },
  
  // Marcar todos os membros como presentes ou ausentes
  async marcarTodosMembros(relatorioId: number, status: number) {
    try {
      return await api.post(`/relatorios/${relatorioId}/presencas/todos`, {
        status
      });
    } catch (error) {
      console.error("Erro ao marcar todos os membros:", error);
      throw error;
    }
  },
  
  // Enviar relatório (finalizar)
  async enviarRelatorio(id: number): Promise<Relatorio> {
    try {
      console.log(`[DEBUG] relatorioService.enviarRelatorio - Iniciando envio do relatório ID=${id}`);
      
      const resposta = await api.post(`/relatorios/${id}/enviar`, {});
      console.log(`[DEBUG] relatorioService.enviarRelatorio - Resposta do servidor:`, resposta);
      
      return resposta as Relatorio;
    } catch (error) {
      console.error('Erro ao enviar relatório:', error);
      throw error;
    }
  },
  
  // Verificar se um relatório foi enviado
  isRelatorioEnviado(relatorio: Relatorio | null): boolean {
    return relatorio?.status === STATUS_RELATORIO.ENVIADO;
  },
  
  // Obter estatísticas para uma célula
  async obterEstatisticas(celulaId: number) {
    try {
      return await api.get(`/relatorios/estatisticas/${celulaId}`) as RelatorioEstatisticas;
    } catch (error) {
      console.error("Erro ao obter estatísticas:", error);
      throw error;
    }
  },
  
  // Obter estatísticas de líderes para um período específico
  async obterEstatisticasLideres(dataInicio: Date | string, dataFim: Date | string) {
    try {
      const dataInicioFormatada = typeof dataInicio === 'string' 
        ? dataInicio 
        : format(dataInicio, 'yyyy-MM-dd');
      
      const dataFimFormatada = typeof dataFim === 'string' 
        ? dataFim 
        : format(dataFim, 'yyyy-MM-dd');
      
      return await api.get(`/relatorios/estatisticas/lideres?dataInicio=${dataInicioFormatada}&dataFim=${dataFimFormatada}`);
    } catch (error) {
      console.error("Erro ao obter estatísticas de líderes:", error);
      throw error;
    }
  },

  // Obter frequência de um membro (últimos 4 relatórios)
  async obterFrequenciaMembro(membroId: number, celulaId: number) {
    try {
      return await api.get(`/relatorios/membro/${membroId}/celula/${celulaId}`) as Array<{
        dataInicio: string | Date;
        dataFim: string | Date;
        dataEnvio: string | Date;
        presenteCelula: boolean;
        presenteCulto: boolean;
      }>;
    } catch (error) {
      console.error("Erro ao obter frequência do membro:", error);
      throw error;
    }
  }
};

export default relatorioService; 