import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

// Estendendo o tipo Request para incluir o usuário autenticado
interface AuthRequest extends Request {
  auth: {
    id: number;
    email: string;
    cargo: string;
  };
}

// Schema de validação para relatório
const relatorioSchema = z.object({
  celulaId: z.number(),
  mes: z.number().min(1).max(12),
  ano: z.number().min(2020),
  observacoes: z.string().optional()
});

// Schema para validação de presença
const presencaSchema = z.object({
  membroId: z.number(),
  presencaCelula: z.boolean(),
  presencaCulto: z.boolean(),
  semana: z.number().min(1).max(5),
  observacoes: z.string().optional()
});

// Schema para validação de envio de relatório com presenças
const envioRelatorioSchema = z.object({
  presenças: z.array(z.object({
    membroId: z.number(),
    status: z.string()
  })).optional()
});

// Listar relatórios
export const listarRelatorios = async (req: Request, res: Response) => {
  try {
    const { celula, mes, ano } = req.query;
    
    // Obter o accountId do usuário autenticado
    const accountId = (req as any).user?.accountId || (req as any).usuario?.accountId;
    
    if (!accountId) {
      return res.status(401).json({ message: 'Conta não identificada' });
    }

    const filtro: any = {
      celula: {
        accountId // Filtrar por account
      }
    };
    
    if (celula) filtro.celulaId = Number(celula);
    if (mes) filtro.mes = Number(mes);
    if (ano) filtro.ano = Number(ano);

    const relatorios = await prisma.relatorio.findMany({
      where: filtro,
      include: {
        celula: {
          select: {
            id: true,
            nome: true,
            lider: {
              select: {
                id: true,
                nome: true,
                email: true
              }
            }
          }
        },
        presencas: {
          select: {
            id: true,
            presencaCelula: true,
            presencaCulto: true,
            semana: true
          }
        }
      },
      orderBy: [
        { ano: 'desc' },
        { mes: 'desc' }
      ]
    });

    res.json(relatorios);
  } catch (error) {
    console.error('Erro ao listar relatórios:', error);
    res.status(500).json({ message: 'Erro ao listar relatórios' });
  }
};

// Obter relatório por ID
export const obterRelatorio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const relatorio = await prisma.relatorio.findUnique({
      where: { id: Number(id) },
      include: {
        celula: {
          include: {
            lider: {
              select: {
                id: true,
                nome: true,
                email: true
              }
            },
            membros: {
              where: { ativo: true }
            }
          }
        },
        presencas: true
      }
    });

    if (!relatorio) {
      return res.status(404).json({ message: 'Relatório não encontrado' });
    }

    res.json(relatorio);
  } catch (error) {
    console.error('Erro ao obter relatório:', error);
    res.status(500).json({ message: 'Erro ao obter relatório' });
  }
};

// Criar relatório
export const criarRelatorio = async (req: Request, res: Response) => {
  try {
    const data = relatorioSchema.parse(req.body);

    // Verificar se a célula existe
    const celula = await prisma.celula.findUnique({
      where: { id: data.celulaId }
    });

    if (!celula) {
      return res.status(400).json({ message: 'Célula não encontrada' });
    }

    // Verificar se já existe relatório para este mês/ano
    const relatorioExistente = await prisma.relatorio.findFirst({
      where: {
        celulaId: data.celulaId,
        mes: data.mes,
        ano: data.ano
      }
    });

    if (relatorioExistente) {
      return res.status(400).json({ 
        message: 'Já existe um relatório para esta célula neste mês e ano',
        relatorio: relatorioExistente
      });
    }

    // Criar relatório sem definir a data de envio (será preenchida quando for finalizado)
    const novoRelatorio = await prisma.relatorio.create({
      data: {
        celulaId: data.celulaId,
        mes: data.mes,
        ano: data.ano,
        observacoes: data.observacoes,
        // Não definimos dataEnvio aqui, ele será nulo inicialmente
      },
      include: {
        celula: {
          select: {
            id: true,
            nome: true,
            lider: {
              select: {
                id: true,
                nome: true
              }
            }
          }
        }
      }
    });

    res.status(201).json(novoRelatorio);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    
    console.error('Erro ao criar relatório:', error);
    res.status(500).json({ message: 'Erro ao criar relatório' });
  }
};

