import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const atribuicaoSchema = z.object({
  membroId: z.number(),
  consolidadorId: z.number().optional().nullable(),
  liderId: z.number().optional().nullable(),
}).refine(
  (d) => (d.consolidadorId != null) !== (d.liderId != null),
  { message: 'Informe consolidadorId OU liderId, não ambos e nem nenhum' }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getUsuarioId(req: Request): number | null {
  return (req as any).user?.id ?? (req as any).usuario?.id ?? null;
}

function getAccountId(req: Request): number | null {
  return (req as any).user?.accountId ?? (req as any).usuario?.accountId ?? null;
}

async function verificarPermissao(
  req: Request,
  celulaId: number
): Promise<{ permitido: boolean; motivo?: string }> {
  const accountId = getAccountId(req);
  const userId = getUsuarioId(req);

  if (!accountId || !userId) {
    return { permitido: false, motivo: 'Não autenticado' };
  }

  const usuario = (req as any).usuario;
  const cargo = (usuario?.cargo ?? '').toUpperCase();

  // Admin / Pastor: acesso total na account
  if (
    cargo === 'ADMINISTRADOR' ||
    cargo === 'PASTOR' ||
    (req as any).user?.isSuperAdmin
  ) {
    // Garantir que a célula pertence à mesma account
    const celulas = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM celulas WHERE id = ${celulaId} AND account_id = ${accountId} LIMIT 1
    `;
    if (!celulas.length) return { permitido: false, motivo: 'Célula não encontrada' };
    return { permitido: true };
  }

  // Supervisor: pode gerenciar células onde é supervisor
  if (cargo === 'SUPERVISOR') {
    const celulas = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM celulas
      WHERE id = ${celulaId} AND account_id = ${accountId} AND supervisor_id = ${userId}
      LIMIT 1
    `;
    if (!celulas.length) return { permitido: false, motivo: 'Acesso negado' };
    return { permitido: true };
  }

  // Líder: somente sua(s) célula(s)
  if (cargo === 'LIDER' || cargo === 'LÍDER') {
    const celulas = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM celulas
      WHERE id = ${celulaId} AND account_id = ${accountId} AND lider_id = ${userId}
      LIMIT 1
    `;
    if (!celulas.length) return { permitido: false, motivo: 'Acesso negado' };
    return { permitido: true };
  }

  return { permitido: false, motivo: 'Cargo sem permissão para esta operação' };
}

// ---------------------------------------------------------------------------
// GET /celulas/:id/rede-cuidado
// ---------------------------------------------------------------------------
export const obterRedeCuidado = async (req: Request, res: Response) => {
  try {
    const celulaId = Number(req.params.id);
    const accountId = getAccountId(req);

    if (!accountId) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    // Buscar célula (verificar account)
    const celulas = await prisma.$queryRaw<
      { id: number; nome: string; lider_id: number; lider_nome: string }[]
    >`
      SELECT c.id, c.nome, c.lider_id, u.nome AS lider_nome
      FROM celulas c
      JOIN usuarios u ON u.id = c.lider_id
      WHERE c.id = ${celulaId} AND c.account_id = ${accountId}
      LIMIT 1
    `;

    if (!celulas.length) {
      return res.status(404).json({ message: 'Célula não encontrada' });
    }

    const celula = celulas[0];

    // Todos os membros ativos da célula
    const membros = await prisma.$queryRaw<
      {
        id: number;
        nome: string;
        telefone: string | null;
        eh_consolidador: boolean;
        eh_colider: boolean;
        eh_anfitriao: boolean;
      }[]
    >`
      SELECT id, nome, telefone, eh_consolidador, eh_colider, eh_anfitriao
      FROM membros
      WHERE celula_id = ${celulaId} AND ativo = true
      ORDER BY nome ASC
    `;

    // Atribuições da célula
    const atribuicoes = await prisma.$queryRaw<
      {
        id: number;
        membro_id: number;
        consolidador_id: number | null;
        lider_id: number | null;
        consolidador_nome: string | null;
        lider_nome: string | null;
      }[]
    >`
      SELECT
        ac.id,
        ac.membro_id,
        ac.consolidador_id,
        ac.lider_id,
        m_cons.nome AS consolidador_nome,
        u_lider.nome AS lider_nome
      FROM atribuicoes_cuidado ac
      LEFT JOIN membros m_cons ON m_cons.id = ac.consolidador_id
      LEFT JOIN usuarios u_lider ON u_lider.id = ac.lider_id
      WHERE ac.celula_id = ${celulaId}
    `;

    // Mapa membroId → atribuição
    const atribuicaoMap = new Map(atribuicoes.map((a) => [a.membro_id, a]));

    // Consolidadores ativos na célula
    const consolidadores = membros.filter((m) => m.eh_consolidador);

    // Agrupar cuidados por cuidador
    interface CuidadoInfo {
      atribuicaoId: number;
      membroId: number;
      nome: string;
      telefone: string | null;
      ehConsolidador: boolean;
      ehCoLider: boolean;
      ehAnfitriao: boolean;
    }

    interface CuidadorInfo {
      tipo: 'lider' | 'consolidador';
      cuidadorId: number;
      nome: string;
      cuidados: CuidadoInfo[];
    }

    const cuidadoresMap = new Map<string, CuidadorInfo>();

    // Adicionar líder como cuidador potencial
    cuidadoresMap.set(`lider_${celula.lider_id}`, {
      tipo: 'lider',
      cuidadorId: celula.lider_id,
      nome: celula.lider_nome,
      cuidados: [],
    });

    // Adicionar consolidadores como cuidadores potenciais
    for (const cons of consolidadores) {
      cuidadoresMap.set(`consolidador_${cons.id}`, {
        tipo: 'consolidador',
        cuidadorId: cons.id,
        nome: cons.nome,
        cuidados: [],
      });
    }

    // Distribuir membros cuidados
    const membrosSemCuidador: typeof membros = [];

    for (const membro of membros) {
      const atrib = atribuicaoMap.get(membro.id);
      const cuidadoInfo: CuidadoInfo = {
        atribuicaoId: atrib?.id ?? 0,
        membroId: membro.id,
        nome: membro.nome,
        telefone: membro.telefone,
        ehConsolidador: membro.eh_consolidador,
        ehCoLider: membro.eh_colider,
        ehAnfitriao: membro.eh_anfitriao,
      };

      if (atrib) {
        if (atrib.lider_id) {
          const key = `lider_${atrib.lider_id}`;
          if (!cuidadoresMap.has(key)) {
            // Líder removido mas ainda tem atribuição — incluir mesmo assim
            cuidadoresMap.set(key, {
              tipo: 'lider',
              cuidadorId: atrib.lider_id,
              nome: atrib.lider_nome ?? 'Líder',
              cuidados: [],
            });
          }
          cuidadoresMap.get(key)!.cuidados.push(cuidadoInfo);
        } else if (atrib.consolidador_id) {
          const key = `consolidador_${atrib.consolidador_id}`;
          if (!cuidadoresMap.has(key)) {
            cuidadoresMap.set(key, {
              tipo: 'consolidador',
              cuidadorId: atrib.consolidador_id,
              nome: atrib.consolidador_nome ?? 'Consolidador',
              cuidados: [],
            });
          }
          cuidadoresMap.get(key)!.cuidados.push(cuidadoInfo);
        }
      } else {
        membrosSemCuidador.push(membro);
      }
    }

    const cuidadores = Array.from(cuidadoresMap.values());
    const totalComCuidador = membros.length - membrosSemCuidador.length;

    return res.json({
      celula: { id: celula.id, nome: celula.nome },
      lider: { id: celula.lider_id, nome: celula.lider_nome },
      cuidadores,
      semCuidador: membrosSemCuidador.map((m) => ({
        id: m.id,
        nome: m.nome,
        telefone: m.telefone,
        ehConsolidador: m.eh_consolidador,
        ehCoLider: m.eh_colider,
        ehAnfitriao: m.eh_anfitriao,
      })),
      stats: {
        totalMembros: membros.length,
        totalComCuidador,
        totalSemCuidador: membrosSemCuidador.length,
        totalCuidadores: cuidadores.length,
      },
    });
  } catch (error) {
    console.error('[redeCuidado] Erro ao obter rede:', error);
    return res.status(500).json({ message: 'Erro ao obter rede de cuidado' });
  }
};

// ---------------------------------------------------------------------------
// POST /celulas/:id/rede-cuidado  — criar uma atribuição
// ---------------------------------------------------------------------------
export const criarAtribuicao = async (req: Request, res: Response) => {
  try {
    const celulaId = Number(req.params.id);
    const criadoPorId = getUsuarioId(req);

    const perm = await verificarPermissao(req, celulaId);
    if (!perm.permitido) {
      return res.status(403).json({ message: perm.motivo ?? 'Acesso negado' });
    }

    const data = atribuicaoSchema.parse(req.body);

    // Verificar se membro pertence à célula e está ativo
    const membros = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM membros WHERE id = ${data.membroId} AND celula_id = ${celulaId} AND ativo = true LIMIT 1
    `;
    if (!membros.length) {
      return res.status(400).json({ message: 'Membro não encontrado nesta célula' });
    }

    // Verificar auto-atribuição (consolidador não pode cuidar de si mesmo)
    if (data.consolidadorId === data.membroId) {
      return res.status(400).json({ message: 'Um consolidador não pode cuidar de si mesmo' });
    }

    // Verificar consolidador válido
    if (data.consolidadorId != null) {
      const cons = await prisma.$queryRaw<{ id: number }[]>`
        SELECT id FROM membros
        WHERE id = ${data.consolidadorId} AND celula_id = ${celulaId}
        AND eh_consolidador = true AND ativo = true
        LIMIT 1
      `;
      if (!cons.length) {
        return res.status(400).json({ message: 'Consolidador não encontrado ou inativo nesta célula' });
      }
    }

    // Verificar líder válido
    if (data.liderId != null) {
      const lideres = await prisma.$queryRaw<{ id: number }[]>`
        SELECT id FROM celulas WHERE id = ${celulaId} AND lider_id = ${data.liderId} LIMIT 1
      `;
      if (!lideres.length) {
        return res.status(400).json({ message: 'Líder não é líder desta célula' });
      }
    }

    // Upsert: se membro já tem atribuição, atualizar
    const existing = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM atribuicoes_cuidado WHERE membro_id = ${data.membroId} LIMIT 1
    `;

    if (existing.length) {
      await prisma.$executeRaw`
        UPDATE atribuicoes_cuidado
        SET
          consolidador_id = ${data.consolidadorId ?? null},
          lider_id = ${data.liderId ?? null},
          celula_id = ${celulaId},
          criado_por_id = ${criadoPorId},
          updated_at = NOW()
        WHERE membro_id = ${data.membroId}
      `;
      const updated = await prisma.$queryRaw<{ id: number }[]>`
        SELECT id FROM atribuicoes_cuidado WHERE membro_id = ${data.membroId}
      `;
      return res.json({ id: updated[0].id, membroId: data.membroId, ...data });
    }

    const result = await prisma.$queryRaw<{ id: number }[]>`
      INSERT INTO atribuicoes_cuidado (celula_id, membro_id, consolidador_id, lider_id, criado_por_id, updated_at)
      VALUES (${celulaId}, ${data.membroId}, ${data.consolidadorId ?? null}, ${data.liderId ?? null}, ${criadoPorId}, NOW())
      RETURNING id
    `;

    return res.status(201).json({ id: result[0].id, membroId: data.membroId, ...data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error('[redeCuidado] Erro ao criar atribuição:', error);
    return res.status(500).json({ message: 'Erro ao criar atribuição de cuidado' });
  }
};

// ---------------------------------------------------------------------------
// DELETE /celulas/:id/rede-cuidado/:membroId  — remover atribuição de um membro
// ---------------------------------------------------------------------------
export const removerAtribuicao = async (req: Request, res: Response) => {
  try {
    const celulaId = Number(req.params.id);
    const membroId = Number(req.params.membroId);

    const perm = await verificarPermissao(req, celulaId);
    if (!perm.permitido) {
      return res.status(403).json({ message: perm.motivo ?? 'Acesso negado' });
    }

    const existing = await prisma.$queryRaw<{ id: number }[]>`
      SELECT id FROM atribuicoes_cuidado WHERE membro_id = ${membroId} AND celula_id = ${celulaId} LIMIT 1
    `;

    if (!existing.length) {
      return res.status(404).json({ message: 'Atribuição não encontrada' });
    }

    await prisma.$executeRaw`
      DELETE FROM atribuicoes_cuidado WHERE membro_id = ${membroId} AND celula_id = ${celulaId}
    `;

    return res.json({ message: 'Atribuição removida' });
  } catch (error) {
    console.error('[redeCuidado] Erro ao remover atribuição:', error);
    return res.status(500).json({ message: 'Erro ao remover atribuição de cuidado' });
  }
};

// ---------------------------------------------------------------------------
// PUT /celulas/:id/rede-cuidado  — substituição em lote
// ---------------------------------------------------------------------------
export const salvarRedeLote = async (req: Request, res: Response) => {
  try {
    const celulaId = Number(req.params.id);
    const criadoPorId = getUsuarioId(req);

    const perm = await verificarPermissao(req, celulaId);
    if (!perm.permitido) {
      return res.status(403).json({ message: perm.motivo ?? 'Acesso negado' });
    }

    const schema = z.array(atribuicaoSchema.extend({ membroId: z.number() }));
    const atribuicoes = schema.parse(req.body);

    // Processar cada atribuição em transação
    for (const atrib of atribuicoes) {
      // Validações básicas
      if (atrib.consolidadorId === atrib.membroId) continue; // pular auto-atribuição silenciosamente

      const existing = await prisma.$queryRaw<{ id: number }[]>`
        SELECT id FROM atribuicoes_cuidado WHERE membro_id = ${atrib.membroId} LIMIT 1
      `;

      if (existing.length) {
        await prisma.$executeRaw`
          UPDATE atribuicoes_cuidado
          SET
            consolidador_id = ${atrib.consolidadorId ?? null},
            lider_id = ${atrib.liderId ?? null},
            celula_id = ${celulaId},
            criado_por_id = ${criadoPorId},
            updated_at = NOW()
          WHERE membro_id = ${atrib.membroId}
        `;
      } else {
        await prisma.$executeRaw`
          INSERT INTO atribuicoes_cuidado (celula_id, membro_id, consolidador_id, lider_id, criado_por_id, updated_at)
          VALUES (${celulaId}, ${atrib.membroId}, ${atrib.consolidadorId ?? null}, ${atrib.liderId ?? null}, ${criadoPorId}, NOW())
          ON CONFLICT (membro_id) DO UPDATE
          SET consolidador_id = EXCLUDED.consolidador_id,
              lider_id = EXCLUDED.lider_id,
              celula_id = EXCLUDED.celula_id,
              criado_por_id = EXCLUDED.criado_por_id,
              updated_at = NOW()
        `;
      }
    }

    return res.json({ message: 'Rede de cuidado salva com sucesso' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.error('[redeCuidado] Erro ao salvar rede em lote:', error);
    return res.status(500).json({ message: 'Erro ao salvar rede de cuidado' });
  }
};
