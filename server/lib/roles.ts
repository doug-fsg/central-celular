/** Papéis e permissões centralizados (SaaS + igreja). */

export const CARGO = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  PASTOR: 'PASTOR',
  SUPERVISOR: 'SUPERVISOR',
  LIDER: 'LIDER',
  LIDER_EM_TREINAMENTO: 'LIDER_EM_TREINAMENTO',
} as const;

/** Dono da plataforma Aprisco — vê todas as contas (igrejas). */
export function isPlatformOwner(isSuperAdmin: boolean | undefined): boolean {
  return isSuperAdmin === true;
}

/** Admin da igreja (conta) — painel /admin/* só da própria account. */
export function isChurchAdmin(cargo: string | undefined): boolean {
  return (cargo ?? '').toUpperCase() === CARGO.PASTOR;
}

/** Acesso ao painel da igreja: pastor ou dono da plataforma na conta dele. */
export function canAccessChurchAdminPanel(
  cargo: string | undefined,
  isSuperAdmin: boolean | undefined,
): boolean {
  return isChurchAdmin(cargo) || isPlatformOwner(isSuperAdmin);
}
