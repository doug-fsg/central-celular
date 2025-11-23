import { prisma } from '../lib/prisma';
import { whatsappService } from './whatsappService';
import crypto from 'crypto';

interface CreateOtpParams {
  whatsapp: string;
  accountId: number;
  isInvite?: boolean;
}

export const otpService = {
  // Função para padronizar o formato do número
  formatWhatsApp(whatsapp: string): string {
    // Usa a nova função de formatação do whatsappService
    return whatsappService.formatFullPhoneNumber(whatsapp);
  },

  // Gerar um código OTP de 4 dígitos
  generateOtpCode(): string {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(`[OtpService] Código gerado: ${code}`);
    return code;
  },

  // Gerar token único para convite (similar ao SSO)
  generateInviteToken(): string {
    const token = crypto.randomBytes(32).toString('hex');
    console.log(`[OtpService] Token de convite gerado: ${token.substring(0, 8)}...`);
    return token;
  },

  // Criar um novo OTP
  async createOtp({ whatsapp, accountId, isInvite = false }: CreateOtpParams): Promise<{ code: string, expiresAt: Date }> {
    // Para convites, usar WhatsApp exatamente como recebido (já está normalizado)
    // Para OTPs normais, formatar usando a função padrão
    const formattedWhatsApp = isInvite ? whatsapp : this.formatWhatsApp(whatsapp);
    console.log(`[OtpService] Iniciando criação de OTP - WhatsApp: ${formattedWhatsApp}, AccountId: ${accountId}, isInvite: ${isInvite}`);
    
    // Gerar código OTP de 4 dígitos ou token único para convite
    const code = isInvite ? this.generateInviteToken() : this.generateOtpCode();
    
    // Definir validade para 10 minutos a partir de agora
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    try {
      // Verificar se já existe um código válido
      const existingCode = await prisma.otpCode.findFirst({
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
      const createdOtp = await prisma.otpCode.create({
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

  // Verificar se um OTP é válido (aceita código de 4 dígitos ou token único)
  async verifyOtp(whatsapp: string, code: string, accountId: number): Promise<boolean> {
    const formattedWhatsApp = this.formatWhatsApp(whatsapp);
    const isToken = code.length > 10; // Tokens são muito maiores que códigos de 4 dígitos
    console.log(`[OtpService] Iniciando verificação de OTP - WhatsApp: ${formattedWhatsApp}, Código/Token: ${isToken ? code.substring(0, 8) + '...' : code}, AccountId: ${accountId}, Tipo: ${isToken ? 'Token' : 'Código'}`);
    
    try {
      // Buscar todos os códigos para este WhatsApp para debug
      const allCodes = await prisma.otpCode.findMany({
        where: { whatsapp: formattedWhatsApp },
        orderBy: { createdAt: 'desc' }
      });

      console.log(`[OtpService] Códigos encontrados para ${formattedWhatsApp}:`, 
        allCodes.map(c => ({
          code: c.code.length > 10 ? c.code.substring(0, 8) + '...' : c.code,
          usado: c.used,
          expiraEm: c.expiresAt,
          accountId: c.accountId,
          criadoEm: c.createdAt
        }))
      );

      // Se for token, buscar por código diretamente (sem filtro de WhatsApp, pois token é único)
      const whereClause = isToken 
        ? {
            code,
            expiresAt: { gt: new Date() },
            used: false,
            accountId
          }
        : {
            whatsapp: formattedWhatsApp,
            code,
            expiresAt: { gt: new Date() },
            used: false,
            accountId
          };

      const otpRecord = await prisma.otpCode.findFirst({
        where: whereClause
      });
    
      if (!otpRecord) {
        // Buscar o registro sem as restrições para identificar o problema
        const anyOtpRecord = await prisma.otpCode.findFirst({
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
      await prisma.otpCode.update({
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
      const whatsappConnection = await prisma.whatsAppConnection.findFirst({
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
  },

  // Enviar mensagem customizada via WhatsApp
  async sendCustomMessageWhatsApp(whatsapp: string, message: string, accountId: number): Promise<boolean> {
    const formattedWhatsApp = this.formatWhatsApp(whatsapp);
    console.log(`[OtpService] Iniciando envio de mensagem customizada via WhatsApp - WhatsApp: ${formattedWhatsApp}, AccountId: ${accountId}`);
    
    try {
      // Buscar conexão WhatsApp ativa da account
      const whatsappConnection = await prisma.whatsAppConnection.findFirst({
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
      console.log('[OtpService] Resposta do envio de mensagem:', data);
      
      return data.success === true;
    } catch (error) {
      console.error('[OtpService] Erro ao enviar mensagem customizada via WhatsApp:', error);
      return false;
    }
  }
}; 