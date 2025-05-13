import api from './api';

interface WhatsAppConnection {
  id: number;
  name: string;
  status: 'pending' | 'connected' | 'disconnected';
  qrCode?: string;
  createdAt: string;
  updatedAt: string;
  phoneNumber?: string;
  connectedAt?: string;
  token?: string;
  accountId: number;
}

// Função para gerar código aleatório de 19 caracteres
function generateRandomCode(): string {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 19; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export const whatsappService = {
  // Gerar QR Code para nova conexão
  async generateQRCode(name: string): Promise<WhatsAppConnection> {
    try {
      console.log('[WhatsApp Service] Iniciando geração de QR Code para:', name);
      
      const userEmail = import.meta.env.VITE_QUEPASA_USER_EMAIL;
      if (!userEmail) {
        throw new Error('Email do WhatsApp não configurado');
      }

      const accountId = api.getUsuario()?.accountId;
      if (!accountId) {
        throw new Error('ID da conta não encontrado');
      }

      // Gerar token no formato CT-accountId-codigoAleatorio
      const randomCode = generateRandomCode();
      const token = `CT-${accountId}-${randomCode}`;

      console.log('[WhatsApp Service] Credenciais:', {
        tokenExists: !!token,
        tokenLength: token?.length,
        userEmailExists: !!userEmail,
        userEmail: userEmail
      });

      // Gerar QR Code
      const response = await fetch('/whatsapp-api/scan', {
        method: 'GET',
        headers: {
          'X-QUEPASA-TOKEN': token,
          'X-QUEPASA-USER': userEmail,
          'Accept': 'image/png'
        }
      });

      console.log('[WhatsApp Service] Resposta recebida:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        type: response.type,
        bodyUsed: response.bodyUsed
      });

      if (!response.ok) {
        throw new Error(`Erro ao gerar QR Code: ${response.status} ${response.statusText}`);
      }

      console.log('[WhatsApp Service] Convertendo resposta para blob');
      const blob = await response.blob();
      console.log('[WhatsApp Service] Blob criado:', {
        size: blob.size,
        type: blob.type
      });

      console.log('[WhatsApp Service] Convertendo blob para base64');
      const base64data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          console.log('[WhatsApp Service] Base64 gerado com sucesso, tamanho:', 
            result?.length || 0);
          resolve(result);
        };
        reader.onerror = (error) => {
          console.error('[WhatsApp Service] Erro ao ler blob:', error);
          resolve('');
        };
        reader.readAsDataURL(blob);
      });

      console.log('[WhatsApp Service] Preparando objeto de retorno');
      
      // Criar conexão no banco
      const connection = await api.post('/whatsapp/connections', {
        name,
        token
      });

      return {
        ...connection,
        qrCode: base64data
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('[WhatsApp Service] Erro detalhado:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      } else {
        console.error('[WhatsApp Service] Erro desconhecido:', error);
      }
      throw error;
    }
  },

  // Verificar conexão específica pelo token
  async checkConnection(token: string): Promise<boolean> {
    try {
      console.log('[WhatsApp Service] Verificando conexão para token:', token);
      
      // Verificar status no QuePasa
      const quepasaResponse = await fetch(`/whatsapp-api/v3/bot/${token}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!quepasaResponse.ok) {
        console.log('[WhatsApp Service] Conexão não estabelecida:', quepasaResponse.status);
        return false;
      }

      const quepasaData = await quepasaResponse.json();
      console.log('[WhatsApp Service] Resposta da verificação:', quepasaData);

      if (quepasaData.success) {
        // Atualizar status no banco
        await api.patch(`/whatsapp/connections/${token}`, {
          status: 'connected',
          phoneNumber: quepasaData.server?.wid
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('[WhatsApp Service] Erro ao verificar conexão:', error);
      return false;
    }
  },

  // Verificar se usuário já tem conexão ativa
  async hasActiveConnection(): Promise<boolean> {
    try {
      const response = await api.get('/whatsapp/connections/active');
      return response.hasActive;
    } catch (error) {
      console.error('Erro ao verificar conexões ativas:', error);
      return false;
    }
  },

  // Buscar conexões da conta
  async getAccountConnections(): Promise<WhatsAppConnection[]> {
    try {
      const connections = await api.get('/whatsapp/connections');
      return connections;
    } catch (error) {
      console.error('Erro ao listar conexões:', error);
      return [];
    }
  },

  // Deletar uma conexão
  async deleteConnection(token: string): Promise<boolean> {
    try {
      console.log('[WhatsApp Service] Iniciando deleção da conexão com token:', token);
      
      // Deletar no QuePasa primeiro
      const quepasaResponse = await fetch('/whatsapp-api/info', {
        method: 'DELETE',
        headers: {
          'X-QUEPASA-TOKEN': token,
          'Accept': 'application/json'
        }
      });

      if (!quepasaResponse.ok) {
        console.error('[WhatsApp Service] Erro ao deletar no QuePasa:', quepasaResponse.status, quepasaResponse.statusText);
        
        // Se o erro for 404, podemos continuar e apagar no banco local, pois a conexão já não existe no QuePasa
        if (quepasaResponse.status !== 404) {
          throw new Error(`Erro ao deletar conexão no servidor QuePasa: ${quepasaResponse.status} ${quepasaResponse.statusText}`);
        }
      }

      // Verificar resposta do QuePasa
      const quepasaData = await quepasaResponse.json();
      console.log('[WhatsApp Service] Resposta da deleção QuePasa:', quepasaData);

      // Mesmo com erro no QuePasa, continuamos com a deleção no banco local
      // Deletar no banco de dados
      await api.delete(`/whatsapp/connections/${token}`);
      console.log('[WhatsApp Service] Conexão deletada com sucesso do banco de dados');

      return true;
    } catch (error) {
      console.error('[WhatsApp Service] Erro ao deletar conexão:', error);
      throw error;
    }
  }
}; 