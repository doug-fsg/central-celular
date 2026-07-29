/** Textos do painel unificado (Rede de cuidado + indicadores) */
export const DASHBOARD_UNIFIED_COPY = {
  pageSubtitle: 'Aqui está um panorama do cuidado na sua igreja hoje.',
  greeting: (period: 'Bom dia' | 'Boa tarde' | 'Boa noite', nome: string) =>
    `${period}, ${nome} 👋`,
  ctaRede: 'Gerenciar rede de cuidado',
  leaderFilter: 'Todos os líderes',
  sections: {
    coberturaGeral: 'Cobertura geral',
    frequencia: 'Frequência por data',
    participacao: 'Participação na semana',
    relatorios: 'Relatórios preenchidos',
    celulas: 'Cobertura por célula',
    cuidadores: 'Cuidadores ativos',
  },
  miniStats: {
    semCuidador: {
      label: 'Sem cuidador',
      hint: (n: number) =>
        n === 1 ? 'membro aguardando cuidador' : 'membros aguardando cuidador',
    },
    redeIncompleta: {
      label: 'Rede incompleta',
      hint: (n: number) =>
        n === 1 ? 'célula com cobertura incompleta' : 'células com cobertura incompleta',
    },
    acompanhados: {
      label: 'Acompanhados',
      hint: (n: number) =>
        n === 1 ? 'membro sendo acompanhado' : 'membros sendo acompanhados',
    },
    totalMembros: {
      label: 'Total de membros',
      hint: 'membros ativos na sua igreja',
    },
  },
  coberturaPct: (pct: number) => `${pct}% de cobertura na rede de cuidado`,
  frequenciaPeriodos: [
    { key: '7', label: '7 dias' },
    { key: '30', label: '30 dias' },
    { key: '90', label: '90 dias' },
  ] as const,
  participacao: {
    culto: 'No culto',
    celula: 'Na célula',
    membros: 'membros ativos',
  },
  relatorios: {
    preencheram: 'líderes preencheram',
    pendentes: 'pendentes',
    de: 'de',
  },
  cuidadores: {
    verRede: 'Ver rede',
    hint: 'consolidadores com cuidados atribuídos',
  },
} as const;

export type FrequenciaPeriodoKey = (typeof DASHBOARD_UNIFIED_COPY.frequenciaPeriodos)[number]['key'];

export function dashboardTimeGreeting(): 'Bom dia' | 'Boa tarde' | 'Boa noite' {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}
