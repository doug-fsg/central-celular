import type { Celula } from '../services/adminService'

/** Normaliza resposta da API (create/update) para o CellModal. */
export function normalizeCelulaFromApi(
  raw: Partial<Celula> & { lider_id?: number; celula?: Partial<Celula> },
): Partial<Celula> {
  const data = (raw.celula ?? raw) as Partial<Celula> & { lider_id?: number }
  const id = data.id ?? (data as { celulaId?: number }).celulaId
  const liderId = data.liderId ?? data.lider_id ?? data.lider?.id
  const supervisorId = data.supervisor_id ?? data.supervisorId ?? data.supervisor?.id
  return {
    ...data,
    id,
    liderId,
    lider_id: liderId,
    supervisor_id: supervisorId,
    supervisorId,
  }
}
