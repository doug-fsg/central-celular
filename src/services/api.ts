// Configurações da API
// Preferir mesma origem no browser para evitar Mixed Content e CORS
const inferSameOriginApi = () => {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:3000/api';
};

// Em produção (VPS), build com VITE_API_URL=localhost quebra no browser do usuário.
// Se o site não está em localhost, usa a mesma origem + /api (nginx faz proxy).
function resolveApiBase(): string {
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined;
  if (typeof window !== 'undefined' && fromEnv && /localhost|127\.0\.0\.1/i.test(fromEnv)) {
    const h = window.location.hostname;
    if (h !== 'localhost' && h !== '127.0.0.1') {
      return inferSameOriginApi();
    }
  }
  return fromEnv || inferSameOriginApi();
}

const RAW_API_URL = resolveApiBase();
const API_URL = RAW_API_URL.endsWith('/api')
  ? RAW_API_URL
  : `${RAW_API_URL.replace(/\/$/, '')}/api`;

// Função para obter o token atual (será injetada pelo userStore)
let getTokenFn: (() => string | null) | null = null;

// Função para definir o getter do token (chamada pelo userStore na inicialização)
export const setTokenGetter = (fn: () => string | null) => {
  getTokenFn = fn;
};

/** Lê o payload do JWT (sem validar assinatura). */
export function getJwtPayload(tokenString: string | null): Record<string, unknown> | null {
  if (!tokenString) return null;
  try {
    const parts = tokenString.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1])) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// Função para validar se o token JWT está expirado
const isTokenExpired = (tokenString: string | null): boolean => {
  if (!tokenString) return true;
  
  try {
    // Decodificar o token JWT (sem verificar assinatura, apenas para ler o payload)
    const parts = tokenString.split('.');
    if (parts.length !== 3) return true;
    
    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp;
    
    if (!exp) return true;
    
    // Verificar se expirou (com margem de 1 minuto para evitar problemas de sincronização)
    const now = Math.floor(Date.now() / 1000);
    return exp < (now + 60);
  } catch (error) {
    console.error('[API] Erro ao validar token:', error);
    return true;
  }
};

// Função para fazer requisições à API
const fetchApi = async (
  endpoint: string,
  method: string = 'GET',
  data?: any,
  includeToken: boolean = true,
  reqExtras?: Pick<RequestInit, 'signal'>,
): Promise<any> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Obter token do userStore via getter
    const currentToken = includeToken && getTokenFn ? getTokenFn() : null;
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    const options: RequestInit = {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    };
    if (reqExtras?.signal) {
      options.signal = reqExtras.signal;
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    // Verificar se a resposta é JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      let errorMessage = 'Erro ao processar requisição';
      let errorData: any = {};

      try {
        if (isJson) {
          errorData = await response.json();
        } else {
          errorMessage = await response.text();
        }
      } catch (e) {
        errorMessage = 'Erro ao processar resposta do servidor';
      }

      // Interceptor para erros 401 (Token inválido/expirado)
      if (response.status === 401 && includeToken) {
        const hadToken = !!(getTokenFn && getTokenFn());
        if (!hadToken) {
          // Requisição autenticada sem token (race no bootstrap) — não derrubar sessão
          console.warn('[API] 401 sem token no cliente:', endpoint);
        } else {
          console.log('[API] Token inválido ou expirado, notificando userStore');

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:token-invalid'));
          }

          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
      }

      throw {
        message: errorData.message || errorMessage,
        errors: errorData.errors,
        status: response.status,
      };
    }

    // Se a resposta for bem-sucedida, verificar se é JSON
    try {
      if (isJson) {
        return await response.json();
      }
      return await response.text();
    } catch (e) {
      throw {
        message: 'Erro ao processar resposta do servidor',
        status: response.status,
      };
    }
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    // Se o erro já estiver formatado, apenas repassa
    if (error.status) {
      throw error;
    }
    
    // Se for um erro de rede ou outro tipo
    throw {
      message: error.message || 'Erro ao conectar com o servidor',
      status: 500,
    };
  }
};

