import { prisma } from '../lib/prisma';
import { getQuepasaUpstream } from '../lib/env';

function toQuepasaChatId(phone: string): string {
  if (phone.includes('@')) {
    return phone;
  }
  return phone.replace(/\D/g, '');
}

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
    
    let countryCode = '';
    let numberWithoutCountryCode = cleanNumber;

    // Verifica se o número começa com 55 e tem o tamanho de um número brasileiro completo
    if (cleanNumber.startsWith('55') && (cleanNumber.length === 12 || cleanNumber.length === 13)) {
      countryCode = '55';
      numberWithoutCountryCode = cleanNumber.substring(2);
    }
    
    // Após remover o código do país, o número deve ter 10 ou 11 dígitos
    if (numberWithoutCountryCode.length < 10) {
      return cleanNumber; // Retorna o número original limpo se não corresponder ao padrão
    }

    // Extrai DDD e número
    const ddd = numberWithoutCountryCode.substring(0, 2);
    const number = numberWithoutCountryCode.substring(2);

    // Aplica a formatação no número
    const formattedNumber = this.formatPhoneNumber(ddd, number);
    
    // Monta o número final, incluindo o código do país se ele foi removido
    return countryCode + ddd + formattedNumber;
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
  },

  /**
   * Envia texto pelo QuePasa v5+ (`POST /send`).
   * O endpoint legado `/v3/bot/{token}/sendText/{phone}` retorna 404 nessa versão.
   */
  async sendText(token: string, phone: string, text: string): Promise<unknown> {
    const upstream = getQuepasaUpstream();
    const chatId = toQuepasaChatId(phone);
    const url = `${upstream}/send`;

    console.log('[WhatsApp Service] Enviando texto via QuePasa:', {
      url,
      chatId,
      tokenPrefix: token.slice(0, 10),
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-QUEPASA-TOKEN': token,
        'X-QUEPASA-CHATID': chatId,
      },
      body: JSON.stringify({
        text,
        chatid: chatId,
      }),
    });

    const raw = await response.text();
    let data: { success?: boolean; message?: string } = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { message: raw };
    }

    if (!response.ok) {
      throw new Error(
        `Erro ao enviar mensagem: ${response.status} ${response.statusText} - ${raw}`
      );
    }

    if (data.success === false) {
      throw new Error(data.message || 'Falha ao enviar mensagem via WhatsApp');
    }

    return data;
  },
}; 