import { Router } from 'express';
import { autenticacao } from '../middlewares/auth.middleware';
import { verificarAdmin } from '../middlewares/admin.middleware';
import { prisma } from '../lib/prisma';
import { isPublicoCelula, type PublicoCelula } from '../constants/publicoCelula';
import {
  listarUsuarios,
  obterUsuario,
  criarUsuario,
  atualizarUsuario,
  ativarDesativarUsuario,
  ativarDesativarUsuariosLote,
  reenviarConviteUsuario,
} from '../controllers/usuarios.controller';
import { obterDashboardCuidadoHandler } from '../controllers/dashboardCuidado.controller';
import { deleteUsuarioAdmin } from '../controllers/adminUsers.controller';
import {
  listarCelulas,
  statusRelatoriosCelulas,
  obterCelula,
  criarCelula,
  atualizarCelula,
  desativarCelula,
  deletarCelula,
  listarTodosMembros,
  exportarCelulasCsv,
} from '../controllers/celulas.controller';

const adminRouter = Router();

// Todas as rotas requerem autenticação e privilégios de admin
adminRouter.use(autenticacao);
adminRouter.use(verificarAdmin);

// Rotas de usuários
adminRouter.get('/usuarios', listarUsuarios);
adminRouter.patch('/usuarios/lote/status', ativarDesativarUsuariosLote);
adminRouter.post('/usuarios/:id/reenviar-convite', reenviarConviteUsuario);
adminRouter.get('/usuarios/:id', obterUsuario);
adminRouter.post('/usuarios', criarUsuario);
adminRouter.put('/usuarios/:id', atualizarUsuario);
adminRouter.patch('/usuarios/:id/status', ativarDesativarUsuario);
adminRouter.delete('/usuarios/:id', deleteUsuarioAdmin);

// Dashboard agregado de rede de cuidado (pastoral)
adminRouter.get('/dashboard-cuidado', obterDashboardCuidadoHandler);