// Atualizar relatório
export const atualizarRelatorio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { observacoes } = req.body;

    // Verificar se o relatório existe
    const relatorioExistente = await prisma.relatorio.findUnique({
      where: { id: Number(id) }
    });

    if (!relatorioExistente) {
      return res.status(404).json({ message: 'Relatório não encontrado' });
    }

    // Apenas atualizamos as observações, não permitimos mudar célula, mês ou ano
    const relatorioAtualizado = await prisma.relatorio.update({
      where: { id: Number(id) },
      data: { observacoes }
    });

    res.json(relatorioAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar relatório:', error);
    res.status(500).json({ message: 'Erro ao atualizar relatório' });
  }
};

// Registrar presença
export const registrarPresenca = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = presencaSchema.parse(req.body);

    // Verificar se o relatório existe e incluir a célula para verificar accountId
    const relatorio = await prisma.relatorio.findUnique({
      where: { id: Number(id) },
      include: {
        celula: true
      }
    });

    if (!relatorio) {
      return res.status(404).json({ message: 'Relatório não encontrado' });
    }

    // Verificar se o membro existe e pertence à célula correta
    const membro = await prisma.membro.findFirst({
      where: {
        id: data.membroId,
        celulaId: relatorio.celulaId,
        ativo: true
      }
    });

    if (!membro) {
      return res.status(400).json({ message: 'Membro não encontrado ou não pertence à célula do relatório' });
    }

    // Verificar se já existe presença registrada para este membro nesta semana
    const presencaExistente = await prisma.presenca.findFirst({
      where: {
        relatorioId: Number(id),
        membroId: data.membroId,
        semana: data.semana
      }
    });

    let presenca;

    if (presencaExistente) {
      // Atualizar presença existente
      presenca = await prisma.presenca.update({
        where: { id: presencaExistente.id },
        data: {
          presencaCelula: data.presencaCelula,
          presencaCulto: data.presencaCulto,
          observacoes: data.observacoes
        }
      });
    } else {
      // Criar nova presença
      presenca = await prisma.presenca.create({
        data: {
          relatorioId: Number(id),
          membroId: data.membroId,
          presencaCelula: data.presencaCelula,
          presencaCulto: data.presencaCulto,
          semana: data.semana,
          observacoes: data.observacoes
        }
      });
    }

    res.json(presenca);
  } catch (error) {
    console.error('Erro ao registrar presença:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    
    res.status(500).json({ message: 'Erro ao registrar presença' });
  }
};

