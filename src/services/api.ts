import { ref } from 'vue';

// Configurações da API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Interface para erros da API
interface ApiError {
  message: string;
  errors?: any[];
}

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

    // Incluir token de autenticação se disponível e requerido
    if (includeToken && token.value) {
      headers['Authorization'] = `Bearer ${token.value}`;
    }

    const options: RequestInit = {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    };
    
    // Log para envio de relatórios
    if (endpoint.includes('/relatorios/') && endpoint.includes('/enviar')) {
      console.log(`[DEBUG] fetchApi - URL completa: ${API_URL}${endpoint}`);
      console.log(`[DEBUG] fetchApi - Headers:`, headers);
      console.log(`[DEBUG] fetchApi - Options:`, options);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    // Log para envio de relatórios
    if (endpoint.includes('/relatorios/') && endpoint.includes('/enviar')) {
      console.log(`[DEBUG] fetchApi - Status da resposta:`, response.status);
      console.log(`[DEBUG] fetchApi - Headers da resposta:`, Object.fromEntries([...response.headers]));
    }
    
    const result = await response.json();

    // Se a resposta não for bem-sucedida, tratar como erro
    if (!response.ok) {
      // Log para envio de relatórios
      if (endpoint.includes('/relatorios/') && endpoint.includes('/enviar')) {
        console.error(`[DEBUG] fetchApi - Erro na resposta de envio de relatório:`, result);
      }
      
      throw {
        message: result.message || 'Erro ao processar requisição',
        errors: result.errors,
        status: response.status,
      };
    }

    return result;
  } catch (error) {
    console.error('Erro na API:', error);
    throw error;
  }
};

// Métodos simplificados para diferentes tipos de requisições
const api = {
  // Autenticação
  async login(email: string, senha: string) {
    const data = await fetchApi('/auth/login', 'POST', { email, senha }, false);
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

  // Estado da autenticação
  getToken: () => token.value,
  getUsuario: () => usuarioLogado.value,
  estaLogado: () => !!token.value,
};

export default api; 