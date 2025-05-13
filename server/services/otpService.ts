import { prisma } from '../lib/prisma';

interface CreateOtpParams {
  whatsapp: string;
  accountId: number;
}

export const otpService = {
  // Função para padronizar o formato do número
  formatWhatsApp(whatsapp: string): string {
    // Remove o + se existir e quaisquer caracteres não numéricos
    return whatsapp.replace(/^\+/, '').replace(/\D/g, '');
  },

  // Gerar um código OTP de 4 dígitos
  generateOtpCode(): string {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(`[OtpService] Código gerado: ${code}`);
    return code;
  },

  // Criar um novo OTP
  async createOtp({ whatsapp, accountId }: CreateOtpParams): Promise<{ code: string, expiresAt: Date }> {
    const formattedWhatsApp = this.formatWhatsApp(whatsapp);
    console.log(`[OtpService] Iniciando criação de OTP - WhatsApp: ${formattedWhatsApp}, AccountId: ${accountId}`);
    
    // Gerar um código OTP de 4 dígitos
    const code = this.generateOtpCode();
    
    // Definir validade para 10 minutos a partir de agora
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    try {
      // Verificar se já existe um código válido
      const existingCode = await prisma.OtpCode.findFirst({
        where: {
          whatsapp: formattedWhatsApp,
          accountId,
          expiresAt: { gt: new Date() },
          used: false
        }
      });

      if (existingCode) {
        console.log(`[OtpService] Código existente encontrado para ${formattedWhatsApp}: ${existingCode.code}, expira em: ${existingCode.expiresAt}`);
      }

      // Salvar o OTP no banco de dados
      const createdOtp = await prisma.OtpCode.create({
        data: {
          whatsapp: formattedWhatsApp,
          code,
          expiresAt,
          used: false,
          accountId
        }
      });
      
      console.log(`[OtpService] OTP criado com sucesso - ID: ${createdOtp.id}, Expira em: ${expiresAt}`);
      return { code, expiresAt };
    } catch (error) {
      console.error('[OtpService] Erro ao criar OTP:', error);
      throw error;
    }
  },

  // Verificar se um OTP é válido
  async verifyOtp(whatsapp: string, code: string, accountId: number): Promise<boolean> {
    const formattedWhatsApp = this.formatWhatsApp(whatsapp);
    console.log(`[OtpService] Iniciando verificação de OTP - WhatsApp: ${formattedWhatsApp}, Código: ${code}, AccountId: ${accountId}`);
    
    try {
      // Buscar todos os códigos para este WhatsApp para debug
      const allCodes = await prisma.OtpCode.findMany({
        where: { whatsapp: formattedWhatsApp },
        orderBy: { createdAt: 'desc' }
      });

      console.log(`[OtpService] Códigos encontrados para ${formattedWhatsApp}:`, 
        allCodes.map(c => ({
          code: c.code,
          usado: c.used,
          expiraEm: c.expiresAt,
          accountId: c.accountId,
          criadoEm: c.createdAt
        }))
      );

      const otpRecord = await prisma.OtpCode.findFirst({
        where: {
          whatsapp: formattedWhatsApp,
          code,
          expiresAt: { gt: new Date() },
          used: false,
          accountId
        }
      });
    
      if (!otpRecord) {
        // Buscar o registro sem as restrições para identificar o problema
        const anyOtpRecord = await prisma.OtpCode.findFirst({
          where: { whatsapp: formattedWhatsApp }
        });
      
        if (!anyOtpRecord) {
          console.log(`[OtpService] Nenhum código OTP encontrado para o WhatsApp ${formattedWhatsApp}`);
        } else {
          console.log(`[OtpService] Detalhes do último código encontrado para ${formattedWhatsApp}:`, {
            código: anyOtpRecord.code,
            usado: anyOtpRecord.used,
            expiraEm: anyOtpRecord.expiresAt,
            accountId: anyOtpRecord.accountId,
            criadoEm: anyOtpRecord.createdAt
          });

          if (anyOtpRecord.code !== code) {
            console.log(`[OtpService] Código incorreto para ${formattedWhatsApp}. Esperado: ${anyOtpRecord.code}, Recebido: ${code}`);
          }
          if (anyOtpRecord.used) {
            console.log(`[OtpService] Código já foi utilizado para ${formattedWhatsApp} em: ${anyOtpRecord.updatedAt}`);
          }
          if (anyOtpRecord.expiresAt <= new Date()) {
            console.log(`[OtpService] Código expirado para ${formattedWhatsApp}. Expirou em: ${anyOtpRecord.expiresAt}`);
          }
          if (anyOtpRecord.accountId !== accountId) {
            console.log(`[OtpService] Código pertence a outra account. Esperado: ${accountId}, Atual: ${anyOtpRecord.accountId}`);
          }
        }
      
        return false;
      }
    
      // Marcar OTP como usado
      await prisma.OtpCode.update({
        where: { id: otpRecord.id },
        data: { used: true }
      });
    
      console.log(`[OtpService] Código verificado com sucesso para ${formattedWhatsApp}`);
      return true;
    } catch (error) {
      console.error('[OtpService] Erro ao verificar OTP:', error);
      throw error;
    }
  },

  // Enviar OTP via WhatsApp
  async sendOtpWhatsApp(whatsapp: string, code: string, accountId: number): Promise<boolean> {
    const formattedWhatsApp = this.formatWhatsApp(whatsapp);
    console.log(`[OtpService] Iniciando envio de OTP via WhatsApp - WhatsApp: ${formattedWhatsApp}, AccountId: ${accountId}`);
    
    try {
      // Buscar conexão WhatsApp ativa da account
      const whatsappConnection = await prisma.WhatsAppConnection.findFirst({
        where: {
          accountId,
          status: 'connected'
        }
      });
      
      if (!whatsappConnection) {
        console.error(`[OtpService] Nenhuma conexão WhatsApp ativa encontrada para a account ${accountId}`);
        return false;
      }

      console.log(`[OtpService] Conexão WhatsApp encontrada - Token: ${whatsappConnection.token}`);
      
      // Montar a mensagem com o código
      const message = `Código de verificação: ${code}\nEste código expira em 10 minutos.`;
      
      // Fazer a requisição para a API de WhatsApp
      const response = await fetch(`http://173.249.22.227:31000/v3/bot/${whatsappConnection.token}/sendText/${formattedWhatsApp}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: message
        })
      });
      
      // Verificar se a requisição foi bem-sucedida
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[OtpService] Erro ao enviar mensagem: ${response.status} ${response.statusText}`, errorText);
        return false;
      }
      
      const data = await response.json();
      console.log('[OtpService] Resposta do envio de OTP:', data);
      
      return data.success === true;
    } catch (error) {
      console.error('[OtpService] Erro ao enviar OTP via WhatsApp:', error);
      return false;
    }
  }
}; 