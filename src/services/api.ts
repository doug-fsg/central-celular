import { ref } from 'vue';

// Configurações da API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Interface para erros da API (não removida para compatibilidade futura)
// interface ApiError {
//   message: string;
//   errors?: any[];
//   status?: number;
// }

// Estado global para token e usuário logado
const token = ref<string | null>(localStorage.getItem('token'));
const usuarioLogado = ref<any | null>(null);

// Função para carregar usuário do localStorage
const carregarUsuario = () => {
  const usuarioJson = localStorage.getItem('usuario');
  if (usuarioJson) {
    usuarioLogado.value = JSON.parse(usuarioJson);
  }
};

// Carregar usuário inicialmente
carregarUsuario();

// Funções para gerenciar sessão
const salvarSessao = (data: { token: string; usuario: any }) => {
  token.value = data.token;
  usuarioLogado.value = data.usuario;
  localStorage.setItem('token', data.token);
  localStorage.setItem('usuario', JSON.stringify(data.usuario));
};

const limparSessao = () => {
  token.value = null;
  usuarioLogado.value = null;
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
};

// Função para fazer requisições à API
const fetchApi = async (
  endpoint: string,
  method: string = 'GET',
  data?: any,
  includeToken: boolean = true
): Promise<any> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (includeToken && token.value) {
      headers['Authorization'] = `Bearer ${token.value}`;
    }

    const options: RequestInit = {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    };

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
    
    console.log('[API] Login bem-sucedido, salvando sessão');
    salvarSessao(data);
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

  async createPassword(whatsapp: string, nome: string, senha: string) {
    console.log('[API] Criando senha para:', whatsapp, 'nome:', nome);
    const digits = whatsapp.replace(/\D/g, '');
    const normalized = `+55${digits}`;
    console.log('[API] Normalizando para criação de senha:', { original: whatsapp, digits, normalized });
    const data = await fetchApi('/auth/create-password', 'POST', { whatsapp: normalized, nome, senha }, false);
    salvarSessao(data);
    return data;
  },

  async logout() {
    limparSessao();
  },

  async verificarToken() {
    try {
      const data = await fetchApi('/auth/verificar');
      return { valido: true, usuario: data.usuario };
    } catch (error) {
      limparSessao();
      return { valido: false };
    }
  },

  async alterarSenha(userId: number, senhaAtual: string, novaSenha: string) {
    return fetchApi(`/usuarios/${userId}/senha`, 'POST', { senhaAtual, novaSenha });
  },

  // CRUD Genérico
  async get(endpoint: string) {
    return fetchApi(endpoint);
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

  // Método para atualizar o token no módulo da API
  setAuthToken(newToken: string | null) {
    token.value = newToken;
  },

  // Estado da autenticação
  getToken: () => token.value,
  getUsuario: () => usuarioLogado.value,
  estaLogado: () => !!token.value,
};

export default api; 