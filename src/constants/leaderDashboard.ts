import { dashboardTimeGreeting } from './dashboardUnified'

export const LEADER_DASHBOARD_COPY = {
  pageSubtitle: 'Panorama da sua célula esta semana.',
  greeting: (period: 'Bom dia' | 'Boa tarde' | 'Boa noite', nome: string) =>
    `${period}, ${nome} 👋`,
  ctaRelatorio: 'Enviar relatório',
  ctaRede: 'Gerenciar rede de cuidado',
  sections: {
    equipe: 'Sua equipe',
  },
  miniStats: {
    semCuidador: {
      label: 'Sem cuidador',
      hint: (n: number) =>
        n === 1 ? 'membro aguardando cuidador' : 'membros aguardando cuidador',
    },
    consolidadores: {
      label: 'Consolidadores',
      hint: (n: number) =>
        n === 1 ? 'consolidador ativo na célula' : 'consolidadores ativos na célula',
    },
    acompanhados: {
      label: 'Acompanhados',
      hint: (n: number) =>
        n === 1 ? 'membro sendo acompanhado' : 'membros sendo acompanhados',
    },
    totalMembros: {
      label: 'Total de membros',
      hint: 'membros ativos na célula',
    },
  },
  relatorio: {
    enviado: 'Relatório enviado',
    pendente: 'Relatório pendente',
    hintEnviado: 'Você já enviou o relatório desta semana.',
    hintPendente: 'Envie a frequência antes do fim do prazo.',
  },
} as const

export { dashboardTimeGreeting }
