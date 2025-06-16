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
      
      try {
        // Tentar deletar no QuePasa primeiro
        const quepasaResponse = await fetch('/whatsapp-api/info', {
          method: 'DELETE',
          headers: {
            'X-QUEPASA-TOKEN': token,
            'Accept': 'application/json'
          }
        });

        // Se a resposta for 404, significa que a conexão já não existe no QuePasa
        // Nesse caso, continuamos com a deleção no banco local
        if (!quepasaResponse.ok && quepasaResponse.status !== 404) {
          console.error('[WhatsApp Service] Erro ao deletar no QuePasa:', quepasaResponse.status, quepasaResponse.statusText);
          const responseText = await quepasaResponse.text();
          console.error('[WhatsApp Service] Detalhes do erro:', responseText);
        } else {
          console.log('[WhatsApp Service] Conexão deletada ou já não existia no QuePasa');
        }
      } catch (quepasaError) {
        // Se houver erro ao comunicar com o QuePasa, logamos mas continuamos
        console.error('[WhatsApp Service] Erro ao tentar deletar no QuePasa:', quepasaError);
        console.log('[WhatsApp Service] Continuando com a deleção no banco local...');
      }

      // Sempre deletar do banco local, independente do resultado no QuePasa
      await api.delete(`/whatsapp/connections/${token}`);
      console.log('[WhatsApp Service] Conexão deletada com sucesso do banco de dados');

      return true;
    } catch (error) {
      console.error('[WhatsApp Service] Erro ao deletar conexão:', error);
      throw error;
    }
  },

  // Verificar status real da conexão no QuePasa
  async checkQuePasaStatus(token: string): Promise<boolean> {
    try {
      console.log('[WhatsApp Service] Verificando status no QuePasa para token:', token);
      
      const response = await fetch('/whatsapp-api/info', {
        method: 'GET',
        headers: {
          'X-QUEPASA-TOKEN': token,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.log('[WhatsApp Service] Conexão não está ativa no QuePasa:', response.status);
        // Atualizar status no banco como desconectado
        await api.patch(`/whatsapp/connections/${token}`, {
          status: 'disconnected'
        });
        return false;
      }

      const data = await response.json();
      console.log('[WhatsApp Service] Resposta do QuePasa:', data);

      // Verifica se a resposta foi bem sucedida e se o servidor está verificado
      const isConnected = data.success === true && 
                         data.server?.verified === true && 
                         data.server?.wid != null;

      console.log('[WhatsApp Service] Status da conexão:', { isConnected, data });
      
      // Atualizar status no banco
      await api.patch(`/whatsapp/connections/${token}`, {
        status: isConnected ? 'connected' : 'disconnected',
        phoneNumber: data.server?.wid
      });

      return isConnected;
    } catch (error) {
      console.error('[WhatsApp Service] Erro ao verificar status no QuePasa:', error);
      return false;
    }
  }
}; 