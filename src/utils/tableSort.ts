export type SortDirection = 'asc' | 'desc'

export type SortState = {
  key: string
  dir: SortDirection
}

export function toggleSortState(current: SortState | null, key: string): SortState | null {
  if (current?.key === key) {
    if (current.dir === 'asc') return { key, dir: 'desc' }
    return null
  }
  return { key, dir: 'asc' }
}

function comparePrimitive(a: string | number | null | undefined, b: string | number | null | undefined, dir: SortDirection) {
  const aVal = a ?? ''
  const bVal = b ?? ''
  let result = 0
  if (typeof aVal === 'number' && typeof bVal === 'number') {
    result = aVal - bVal
  } else {
    result = String(aVal).localeCompare(String(bVal), 'pt-BR', { sensitivity: 'base' })
  }
  return dir === 'asc' ? result : -result
}

const CARGO_ORDER: Record<string, number> = {
  ADMINISTRADOR: 0,
  PASTOR: 1,
  SUPERVISOR: 2,
  LIDER: 3,
  MEMBRO: 4,
  VISITANTE: 5,
}

export function usuarioStatusRank(user: { possuiSenha?: boolean; status?: string; ativo?: boolean }) {
  if (user.possuiSenha === false) return 0
  if (user.status === 'ativo' || user.ativo === true) return 1
  return 2
}

export function compareUsuarios(
  a: { nome: string; whatsapp?: string | null; cargo?: string | null; possuiSenha?: boolean; status?: string; ativo?: boolean },
  b: { nome: string; whatsapp?: string | null; cargo?: string | null; possuiSenha?: boolean; status?: string; ativo?: boolean },
  sort: SortState,
) {
  switch (sort.key) {
    case 'nome':
      return comparePrimitive(a.nome, b.nome, sort.dir)
    case 'whatsapp':
      return comparePrimitive(a.whatsapp, b.whatsapp, sort.dir)
    case 'cargo': {
      const ordemA = CARGO_ORDER[(a.cargo || '').toUpperCase()] ?? 999
      const ordemB = CARGO_ORDER[(b.cargo || '').toUpperCase()] ?? 999
      const result = ordemA !== ordemB ? ordemA - ordemB : a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
      return sort.dir === 'asc' ? result : -result
    }
    case 'status':
      return comparePrimitive(usuarioStatusRank(a), usuarioStatusRank(b), sort.dir)
    default:
      return 0
  }
}
