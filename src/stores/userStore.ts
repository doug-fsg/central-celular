import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMemberStore } from './memberStore'
import api from '../services/api';

export interface UserProfile {
  id: number;
  nome: string;
  email?: string;
  whatsapp?: string;
  cargo: string;
  ativo: boolean;
  accountId: number;
  celulaId: number | null;
  isSuperAdmin?: boolean;
}

export interface SsoUser {
  id: number
  nome: string
  cargo: string
  accountId: number
  celulaId: number | null
}

export const useUserStore = defineStore('user', () => {
  // Estado
  const user = ref<UserProfile | null>(null);
  const token = ref<string | null>(localStorage.getItem('token'));
  const loading = ref(false);

  // Getters
  const isLoggedIn = computed(() => !!user.value);
  const isAdmin = computed(() => user.value?.cargo === 'ADMINISTRADOR' || user.value?.cargo === 'PASTOR' || user.value?.isSuperAdmin === true);
  const isSupervisor = computed(() => user.value?.cargo === 'SUPERVISOR');
  const isLeader = computed(() => user.value?.cargo === 'LIDER' || user.value?.cargo === 'LIDER_EM_TREINAMENTO');
  const userRole = computed(() => user.value?.cargo || '')
  const userName = computed(() => user.value?.nome);
  const userId = computed(() => user.value?.id);
  const accountId = computed(() => user.value?.accountId);
  const celulaId = computed(() => user.value?.celulaId);
  const isSuperAdmin = computed(() => user.value?.isSuperAdmin);

  // Ações
  function setUser(userData: UserProfile | null) {
    user.value = userData;
    if (userData) {
      localStorage.setItem('usuario', JSON.stringify(userData));
    } else {
      localStorage.removeItem('usuario');
    }
  }

  function updateProfile(updates: Partial<UserProfile>) {
    if (!user.value) return;

    const updated: UserProfile = {
      ...user.value,
      ...updates,
    } as UserProfile;

    setUser(updated);
  }

  function setToken(newToken: string | null) {
    token.value = newToken;
    api.setAuthToken(newToken); // Atualiza o token no módulo da API
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
  }

  async function login(loginData: any) {
    try {
      console.log('[UserStore] Iniciando processo de login:', { whatsapp: loginData.whatsapp });
      loading.value = true;
      const response = await api.login(loginData.whatsapp, loginData.senha);
      console.log('[UserStore] Resposta da API recebida, configurando usuário e token');
      setUser(response.usuario);
      setToken(response.token);
      
      // Inicializar stores após login
      console.log('[UserStore] Inicializando stores dependentes...');
      const memberStore = useMemberStore();
      await memberStore.carregarMembros();
      
      console.log('[UserStore] Login concluído com sucesso');
      return true;
    } catch (error) {
      console.error('[UserStore] Erro no login:', error);
      return false;
    } finally {
      loading.value = false;
    }
  }

  // Login via SSO
  async function loginWithSSO(ssoResult: { usuario: any, token: string }) {
    console.log('Efetuando login com SSO:', ssoResult);
    
    // Define o usuário e o token na store
    const userProfile: UserProfile = {
      ...ssoResult.usuario,
      ativo: true // Usuários de SSO são considerados ativos
    };

    setUser(userProfile);
    setToken(ssoResult.token);

    // Inicializar stores que dependem do usuário logado
    const memberStore = useMemberStore();
    await memberStore.carregarMembros();

    console.log('Login com SSO concluído com sucesso.');
  }

  async function logout() {
    setUser(null);
    setToken(null);
  }

  function loadUserFromStorage() {
    const storedUser = localStorage.getItem('usuario');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
  }
  
  // Inicialização
  loadUserFromStorage();

  return {
    user,
    token,
    loading,
    isLoggedIn,
    isAdmin,
    isSupervisor,
    isLeader,
    userName,
    userId,
    accountId,
    celulaId,
    isSuperAdmin,
    login,
    loginWithSSO,
    logout,
    loadUserFromStorage,
    updateProfile
  };
}); 