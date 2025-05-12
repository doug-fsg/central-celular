import { Router } from 'express';
import { autenticacao } from '../middlewares/auth.middleware';
import { verificarAdmin } from '../middlewares/admin.middleware';
import { prisma } from '../lib/prisma';
import {
  listarUsuarios,
  obterUsuario,
  criarUsuario,
  atualizarUsuario,
  ativarDesativarUsuario,
} from '../controllers/usuarios.controller';
import {
  listarCelulas,
  obterCelula,
  criarCelula,
  atualizarCelula,
  desativarCelula
} from '../controllers/celulas.controller';

const adminRouter = Router();

// Todas as rotas requerem autenticação e privilégios de admin
adminRouter.use(autenticacao);
adminRouter.use(verificarAdmin);

// Rotas de usuários
adminRouter.get('/usuarios', listarUsuarios);
adminRouter.get('/usuarios/:id', obterUsuario);
adminRouter.post('/usuarios', criarUsuario);
adminRouter.put('/usuarios/:id', atualizarUsuario);
adminRouter.patch('/usuarios/:id/status', ativarDesativarUsuario);
adminRouter.delete('/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se usuário existe
    const usuario = await prisma.usuario.findUnique({
      where: { id: Number(id) }
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Não permitir excluir o próprio usuário
    if (usuario.id === (req as any).usuario.id) {
      return res.status(400).json({ message: 'Não é possível excluir o próprio usuário' });
    }

    // Excluir usuário
    await prisma.usuario.delete({
      where: { id: Number(id) }
    });

    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ message: 'Erro ao excluir usuário' });
  }
});

// Rota para obter estatísticas
adminRouter.get('/estatisticas', async (req, res) => {
  try {
    const periodo = req.query.periodo as string || 'mes';
    console.log(`[DEBUG] Obtendo estatísticas para período: ${periodo}`);
    
    // Calcular datas baseado no período
    const hoje = new Date();
    let dataInicio: Date;
    let periodoAnteriorInicio: Date;
    let periodoAnteriorFim: Date;
    
    switch (periodo) {
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
      consolidadoresAtivos
    ] = await Promise.all([
      // Total de células ativas
      prisma.celula.count({
        where: { ativo: true }
      }),
      
      // Total de supervisores ativos
      prisma.usuario.count({
        where: { 
          cargo: 'SUPERVISOR',
          ativo: true
        }
      }),
      
      // Total de líderes ativos
      prisma.usuario.count({
        where: { 
          cargo: 'LIDER',
          ativo: true
        }
      }),
      
      // Total de membros ativos
      prisma.membro.count({
        where: { ativo: true }
      }),
      
      // Presença total período atual
      prisma.presenca.findMany({
        where: {
          relatorio: {
            dataEnvio: {
              gte: dataInicio,
              lte: hoje
            }
          }
        }
      }),
      
      // Novos membros no período atual
      prisma.membro.count({
        where: {
          dataCadastro: {
            gte: dataInicio,
            lte: hoje
          }
        }
      }),

      // Total de membros período anterior
      prisma.membro.count({
        where: {
          dataCadastro: {
            lt: dataInicio
          },
          ativo: true
        }
      }),

      // Presenças período anterior
      prisma.presenca.findMany({
        where: {
          relatorio: {
            dataEnvio: {
              gte: periodoAnteriorInicio,
              lte: periodoAnteriorFim
            }
          }
        }
      }),

      // Células por região
      prisma.regiao.findMany({
        where: { ativo: true },
        select: {
          id: true,
          nome: true,
          _count: {
            select: {
              celulas: {
                where: { ativo: true }
              }
            }
          }
        }
      }),

      // Membros por região
      prisma.regiao.findMany({
        where: { ativo: true },
        select: {
          id: true,
          nome: true,
          celulas: {
            where: { ativo: true },
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

      // Relatórios enviados no período
      prisma.relatorio.count({
        where: {
          dataEnvio: {
            gte: dataInicio,
            lte: hoje
          }
        }
      }),

      // Consolidadores ativos
      prisma.membro.count({
        where: {
          ehConsolidador: true,
          ativo: true
        }
      })
    ]);

    // Calcular estatísticas do período atual
    const totalPresencas = presencas.length;
    const presencasCelula = presencas.filter(p => p.presencaCelula).length;
    const presencasCulto = presencas.filter(p => p.presencaCulto).length;
    const mediaFrequencia = totalPresencas > 0 
      ? ((presencasCelula + presencasCulto) / (totalPresencas * 2)) * 100 
      : 0;

    // Calcular estatísticas do período anterior
    const totalPresencasAnteriores = presencasAnteriores.length;
    const presencasCelulaAnteriores = presencasAnteriores.filter(p => p.presencaCelula).length;
    const presencasCultoAnteriores = presencasAnteriores.filter(p => p.presencaCulto).length;
    const mediaFrequenciaAnterior = totalPresencasAnteriores > 0 
      ? ((presencasCelulaAnteriores + presencasCultoAnteriores) / (totalPresencasAnteriores * 2)) * 100 
      : 0;

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
        novosMembros,
        mediaMembrosPorCelula: totalCelulas > 0 ? Math.round(totalMembros / totalCelulas) : 0
      },
      frequencia: {
        atual: {
          celula: presencasCelula,
          culto: presencasCulto,
          media: Math.round(mediaFrequencia)
        },
        anterior: {
          celula: presencasCelulaAnteriores,
          culto: presencasCultoAnteriores,
          media: Math.round(mediaFrequenciaAnterior)
        }
      },
      regioes: dadosPorRegiao
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
adminRouter.get('/celulas', listarCelulas);
adminRouter.get('/celulas/:id', obterCelula);
adminRouter.post('/celulas', criarCelula);
adminRouter.put('/celulas/:id', atualizarCelula);
adminRouter.patch('/celulas/:id/desativar', desativarCelula);

export { adminRouter }; 