import api from './api';
import { Membro } from './celulaService';

// Interfaces para representar os dados
export interface Relatorio {
  id: number;
  celulaId: number;
  mes: number;
  ano: number;
  observacoes: string;
  dataEnvio?: Date;
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
  presencaCelula: boolean;
  presencaCulto: boolean;
  semana: number;
  observacoes?: string;
  membro?: Membro;
}

export interface RelatorioEstatisticas {
  totalMembros: number;
  presencaCulto: number;
  presencaCelula: number;
  presencaAmbos: number;
  taxaPresenca: number;
  taxaCrescimento?: number;
  taxaRetencao?: number;
}

// Serviço de relatórios
const relatorioService = {
  // Listar relatórios com filtros opcionais
  async listarRelatorios(filtros?: { celula?: number; mes?: number; ano?: number }) {
    try {
      let endpoint = '/relatorios';
      
      // Adicionar parâmetros de filtro se fornecidos
      if (filtros) {
        const params = new URLSearchParams();
        
        if (filtros.celula) params.append('celula', filtros.celula.toString());
        if (filtros.mes !== undefined) params.append('mes', filtros.mes.toString());
        if (filtros.ano !== undefined) params.append('ano', filtros.ano.toString());
        
        // Adicionar parâmetros à URL se existirem
        if (params.toString()) {
          endpoint += `?${params.toString()}`;
        }
      }
      
      const response = await api.get(endpoint) as Relatorio[];
      
      // Converter os meses de 1-12 para 0-11
      const relatoriosAjustados = response.map((relatorio: Relatorio) => ({
        ...relatorio,
        mes: relatorio.mes - 1
      }));
      
      // Validar se os resultados atendem aos filtros fornecidos
      if (filtros && filtros.mes !== undefined && filtros.ano !== undefined) {
        // Filtrar localmente para garantir que corresponda aos critérios solicitados
        return relatoriosAjustados.filter((r: Relatorio) => 
          r.mes === (filtros.mes as number - 1) && 
          r.ano === filtros.ano
        );
      }
      
      return relatoriosAjustados;
    } catch (error) {
      console.error('Erro ao listar relatórios:', error);
      return [];
    }
  },
  
  // Obter detalhes de um relatório específico
  async obterRelatorio(id: number) {
    try {
      return await api.get(`/relatorios/${id}`) as Relatorio & { presencas: Presenca[] };
    } catch (error) {
      console.error("Erro ao obter relatório:", error);
      throw error;
    }
  },
  
  // Verificar se existe um relatório para o mês/ano/célula específicos
  async verificarRelatorioExistente(celulaId: number, mes: number, ano: number) {
    try {
      // Converter mês de 0-11 para 1-12 para o backend
      const mesAjustado = mes + 1;
      
      const relatorios = await this.listarRelatorios({
        celula: celulaId,
        mes: mesAjustado,
        ano
      });
      
      if (relatorios && relatorios.length > 0) {
        // Converter o mês de volta para 0-11 ao retornar
        const relatorio = relatorios[0];
        if (relatorio.mes) {
          relatorio.mes = relatorio.mes - 1;
        }
        return relatorio;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao verificar relatório existente:', error);
      return null;
    }
  },
  
  // Criar um novo relatório
  async criarRelatorio(celulaId: number, mes: number, ano: number, observacoes?: string) {
    try {
      // Converter mês de 0-11 para 1-12 para o backend
      const mesAjustado = mes + 1;
      
      const resultado = await api.post('/relatorios', {
        celulaId,
        mes: mesAjustado,
        ano,
        observacoes
      }) as Relatorio;
      
      // Converter o mês de volta para 0-11 ao retornar
      if (resultado.mes) {
        resultado.mes = resultado.mes - 1;
      }
      
      console.log(`[DEBUG] criarRelatorio resposta:`, resultado);
      return resultado;
    } catch (error) {
      console.error("Erro ao criar relatório:", error);
      throw error;
    }
  },
  
  // Registrar presença de um membro
  async registrarPresenca(relatorioId: number, membroId: number, dados: {
    presencaCelula: boolean;
    presencaCulto: boolean;
    semana: number;
    observacoes?: string;
  }) {
    try {
      return await api.post(`/relatorios/${relatorioId}/presencas`, {
        membroId: membroId,
        presencaCelula: dados.presencaCelula,
        presencaCulto: dados.presencaCulto,
        semana: dados.semana,
        observacoes: dados.observacoes
      }) as Presenca;
    } catch (error) {
      console.error("Erro ao registrar presença:", error);
      throw error;
    }
  },
  
  // Enviar relatório (finalizar)
  async enviarRelatorio(id: number): Promise<Relatorio> {
    try {
      console.log(`[DEBUG] relatorioService.enviarRelatorio - Iniciando envio do relatório ID=${id}`);
      console.log(`[DEBUG] relatorioService.enviarRelatorio - Chamando endpoint: /relatorios/${id}/enviar`);
      
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
    return relatorio?.dataEnvio != null;
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
  
  // Obter estatísticas de líderes para um mês/ano específico
  async obterEstatisticasLideres(mes: number, ano: number) {
    try {
      return await api.get(`/relatorios/estatisticas/lideres/${mes}/${ano}`);
    } catch (error) {
      console.error("Erro ao obter estatísticas de líderes:", error);
      throw error;
    }
  }
};

export default relatorioService; 