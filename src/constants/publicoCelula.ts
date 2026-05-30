export const PUBLICO_CELULA_VALUES = ['homens', 'mulheres', 'misto', 'nao_informado'] as const;
export type PublicoCelula = (typeof PUBLICO_CELULA_VALUES)[number];

export const PUBLICO_CELULA_OPTIONS: { value: PublicoCelula; label: string }[] = [
  { value: 'homens', label: 'Homens' },
  { value: 'mulheres', label: 'Mulheres' },
  { value: 'misto', label: 'Misto' },
  { value: 'nao_informado', label: 'Não informado' },
];

export const PUBLICO_CELULA_LABELS: Record<PublicoCelula, string> = {
  homens: 'Homens',
  mulheres: 'Mulheres',
  misto: 'Misto',
  nao_informado: 'Não informado',
};

export const PUBLICO_CELULA_BADGE_CLASS: Record<PublicoCelula, string> = {
  homens: 'bg-sky-100 text-sky-800',
  mulheres: 'bg-pink-100 text-pink-800',
  misto: 'bg-violet-100 text-violet-800',
  nao_informado: 'bg-amber-100 text-amber-800',
};

export function formatPublicoCelula(value?: PublicoCelula | string | null): string {
  if (!value || !(value in PUBLICO_CELULA_LABELS)) {
    return PUBLICO_CELULA_LABELS.nao_informado;
  }
  return PUBLICO_CELULA_LABELS[value as PublicoCelula];
}
