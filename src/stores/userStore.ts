import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMemberStore } from './memberStore'
import api, { setTokenGetter } from '../services/api'
import celulaService from '../services/celulaService'

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
  const isUserActive = computed(() => user.value?.ativo !== false);

  // Estado de visão (admin ou cell)
  const currentView = ref<'admin' | 'cell'>(
    (localStorage.getItem('currentView') as 'admin' | 'cell') || 'admin'
  );

  // Computed para verificar se usuário tem célula
  const hasCell = computed(() => {
    return !!user.value?.celulaId || userCells.value.length > 0;
  });

  // Computed para verificar se pode alternar visão
  const canToggleView = computed(() => {
    return (user.value?.cargo === 'ADMINISTRADOR' || user.value?.cargo === 'PASTOR' || user.value?.isSuperAdmin) && hasCell.value;
  });

  // Estado para células do usuário
  const userCells = ref<any[]>([]);

  // Função para buscar células do usuário
  async function checkUserCell() {
    if (!user.value?.id) return;
    
    try {
      const response = await celulaService.listarCelulas({ lider: user.value.id });
      if (response?.celulas && response.celulas.length > 0) {
        userCells.value = response.celulas;
        // Atualizar celulaId no perfil se não estiver definido
        if (!user.value.celulaId && response.celulas[0]) {
          updateProfile({ celulaId: response.celulas[0].id });
        }
      } else {
        userCells.value = [];
      }
    } catch (error) {
      console.error('[UserStore] Erro ao buscar células do usuário:', error);
      userCells.value = [];
    }
  }

  // Função para alternar visão
  function toggleView() {
    if (!canToggleView.value) return;
    currentView.value = currentView.value === 'admin' ? 'cell' : 'admin';
    localStorage.setItem('currentView', currentView.value);
  }

  // Função para definir visão
  function setView(view: 'admin' | 'cell') {
    if (!canToggleView.value) return;
    currentView.value = view;
    localStorage.setItem('currentView', currentView.value);
  }

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
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
  }
  
  // Função para obter o token atual (usada pelo api.ts)
  function getToken(): string | null {
    return token.value;
  }
  
  // Função para obter o usuário atual (usada por outros serviços)
  function getUsuario() {
    return user.value;
  }

  async function login(loginData: any) {
    try {
      console.log('[UserStore] Iniciando processo de login:', { whatsapp: loginData.whatsapp });
      loading.value = true;
      const response = await api.login(loginData.whatsapp, loginData.senha);
      console.log('[UserStore] Resposta da API recebida:', response);
      console.log('[UserStore] Usuário logado:', response.usuario);
      setUser(response.usuario);
      setToken(response.token);
      
      // Inicializar stores após login
      console.log('[UserStore] Inicializando stores dependentes...');
      const memberStore = useMemberStore();
      await memberStore.carregarMembros();
      
      // Se for admin/pastor, buscar células do usuário
      if (response.usuario.cargo === 'ADMINISTRADOR' || response.usuario.cargo === 'PASTOR' || response.usuario.isSuperAdmin) {
        await checkUserCell();
      }
      
      console.log('[UserStore] Login concluído com sucesso');
      console.log('[UserStore] Cargo do usuário:', response.usuario.cargo);
      console.log('[UserStore] É líder?:', response.usuario.cargo?.toUpperCase() === 'LIDER');
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

    // Se for admin/pastor, buscar células do usuário
    if (userProfile.cargo === 'ADMINISTRADOR' || userProfile.cargo === 'PASTOR' || userProfile.isSuperAdmin) {
      await checkUserCell();
    }

    console.log('Login com SSO concluído com sucesso.');
  }

  async function logout() {
    setUser(null);
    setToken(null);
  }

  async function loadUserFromStorage() {
    const storedUser = localStorage.getItem('usuario');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      // Validar se o token não está expirado antes de carregar
      if (api.isTokenExpired(storedToken)) {
        console.log('[UserStore] Token expirado no localStorage, limpando sessão');
        setUser(null);
        setToken(null);
        return;
      }
      
      const userData = JSON.parse(storedUser);
      setUser(userData);
      setToken(storedToken);
      
      // Se for admin/pastor, buscar células do usuário
      if (userData.cargo === 'ADMINISTRADOR' || userData.cargo === 'PASTOR' || userData.isSuperAdmin) {
        await checkUserCell();
      }
    }
  }
  
  // Escutar evento de token inválido do api.ts
  if (typeof window !== 'undefined') {
    window.addEventListener('auth:token-invalid', () => {
      console.log('[UserStore] Recebido evento de token inválido, limpando sessão');
      setUser(null);
      setToken(null);
    });
  }
  
  // Registrar getter do token no api.ts
  setTokenGetter(() => token.value);

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
    isUserActive,
    currentView,
    hasCell,
    canToggleView,
    userCells,
    login,
    loginWithSSO,
    logout,
    loadUserFromStorage,
    updateProfile,
    getToken,
    getUsuario,
    checkUserCell,
    toggleView,
    setView
  };
}); 