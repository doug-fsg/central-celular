import { prisma } from '../lib/prisma';

export const whatsappService = {
  // Função para formatar número de telefone de acordo com as regras de DDD
  formatPhoneNumber(ddd: string, number: string): string {
    // Remover qualquer caractere não numérico
    const cleanNumber = number.replace(/\D/g, '');
    const numericDDD = parseInt(ddd, 10);

    // Para DDDs de 11 a 31
    if (numericDDD >= 11 && numericDDD <= 31) {
      // Se o número tiver 8 dígitos, adiciona um 9 na frente
      if (cleanNumber.length === 8) {
        return '9' + cleanNumber;
      }
    }
    // Para DDDs de 32 a 99
    else if (numericDDD >= 32 && numericDDD <= 99) {
      // Se o número tiver 9 dígitos e começar com 9, remove o 9
      if (cleanNumber.length === 9 && cleanNumber.startsWith('9')) {
        return cleanNumber.substring(1);
      }
    }

    // Se não se encaixar em nenhuma regra, retorna o número limpo
    return cleanNumber;
  },

  // Função para formatar número completo (com DDD)
  formatFullPhoneNumber(phoneNumber: string): string {
    // Remove qualquer caractere não numérico
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Verifica se o número tem pelo menos 10 dígitos (2 do DDD + 8 do número)
    if (cleanNumber.length < 10) {
      return cleanNumber; // Retorna sem modificar se for muito curto
    }

    // Extrai DDD e número
    const ddd = cleanNumber.substring(0, 2);
    const number = cleanNumber.substring(2);

    // Aplica a formatação e retorna DDD + número formatado
    return ddd + this.formatPhoneNumber(ddd, number);
  },

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