// Enviar relatório
export const enviarRelatorio = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`[DEBUG] Iniciando processo de envio do relatório ${id}`);
    
    // Parse o corpo da requisição para obter as presenças
    const data = envioRelatorioSchema.safeParse(req.body);
    console.log(`[DEBUG] Dados recebidos do frontend:`, req.body);

    // Obter informações do usuário a partir do middleware de autenticação
    const usuario = (req as any).usuario || (req as any).user;
    if (!usuario) {
      console.log(`[DEBUG] Usuário não autenticado ao tentar enviar relatório ${id}`);
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }
    console.log(`[DEBUG] Usuário autenticado: ${usuario.id} (${usuario.cargo})`);

    // Verificar se o relatório existe e incluir dados necessários
    const relatorio = await prisma.relatorio.findUnique({
      where: { id: Number(id) },
      include: {
        celula: {
          include: {
            lider: true,
            membros: true
          }
        },
        presencas: {
          include: {
            membro: true
          }
        }
      }
    });

    if (!relatorio) {
      console.log(`[DEBUG] Relatório ${id} não encontrado`);
      return res.status(404).json({ message: 'Relatório não encontrado' });
    }

    // Log detalhado do relatório e suas presenças
    console.log(`[DEBUG] Relatório ${id} encontrado:`, {
      id: relatorio.id,
      celulaId: relatorio.celulaId,
      dataEnvio: relatorio.dataEnvio,
      totalPresencas: relatorio.presencas?.length || 0
    });

    // Verificar se o relatório já foi enviado
    if (relatorio.dataEnvio) {
      console.log(`[DEBUG] Relatório ${id} já foi enviado em ${relatorio.dataEnvio}`);
      return res.status(400).json({ message: 'Este relatório já foi enviado' });
    }

    // Salvar as presenças recebidas do frontend, se houver
    if (data.success && data.data.presenças && data.data.presenças.length > 0) {
      console.log(`[DEBUG] Presenças recebidas do frontend: ${data.data.presenças.length}`);
      
      // Excluir presenças existentes para evitar duplicações
      await prisma.presenca.deleteMany({
        where: { relatorioId: Number(id) }
      });

      // Criar novas presenças com base nos dados do frontend
      for (const presenca of data.data.presenças) {
        await prisma.presenca.create({
          data: {
            relatorioId: Number(id),
            membroId: presenca.membroId,
            presencaCelula: presenca.status === 'cell' || presenca.status === 'both',
            presencaCulto: presenca.status === 'worship' || presenca.status === 'both',
            semana: 1 // Usando semana 1 como padrão
          }
        });
      }
      
      // Buscar o relatório novamente para ter as presenças atualizadas
      const relatorioAtualizado = await prisma.relatorio.findUnique({
        where: { id: Number(id) },
        include: {
          presencas: true
        }
      });
      
      if (relatorioAtualizado) {
        console.log(`[DEBUG] Presenças salvas com sucesso. Total: ${relatorioAtualizado.presencas.length}`);
      }
    }

    // Verificar se o usuário tem permissão
    const ehLider = relatorio.celula.liderId === usuario.id;
    const ehAdmin = ['ADMINISTRADOR', 'SUPERVISOR'].includes(usuario.cargo);
    console.log(`[DEBUG] Verificação de permissões - É líder: ${ehLider}, É admin: ${ehAdmin}`);

    if (!ehLider && !ehAdmin) {
      console.log(`[DEBUG] Usuário ${usuario.id} não tem permissão para enviar o relatório ${id}`);
      return res.status(403).json({ 
        message: 'Apenas o líder da célula ou um administrador pode enviar o relatório' 
      });
    }

    // Buscar presenças atuais após possível atualização
    const presencasAtuais = await prisma.presenca.findMany({
      where: { relatorioId: Number(id) }
    });
    console.log(`[DEBUG] Total de presenças atuais: ${presencasAtuais.length}`);

    // Temporariamente remover a validação de presença para diagnóstico
    // if (!presencasAtuais || presencasAtuais.length === 0) {
    //   console.log(`[DEBUG] Relatório ${id} não possui registros de presença`);
    //   return res.status(400).json({ 
    //     message: 'Não é possível enviar o relatório sem registros de presença' 
    //   });
    // }

    console.log(`[DEBUG] Iniciando atualização do relatório ${id} com dataEnvio`);
    
    // Atualizar o relatório com a data de envio
    const relatorioFinalizado = await prisma.relatorio.update({
      where: { id: Number(id) },
      data: { 
        dataEnvio: new Date()
      },
      include: {
        celula: {
          select: {
            id: true,
            nome: true,
            lider: {
              select: {
                id: true,
                nome: true
              }
            }
          }
        },
        presencas: {
          select: {
            id: true,
            presencaCelula: true,
            presencaCulto: true,
            semana: true
          }
        }
      }
    });

    console.log(`[DEBUG] Relatório ${id} atualizado com sucesso:`, {
      id: relatorioFinalizado.id,
      dataEnvio: relatorioFinalizado.dataEnvio,
      totalPresencas: relatorioFinalizado.presencas?.length || 0
    });

    res.json(relatorioFinalizado);
  } catch (error) {
    console.error('[DEBUG] Erro ao enviar relatório:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Erro ao enviar relatório'
    });
  }
};

