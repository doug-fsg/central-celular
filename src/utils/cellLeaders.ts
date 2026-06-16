import type { Usuario } from '../services/adminService'

const CELL_LEADER_CARGOS = new Set(['LIDER', 'SUPERVISOR', 'ADMINISTRADOR', 'PASTOR'])

/** Líderes elegíveis no select de nova célula (ativos + líderes pendentes sem senha). */
export function filterUsersForCellLeaderSelect(users: Usuario[]): Usuario[] {
  return users.filter((u) => {
    if (!CELL_LEADER_CARGOS.has(u.cargo)) return false
    if (u.status === 'ativo') return true
    return u.cargo === 'LIDER' && u.possuiSenha === false
  })
}

/** Normaliza resposta de POST /admin/usuarios para o tipo Usuario da UI. */
export function normalizeCreatedUsuario(
  raw: Usuario & { ativo?: boolean; conviteEnviado?: boolean },
): Usuario {
  const ativo = raw.ativo ?? raw.status === 'ativo'
  const possuiSenha = raw.possuiSenha ?? ativo === true
  return {
    id: raw.id,
    nome: raw.nome,
    whatsapp: raw.whatsapp,
    cargo: raw.cargo,
    ativo,
    status: ativo ? 'ativo' : 'inativo',
    possuiSenha,
  }
}

/** Garante que um líder recém-criado apareça no select mesmo se ainda estiver pendente. */
export function ensureUserInLeaderList(leaders: Usuario[], user: Usuario): Usuario[] {
  if (leaders.some((u) => u.id === user.id)) return leaders
  return [...leaders, user]
}
