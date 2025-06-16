import { prisma } from '../lib/prisma';

export const usuarioConfigService = {
  // Obter configurações do usuário
  async getUsuarioConfig(usuarioId: number) {
    // Buscar configurações existentes ou criar padrão se não existir
    let config = await prisma.usuarioConfig.findUnique({
      where: { usuarioId }
    });

    if (!config) {
      // Criar configuração padrão
      config = await prisma.usuarioConfig.create({
        data: {
          usuarioId,
          notificacaoAniversarioAtiva: true,
          diasAntecedencia1: 3,
          diasAntecedencia2: 0
        }
      });
    }

    return config;
  },

  // Atualizar configurações do usuário
  async updateUsuarioConfig(usuarioId: number, data: {
    notificacaoAniversarioAtiva?: boolean;
    diasAntecedencia1?: number;
    diasAntecedencia2?: number;
  }) {
    // Verificar se já existe configuração
    const configExists = await prisma.usuarioConfig.findUnique({
      where: { usuarioId }
    });

    if (configExists) {
      // Atualizar configuração existente
      return prisma.usuarioConfig.update({
        where: { usuarioId },
        data
      });
    } else {
      // Criar nova configuração
      return prisma.usuarioConfig.create({
        data: {
          usuarioId,
          ...data
        }
      });
    }
  }
}; 