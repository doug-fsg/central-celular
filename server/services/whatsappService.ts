import { prisma } from '../lib/prisma';

export const whatsappService = {
  // Criar nova conexão
  async createConnection(data: {
    name: string;
    token: string;
    accountId: number;
  }) {
    return prisma.whatsAppConnection.create({
      data: {
        name: data.name,
        token: data.token,
        accountId: data.accountId
      }
    });
  },

  // Atualizar status da conexão
  async updateConnectionStatus(token: string, data: {
    status: string;
    phoneNumber?: string;
    connectedAt?: Date;
  }) {
    return prisma.whatsAppConnection.update({
      where: { token },
      data
    });
  },

  // Buscar conexões de uma account
  async getAccountConnections(accountId: number) {
    return prisma.whatsAppConnection.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' }
    });
  },

  // Buscar conexão pelo token
  async getConnectionByToken(token: string) {
    return prisma.whatsAppConnection.findUnique({
      where: { token }
    });
  },

  // Verificar se account tem conexão ativa
  async hasActiveConnection(accountId: number) {
    const connection = await prisma.whatsAppConnection.findFirst({
      where: {
        accountId,
        status: 'connected'
      }
    });
    return !!connection;
  },

  // Deletar uma conexão
  async deleteConnection(token: string) {
    return prisma.whatsAppConnection.delete({
      where: { token }
    });
  }
}; 