// Obter estatísticas
export const obterEstatisticas = async (req: Request, res: Response) => {
  try {
    const { celulaId, mes, ano } = req.params;

    if (celulaId) {
      // Estatísticas de uma célula específica
      const filtro: any = { celulaId: Number(celulaId) };
      
      if (mes) filtro.mes = Number(mes);
      if (ano) filtro.ano = Number(ano);

      // Buscar relatórios
      const relatorios = await prisma.relatorio.findMany({
        where: filtro,
        include: {
          presencas: true,
          celula: {
            include: {
              membros: {
                where: { ativo: true }
              }
            }
          }
        },
        orderBy: [
          { ano: 'desc' },
          { mes: 'desc' }
        ]
      });

      if (relatorios.length === 0) {
        return res.status(404).json({ message: 'Nenhum relatório encontrado com os critérios fornecidos' });
      }

      // Calcular estatísticas
      const estatisticas = relatorios.map(relatorio => {
        const totalMembros = relatorio.celula.membros.length;
        const totalPresencasCelula = relatorio.presencas.filter(p => p.presencaCelula).length;
        const totalPresencasCulto = relatorio.presencas.filter(p => p.presencaCulto).length;
        
        const mediaCelula = totalMembros > 0 ? (totalPresencasCelula / (totalMembros * 4)) * 100 : 0;
        const mediaCulto = totalMembros > 0 ? (totalPresencasCulto / (totalMembros * 4)) * 100 : 0;

        return {
          id: relatorio.id,
          mes: relatorio.mes,
          ano: relatorio.ano,
          celula: {
            id: relatorio.celula.id,
            nome: relatorio.celula.nome
          },
          totalMembros,
          presencasCelula: totalPresencasCelula,
          presencasCulto: totalPresencasCulto,
          mediaPresencaCelula: mediaCelula.toFixed(2),
          mediaPresencaCulto: mediaCulto.toFixed(2)
        };
      });

      res.json(estatisticas);
    } else if (mes && ano) {
      // Ranking de líderes para um mês/ano específico
      const relatorios = await prisma.relatorio.findMany({
        where: {
          mes: Number(mes),
          ano: Number(ano)
        },
        include: {
          presencas: true,
          celula: {
            include: {
              lider: {
                select: {
                  id: true,
                  nome: true
                }
              },
              membros: {
                where: { ativo: true }
              }
            }
          }
        }
      });

      if (relatorios.length === 0) {
        return res.status(404).json({ message: 'Nenhum relatório encontrado para o mês e ano fornecidos' });
      }

      // Agrupar por líder
      const lideresMap = new Map();

      for (const relatorio of relatorios) {
        const liderId = relatorio.celula.lider.id;
        const liderNome = relatorio.celula.lider.nome;
        const totalMembros = relatorio.celula.membros.length;
        const totalPresencasCelula = relatorio.presencas.filter(p => p.presencaCelula).length;
        const totalPresencasCulto = relatorio.presencas.filter(p => p.presencaCulto).length;
        
        if (!lideresMap.has(liderId)) {
          lideresMap.set(liderId, {
            id: liderId,
            nome: liderNome,
            celulas: 0,
            totalMembros: 0,
            presencasCelula: 0,
            presencasCulto: 0
          });
        }

        const lider = lideresMap.get(liderId);
        lider.celulas += 1;
        lider.totalMembros += totalMembros;
        lider.presencasCelula += totalPresencasCelula;
        lider.presencasCulto += totalPresencasCulto;
      }

      // Calcular médias e ordenar
      const ranking = Array.from(lideresMap.values()).map(lider => {
        const mediaCelula = lider.totalMembros > 0 ? (lider.presencasCelula / (lider.totalMembros * 4)) * 100 : 0;
        const mediaCulto = lider.totalMembros > 0 ? (lider.presencasCulto / (lider.totalMembros * 4)) * 100 : 0;
        const mediaGeral = (mediaCelula + mediaCulto) / 2;

        return {
          ...lider,
          mediaPresencaCelula: mediaCelula.toFixed(2),
          mediaPresencaCulto: mediaCulto.toFixed(2),
          mediaGeral: mediaGeral.toFixed(2)
        };
      }).sort((a, b) => parseFloat(b.mediaGeral) - parseFloat(a.mediaGeral));

      // Atribuir posições no ranking
      ranking.forEach((lider, index) => {
        lider.posicao = index + 1;
      });

      res.json(ranking);
    } else {
      res.status(400).json({ message: 'Parâmetros insuficientes para gerar estatísticas' });
    }
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ message: 'Erro ao obter estatísticas' });
  }
}; 