import type { DashboardCuidadoResponse } from '../services/adminService'

export type DashboardCuidadoLimiares = DashboardCuidadoResponse['limiares']

export const DEFAULT_DASHBOARD_CUIDADO_LIMIARES: DashboardCuidadoLimiares = {
  coberturaBaixaPct: 80,
  semaforoOkGte: 95,
  semaforoCriticoLt: 85,
  limiteFeedMembros: 15,
  maxAlertasPorTipoUi: 5,
}

export function resolveDashboardLimiares(
  limiares?: DashboardCuidadoLimiares | null,
): DashboardCuidadoLimiares {
  return { ...DEFAULT_DASHBOARD_CUIDADO_LIMIARES, ...limiares }
}

export function isCelulaEmRisco(
  percentualCobertura: number,
  totalMembros: number,
  limiares: DashboardCuidadoLimiares,
): boolean {
  return totalMembros > 0 && percentualCobertura < limiares.coberturaBaixaPct
}

/** Classes Tailwind para barra/destaque de cobertura (semáforo visual). */
export function coverageTone(
  percentualCobertura: number,
  limiares: DashboardCuidadoLimiares,
): 'ok' | 'atencao' | 'critico' {
  if (percentualCobertura >= limiares.semaforoOkGte) return 'ok'
  if (percentualCobertura >= limiares.semaforoCriticoLt) return 'atencao'
  return 'critico'
}

export function coverageBarClass(
  percentualCobertura: number,
  limiares: DashboardCuidadoLimiares,
): string {
  const tone = coverageTone(percentualCobertura, limiares)
  if (tone === 'ok') return 'bg-emerald-500'
  if (tone === 'atencao') return 'bg-amber-500'
  return 'bg-rose-500'
}

export function coverageRowClass(
  percentualCobertura: number,
  totalMembros: number,
  limiares: DashboardCuidadoLimiares,
): string {
  if (!isCelulaEmRisco(percentualCobertura, totalMembros, limiares)) return ''
  if (coverageTone(percentualCobertura, limiares) === 'critico') {
    return 'bg-rose-50/40'
  }
  return 'bg-amber-50/40'
}

export function coverageCardClass(
  percentualCobertura: number,
  totalMembros: number,
  limiares: DashboardCuidadoLimiares,
): string {
  if (!isCelulaEmRisco(percentualCobertura, totalMembros, limiares)) {
    return 'bg-white border-neutral-100'
  }
  if (coverageTone(percentualCobertura, limiares) === 'critico') {
    return 'bg-rose-50/60 border-rose-100'
  }
  return 'bg-amber-50/60 border-amber-100'
}

export function hasAlertasPendentes(
  totais: DashboardCuidadoResponse['totaisAlertas'] | null | undefined,
): boolean {
  if (!totais) return false
  return (
    totais.membrosSemCuidador > 0 ||
    totais.celulasBaixaCobertura > 0 ||
    totais.consolidadoresSobrecarregados > 0
  )
}
