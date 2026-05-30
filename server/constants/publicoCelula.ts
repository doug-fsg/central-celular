export const PUBLICO_CELULA_VALUES = ['homens', 'mulheres', 'misto', 'nao_informado'] as const;
export type PublicoCelula = (typeof PUBLICO_CELULA_VALUES)[number];

export const PUBLICO_CELULA_LABELS: Record<PublicoCelula, string> = {
  homens: 'Homens',
  mulheres: 'Mulheres',
  misto: 'Misto',
  nao_informado: 'Não informado',
};

export function isPublicoCelula(value: string): value is PublicoCelula {
  return (PUBLICO_CELULA_VALUES as readonly string[]).includes(value);
}
