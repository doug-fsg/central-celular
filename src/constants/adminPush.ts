export const PUSH_CARGO_LABELS: Record<string, string> = {
  LIDER: 'Líder',
  SUPERVISOR: 'Supervisor',
  PASTOR: 'Pastor',
  ADMINISTRADOR: 'Administrador',
  LIDER_EM_TREINAMENTO: 'Líder em treinamento',
}

export const PUSH_PLATFORM_LABELS: Record<string, string> = {
  web: 'Web',
  android: 'Android',
  ios: 'iOS',
}

export function cargoLabel(cargo: string): string {
  return PUSH_CARGO_LABELS[cargo?.toUpperCase()] ?? cargo
}

export function platformLabel(platform: string): string {
  return PUSH_PLATFORM_LABELS[platform?.toLowerCase()] ?? platform
}
