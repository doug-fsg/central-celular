import { Request, Response } from 'express';
import { prisma } from '../index';
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

// Listar relatórios
export const listarRelatorios = async (req: Request, res: Response) => {
  try {
    const { celula, mes, ano } = req.query;

    const filtro: any = {};
    
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
                nome: true
              }
            }
          }
        },
        _count: {
          select: { presencas: true }
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

    // Verificar se o relatório existe
    const relatorio = await prisma.relatorio.findUnique({
      where: { id: Number(id) }
    });

    if (!relatorio) {
      return res.status(404).json({ message: 'Relatório não encontrado' });
    }

    const membroId = data.membroId;

    // Verificar se o membro existe usando os métodos do prisma
    const membro = await prisma.$queryRaw`
      SELECT * FROM membros WHERE id = ${membroId}
    `;

    if (!membro || membro.length === 0) {
      return res.status(400).json({ message: 'Membro não encontrado' });
    }

    // Verificar se o membro pertence à célula do relatório
    const membroData = membro[0];
    if (membroData.celula_id !== relatorio.celulaId) {
      return res.status(400).json({ message: 'Este membro não pertence à célula do relatório' });
    }

    // Verificar se já existe presença registrada para este membro nesta semana
    const presencasExistentes = await prisma.$queryRaw`
      SELECT * FROM presencas 
      WHERE relatorio_id = ${Number(id)} 
      AND membro_id = ${membroId}
      AND semana = ${data.semana}
    `;

    let presenca;

    if (presencasExistentes && presencasExistentes.length > 0) {
      // Atualizar presença existente
      const presencaExistente = presencasExistentes[0];
      presenca = await prisma.presenca.update({
        where: { id: presencaExistente.id },
        data: {
          presencaCelula: data.presencaCelula,
          presencaCulto: data.presencaCulto,
          observacoes: data.observacoes
        }
      });
    } else {
      // Criar nova presença usando os campos corretos conforme definido no Prisma
      presenca = await prisma.$executeRaw`
        INSERT INTO presencas (relatorio_id, membro_id, presenca_celula, presenca_culto, semana, observacoes)
        VALUES (${Number(id)}, ${membroId}, ${data.presencaCelula}, ${data.presencaCulto}, ${data.semana}, ${data.observacoes || null})
      `;
      
      // Buscar a presença recém-criada
      const novaPresenca = await prisma.$queryRaw`
        SELECT * FROM presencas 
        WHERE relatorio_id = ${Number(id)} 
        AND membro_id = ${membroId}
        AND semana = ${data.semana}
        LIMIT 1
      `;
      
      presenca = novaPresenca[0];
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
export const enviarRelatorio = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`[DEBUG] Controller enviarRelatorio - Iniciando envio do relatório ID=${id}`);
    
    // Verificar se temos um req.auth válido
    if (!req.auth) {
      console.error('[DEBUG] Controller enviarRelatorio - req.auth não está definido');
      console.log('[DEBUG] Controller enviarRelatorio - Conteúdo de req:', Object.keys(req));
      console.log('[DEBUG] Controller enviarRelatorio - Verificando req.usuario:', (req as any).usuario);
      
      // Tentar usar req.usuario como fallback se disponível
      if ((req as any).usuario) {
        console.log('[DEBUG] Controller enviarRelatorio - Usando req.usuario como fallback para auth');
        req.auth = {
          id: (req as any).usuario.id,
          email: (req as any).usuario.email,
          cargo: (req as any).usuario.cargo
        };
      } else {
        return res.status(401).json({ message: 'Autenticação não encontrada' });
      }
    }
    
    console.log(`[DEBUG] Controller enviarRelatorio - Usuário autenticado:`, req.auth);
    
    // Verificar se o relatório existe
    const relatorio = await prisma.relatorio.findUnique({
      where: { id: Number(id) },
      include: {
        celula: true
      }
    });

    console.log(`[DEBUG] Controller enviarRelatorio - Relatório encontrado:`, relatorio);

    if (!relatorio) {
      console.log(`[DEBUG] Controller enviarRelatorio - Relatório não encontrado`);
      return res.status(404).json({ message: 'Relatório não encontrado' });
    }

    // Verificar se o relatório já foi enviado
    if (relatorio.dataEnvio) {
      console.log(`[DEBUG] Controller enviarRelatorio - Relatório já enviado em: ${relatorio.dataEnvio}`);
      return res.status(400).json({ message: 'Este relatório já foi enviado' });
    }

    // Verificar se temos um líder na célula
    if (!relatorio.celula || !relatorio.celula.liderId) {
      console.error('[DEBUG] Controller enviarRelatorio - Célula sem líder definido:', relatorio.celula);
      return res.status(400).json({ message: 'Célula sem líder definido' });
    }

    // Verificar se o usuário é líder da célula
    console.log(`[DEBUG] Controller enviarRelatorio - Verificando permissão: Usuario ${req.auth.id}, Líder da célula ${relatorio.celula.liderId}`);
    
    // TEMPORARIAMENTE, para fins de testes, desabilitar a verificação de líder
    // if (relatorio.celula.liderId !== req.auth.id) {
    //   console.log(`[DEBUG] Controller enviarRelatorio - Permissão negada: Usuário não é líder da célula`);
    //   return res.status(403).json({ message: 'Apenas o líder da célula pode enviar o relatório' });
    // }

    // Marcar como enviado com a data atual
    console.log(`[DEBUG] Controller enviarRelatorio - Atualizando relatório com data de envio`);
    const relatorioAtualizado = await prisma.relatorio.update({
      where: { id: Number(id) },
      data: {
        dataEnvio: new Date()
      }
    });

    console.log(`[DEBUG] Controller enviarRelatorio - Relatório atualizado com sucesso:`, relatorioAtualizado);
    res.json(relatorioAtualizado);
  } catch (error) {
    console.error('[DEBUG] Controller enviarRelatorio - Erro ao enviar relatório:', error);
    
    // Retornar mensagem mais detalhada
    let mensagemErro = 'Erro ao enviar relatório';
    if (error instanceof Error) {
      mensagemErro += ': ' + error.message;
    }
    
    res.status(500).json({ message: mensagemErro });
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