// Métodos simplificados para diferentes tipos de requisições
const api = {
  // Autenticação
  async login(whatsapp: string, senha: string) {
    console.log('[API] Iniciando login com WhatsApp:', { whatsapp });
    
    const digits = whatsapp.replace(/\D/g, '')
    
    // Lógica para normalizar número brasileiro:
    // - Se tem 13 dígitos e começa com 55: já está completo (55 + DDD + número)
    // - Se tem 12 dígitos e começa com 55: já está completo (55 + DDD + número sem 9)
    // - Se tem 11 dígitos: é DDD + número, adicionar 55
    // - Se tem 10 dígitos: é DDD + número sem 9, adicionar 55
    let normalized;
    if ((digits.length === 13 || digits.length === 12) && digits.startsWith('55')) {
      normalized = digits; // Já tem DDI 55
    } else if (digits.length === 11 || digits.length === 10) {
      normalized = `55${digits}`; // Adicionar DDI 55
    } else {
      normalized = digits; // Manter como está para outros casos
    }
    
    console.log('[API] Normalizando WhatsApp:', { original: whatsapp, digits, normalized });
    const data = await fetchApi('/auth/login', 'POST', { whatsapp: normalized, senha }, false);
    
    console.log('[API] Login bem-sucedido, retornando dados');
    // Não salva sessão aqui - userStore vai fazer isso
    return data;
  },

  async requestOtp(whatsapp: string) {
    console.log('[API] Solicitando OTP para:', whatsapp);
    const digits = whatsapp.replace(/\D/g, '');
    const normalized = `+55${digits}`;
    console.log('[API] Normalizando para OTP:', { original: whatsapp, digits, normalized });
    return fetchApi('/auth/request-otp', 'POST', { whatsapp: normalized }, false);
  },

  async verifyOtp(whatsapp: string, code: string) {
    console.log('[API] Verificando OTP para:', whatsapp, 'código:', code);
    const digits = whatsapp.replace(/\D/g, '');
    const normalized = `+55${digits}`;
    console.log('[API] Normalizando para verificação OTP:', { original: whatsapp, digits, normalized });
    return fetchApi('/auth/verify-otp', 'POST', { whatsapp: normalized, code }, false);
  },

  async verifyInviteToken(token: string) {
    console.log('[API] Verificando token de convite:', token.substring(0, 8) + '...');
    return fetchApi(`/auth/verify-invite/${token}`, 'GET', undefined, false);
  },

  async createPassword(whatsapp: string, nome: string, senha: string, dataNascimento?: string) {
    console.log('[API] Criando senha para:', whatsapp, 'nome:', nome);
    // Normalização conservadora: remover caracteres não numéricos e garantir prefixo 55
    const digits = whatsapp.replace(/\D/g, '');
    const normalized = digits.startsWith('55') && (digits.length === 12 || digits.length === 13)
      ? digits
      : digits.length <= 11
        ? `55${digits}`
        : digits;
    console.log('[API] Normalizando para criação de senha:', { original: whatsapp, digits, normalized });
    const payload: { whatsapp: string; nome: string; senha: string; dataNascimento?: string } = { 
      whatsapp: normalized, 
      nome, 
      senha 
    };
    if (dataNascimento) {
      payload.dataNascimento = dataNascimento;
    }
    const data = await fetchApi('/auth/create-password', 'POST', payload, false);
    // Não salva sessão aqui - userStore vai fazer isso
    return data;
  },

  async verificarToken() {
    try {
      const data = await fetchApi('/auth/verificar');
      return { valido: true, usuario: data.usuario };
    } catch (error) {
      return { valido: false };
    }
  },

  async alterarSenha(userId: number, senhaAtual: string, novaSenha: string) {
    return fetchApi(`/usuarios/${userId}/senha`, 'POST', { senhaAtual, novaSenha });
  },

  // Reset de senha
  async requestPasswordReset(whatsapp: string, dataNascimento: string) {
    console.log('[API] Solicitando reset de senha para:', whatsapp);
    const digits = whatsapp.replace(/\D/g, '');
    const normalized = `+55${digits}`;
    console.log('[API] Normalizando para reset:', { original: whatsapp, digits, normalized });
    return fetchApi('/auth/request-password-reset', 'POST', { whatsapp: normalized, dataNascimento }, false);
  },

  async verifyResetToken(token: string) {
    console.log('[API] Verificando token de reset:', token);
    return fetchApi(`/auth/verify-reset-token/${token}`, 'GET', undefined, false);
  },

  async resetPassword(token: string, novaSenha: string) {
    console.log('[API] Redefinindo senha com token:', token);
    return fetchApi('/auth/reset-password', 'POST', { token, novaSenha }, false);
  },

  // CRUD Genérico
  async get(endpoint: string, reqExtras?: Pick<RequestInit, 'signal'>) {
    return fetchApi(endpoint, 'GET', undefined, true, reqExtras);
  },

  async post(endpoint: string, data: any) {
    return fetchApi(endpoint, 'POST', data);
  },

  async put(endpoint: string, data: any) {
    return fetchApi(endpoint, 'PUT', data);
  },

  async patch(endpoint: string, data: any) {
    return fetchApi(endpoint, 'PATCH', data);
  },

  async delete(endpoint: string) {
    return fetchApi(endpoint, 'DELETE');
  },

  async download(endpoint: string, filename = 'download.csv') {
    const headers: Record<string, string> = {};
    const currentToken = getTokenFn ? getTokenFn() : null;
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, { method: 'GET', headers });
    if (!response.ok) {
      throw new Error('Erro ao baixar arquivo');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },

  // Validação de token (função utilitária)
  isTokenExpired: (tokenString: string | null) => isTokenExpired(tokenString),
};

export default api; 