// Rota para obter estatísticas
adminRouter.get('/estatisticas', async (req, res) => {
  try {
    const accountId = (req as any).user?.accountId ?? (req as any).usuario?.accountId;
    if (!accountId) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    const periodo = req.query.periodo as string || 'mes';
    const liderId = req.query.liderId ? Number(req.query.liderId) : undefined;
    const publicoQuery = req.query.publico as string | undefined;
    const publicoFilter =
      publicoQuery && isPublicoCelula(publicoQuery)
        ? { publico: publicoQuery as PublicoCelula }
        : {};

    const celulaScope = {
      accountId,
      ...(liderId != null ? { liderId } : {}),
      ...publicoFilter,
    };

    console.log(`[DEBUG] Obtendo estatísticas para período: ${periodo}, líder: ${liderId || 'todos'}, público: ${publicoQuery || 'todos'}`);
    
    // Calcular datas baseado no período
    const hoje = new Date();
    let dataInicio: Date;
    let periodoAnteriorInicio: Date;
    let periodoAnteriorFim: Date;
    
    switch (periodo) {
      case 'semana': {
        // Última semana (segunda a domingo)
        const semanaPassada = new Date(hoje);
        semanaPassada.setDate(semanaPassada.getDate() - 7);
        const diaSemana = semanaPassada.getDay(); // 0 = domingo, 1 = segunda, etc.
        const diasParaSegunda = diaSemana === 0 ? 6 : diaSemana - 1; // Dias para voltar à segunda
        const segundaPassada = new Date(semanaPassada);
        segundaPassada.setDate(segundaPassada.getDate() - diasParaSegunda);
        segundaPassada.setHours(0, 0, 0, 0);
        const domingoPassado = new Date(segundaPassada);
        domingoPassado.setDate(domingoPassado.getDate() + 6);
        domingoPassado.setHours(23, 59, 59, 999);
        
        dataInicio = segundaPassada;
        // Período anterior: semana anterior
        const segundaAnterior = new Date(segundaPassada);
        segundaAnterior.setDate(segundaAnterior.getDate() - 7);
        periodoAnteriorInicio = segundaAnterior;
        const domingoAnterior = new Date(segundaAnterior);
        domingoAnterior.setDate(domingoAnterior.getDate() + 6);
        domingoAnterior.setHours(23, 59, 59, 999);
        periodoAnteriorFim = domingoAnterior;
        break;
      }
      case 'trimestre':
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1);
        periodoAnteriorInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 6, 1);
        periodoAnteriorFim = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 0);
        break;
      case 'ano':
        dataInicio = new Date(hoje.getFullYear(), 0, 1);
        periodoAnteriorInicio = new Date(hoje.getFullYear() - 1, 0, 1);
        periodoAnteriorFim = new Date(hoje.getFullYear() - 1, 11, 31);
        break;
      default: // mes
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        periodoAnteriorInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        periodoAnteriorFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    }

    console.log(`[DEBUG] Período atual: ${dataInicio.toISOString()} até ${hoje.toISOString()}`);
    console.log(`[DEBUG] Período anterior: ${periodoAnteriorInicio.toISOString()} até ${periodoAnteriorFim.toISOString()}`);

    // Obter estatísticas
    const [
      // Dados atuais
      totalCelulas,
      totalSupervisores,
      totalLideres,
      totalMembros,
      presencas,
      novosMembros,
      // Dados do período anterior
      membrosAnteriores,
      presencasAnteriores,
      // Dados adicionais
      celulasPorRegiao,
      membrosPorRegiao,
      relatoriosEnviados,
      consolidadoresAtivos,
      coLideresAtivos
    ] = await Promise.all([
      // Total de células ativas
      prisma.celula.count({
        where: { 
          ativo: true,
          ...celulaScope,
        }
      }),
      
      // Total de supervisores ativos
      prisma.usuario.count({
        where: { 
          cargo: 'SUPERVISOR',
          ativo: true,
          accountId,
        }
      }),
      
      // Total de líderes ativos
      prisma.usuario.count({
        where: { 
          cargo: 'LIDER',
          ativo: true,
          accountId,
        }
      }),
      
      // Total de membros ativos
      prisma.membro.count({
        where: {
          ativo: true,
          celula: { ativo: true, ...celulaScope },
        },
      }),
      
      // Presença total período atual (filtrar por líder se fornecido)
      prisma.presenca.groupBy({
        by: ['tipo', 'status'],
        where: {
          relatorio: {
            dataEnvio: {
              gte: dataInicio,
              lte: hoje,
            },
            celula: celulaScope,
          },
        },
        _count: { _all: true },
      }),
      
      // Novos membros no período atual (filtrar por líder se fornecido)
      prisma.membro.count({
        where: {
          dataCadastro: {
            gte: dataInicio,
            lte: hoje
          },
          celula: celulaScope,
        },
      }),

      // Total de membros período anterior
      prisma.membro.count({
        where: {
          dataCadastro: {
            lt: dataInicio
          },
          ativo: true,
          celula: { ativo: true, ...celulaScope },
        },
      }),

      // Presenças período anterior (filtrar por líder se fornecido)
      prisma.presenca.groupBy({
        by: ['tipo', 'status'],
        where: {
          relatorio: {
            dataEnvio: {
              gte: periodoAnteriorInicio,
              lte: periodoAnteriorFim,
            },
            celula: celulaScope,
          },
        },
        _count: { _all: true },
      }),

      // Células por região
      prisma.regiao.findMany({
        where: { 
          ativo: true,
          accountId
        },
        select: {
          id: true,
          nome: true,
          _count: {
            select: {
              celulas: {
                where: { 
                  ativo: true,
                  ...celulaScope,
                }
              }
            }
          }
        }
      }),

      // Membros por região
      prisma.regiao.findMany({
        where: { 
          ativo: true,
          accountId
        },
        select: {
          id: true,
          nome: true,
            celulas: {
            where: { 
              ativo: true,
              ...celulaScope,
            },
            select: {
              _count: {
                select: {
                  membros: {
                    where: { ativo: true }
                  }
                }
              }
            }
          }
        }
      }),

      // Relatórios enviados no período (filtrar por líder se fornecido)
      prisma.relatorio.count({
        where: {
          dataEnvio: {
            gte: dataInicio,
            lte: hoje
          },
          celula: celulaScope,
        },
      }),

      // Consolidadores ativos (filtrar por accountId via células)
      prisma.membro.count({
        where: {
          ehConsolidador: true,
          ativo: true,
          celula: celulaScope,
        }
      }),
      
      // Co-líderes ativos (filtrar por accountId via células)
      prisma.membro.count({
        where: {
          ehCoLider: true,
          ativo: true,
          celula: celulaScope,
        }
      })
    ]);

    // Calcular estatísticas do período atual (% presenças por tipo, Prisma modelo Presenca)
    const countByTipoStatus = (rows: Array<{ tipo: number; status: number; _count: { _all: number } }>, tipo: number, status?: number) =>
      rows
        .filter((p) => p.tipo === tipo && (status === undefined || p.status === status))
        .reduce((sum, p) => sum + p._count._all, 0);

    const totCel = countByTipoStatus(presencas, 0);
    const presCel = countByTipoStatus(presencas, 0, 1);
    const totCult = countByTipoStatus(presencas, 1);
    const presCult = countByTipoStatus(presencas, 1, 1);

    const pctCel = totCel > 0 ? Math.round((presCel / totCel) * 100) : 0;
    const pctCult = totCult > 0 ? Math.round((presCult / totCult) * 100) : 0;
    const denomAtual = totCel + totCult;
    const mediaFrequencia = denomAtual > 0 ? Math.round(((presCel + presCult) / denomAtual) * 100) : 0;

    // Período anterior
    const totCelAnt = countByTipoStatus(presencasAnteriores, 0);
    const presCelAnt = countByTipoStatus(presencasAnteriores, 0, 1);
    const totCultAnt = countByTipoStatus(presencasAnteriores, 1);
    const presCultAnt = countByTipoStatus(presencasAnteriores, 1, 1);

    const pctCelAnt = totCelAnt > 0 ? Math.round((presCelAnt / totCelAnt) * 100) : 0;
    const pctCultAnt = totCultAnt > 0 ? Math.round((presCultAnt / totCultAnt) * 100) : 0;
    const denomAnt = totCelAnt + totCultAnt;
    const mediaFrequenciaAnterior = denomAnt > 0 ? Math.round(((presCelAnt + presCultAnt) / denomAnt) * 100) : 0;

    // Calcular variações
    const variacaoFrequencia = mediaFrequenciaAnterior > 0 
      ? ((mediaFrequencia - mediaFrequenciaAnterior) / mediaFrequenciaAnterior) * 100 
      : 0;
    
    const crescimentoMembros = membrosAnteriores > 0 
      ? ((totalMembros - membrosAnteriores) / membrosAnteriores) * 100 
      : 0;

    // Processar dados por região
    const dadosPorRegiao = celulasPorRegiao.map(regiao => {
      const membrosDaRegiao = membrosPorRegiao.find(r => r.id === regiao.id);
      const totalMembrosDaRegiao = membrosDaRegiao?.celulas.reduce((total, celula) => 
        total + celula._count.membros, 0) || 0;

      return {
        id: regiao.id,
        nome: regiao.nome,
        totalCelulas: regiao._count.celulas,
        totalMembros: totalMembrosDaRegiao,
        mediaMembros: regiao._count.celulas > 0 
          ? Math.round(totalMembrosDaRegiao / regiao._count.celulas) 
          : 0
      };
    });

    const publicos: PublicoCelula[] = ['homens', 'mulheres', 'misto', 'nao_informado'];
    const porPublico = await Promise.all(
      publicos.map(async (publico) => {
        const scope = {
          accountId,
          ...(liderId != null ? { liderId } : {}),
          publico,
        };
        const [totalCelulasPublico, totalMembrosPublico, relatoriosPublico] = await Promise.all([
          prisma.celula.count({ where: { ativo: true, ...scope } }),
          prisma.membro.count({ where: { ativo: true, celula: { ativo: true, ...scope } } }),
          prisma.relatorio.count({
            where: {
              status: 1,
              dataEnvio: { gte: dataInicio, lte: hoje },
              celula: scope,
            },
          }),
        ]);
        return {
          publico,
          totalCelulas: totalCelulasPublico,
          totalMembros: totalMembrosPublico,
          relatoriosEnviados: relatoriosPublico,
        };
      }),
    );

    const response = {
      resumo: {
        totalCelulas,
        totalSupervisores,
        totalLideres,
        totalMembros,
        mediaFrequencia: Math.round(mediaFrequencia),
        crescimentoMembros: Math.round(crescimentoMembros),
        variacaoFrequencia: Math.round(variacaoFrequencia)
      },
      indicadores: {
        relatoriosEnviados,
        consolidadoresAtivos,
        coLideresAtivos,
        novosMembros,
        mediaMembrosPorCelula: totalCelulas > 0 ? Math.round(totalMembros / totalCelulas) : 0
      },
      frequencia: {
        atual: {
          celula: pctCel,
          culto: pctCult,
          media: Math.round(mediaFrequencia),
        },
        anterior: {
          celula: pctCelAnt,
          culto: pctCultAnt,
          media: Math.round(mediaFrequenciaAnterior),
        },
      },
      regioes: dadosPorRegiao,
      porPublico,
      filtros: {
        liderId: liderId ?? null,
        publico: publicoQuery && isPublicoCelula(publicoQuery) ? publicoQuery : null,
      },
    };

    console.log('[DEBUG] Resposta final:', response);
    res.json(response);
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    res.status(500).json({ message: 'Erro ao obter estatísticas' });
  }
});

// Rota para exportar relatório em PDF
adminRouter.get('/relatorios/exportar', async (req, res) => {
  try {
    const { tipo, periodo } = req.query;
    
    // TODO: Implementar geração de PDF
    // Por enquanto, retornamos um erro
    res.status(501).json({ message: 'Exportação de PDF ainda não implementada' });
  } catch (error) {
    console.error('Erro ao exportar relatório:', error);
    res.status(500).json({ message: 'Erro ao exportar relatório' });
  }
});

// Rotas para células
adminRouter.get('/celulas/exportar', exportarCelulasCsv);
adminRouter.get('/celulas/status-relatorios', statusRelatoriosCelulas);
adminRouter.get('/celulas', listarCelulas);
adminRouter.get('/celulas/:id', obterCelula);
adminRouter.post('/celulas', criarCelula);
adminRouter.put('/celulas/:id', atualizarCelula);
adminRouter.patch('/celulas/:id/desativar', desativarCelula);
adminRouter.delete('/celulas/:id', deletarCelula);

// Rotas para membros
adminRouter.get('/membros', listarTodosMembros);

export { adminRouter }; 