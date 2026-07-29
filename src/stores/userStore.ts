import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMemberStore } from './memberStore'
import api, { getJwtPayload, setTokenGetter, setRefreshTokenGetter, setOnTokensRefreshed } from '../services/api'
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
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'));
  const loading = ref(false);

  // Getters
  const isLoggedIn = computed(() => !!user.value);
  /** Dono da plataforma SaaS — painel Super Admin (todas as igrejas). */
  const isPlatformOwner = computed(() => user.value?.isSuperAdmin === true);
  /** Admin da igreja — painel /admin/* só da própria conta. */
  const isChurchAdmin = computed(() => user.value?.cargo === 'PASTOR');
  /** Painel da igreja: pastor ou dono da plataforma. */
  const isAdmin = computed(
    () => isChurchAdmin.value || isPlatformOwner.value,
  );
  const isSupervisor = computed(() => user.value?.cargo === 'SUPERVISOR');
  const isLeader = computed(() => user.value?.cargo === 'LIDER' || user.value?.cargo === 'LIDER_EM_TREINAMENTO');
  const userRole = computed(() => user.value?.cargo || '')
  const userName = computed(() => user.value?.nome);
  const userId = computed(() => user.value?.id);
  const accountId = computed(() => user.value?.accountId);
  const celulaId = computed(() => user.value?.celulaId);
  /** @deprecated Use isPlatformOwner */
  const isSuperAdmin = isPlatformOwner;
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
    return isAdmin.value && hasCell.value;
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

  /** Alinha isSuperAdmin com o JWT (sessão antiga no localStorage pode estar desatualizada). */
  function mergeUserWithToken(userData: UserProfile, authToken: string | null): UserProfile {
    const payload = getJwtPayload(authToken);
    if (payload && typeof payload.isSuperAdmin === 'boolean') {
      return { ...userData, isSuperAdmin: payload.isSuperAdmin };
    }
    return userData;
  }

  // Ações
  function setUser(userData: UserProfile | null, authToken?: string | null) {
    const normalized =
      userData && authToken !== undefined
        ? mergeUserWithToken(userData, authToken ?? token.value)
        : userData;
    user.value = normalized;
    if (normalized) {
      localStorage.setItem('usuario', JSON.stringify(normalized));
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

  function setRefreshToken(newRefreshToken: string | null) {
    refreshToken.value = newRefreshToken;
    if (newRefreshToken) {
      localStorage.setItem('refreshToken', newRefreshToken);
    } else {
      localStorage.removeItem('refreshToken');
    }
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
      const accessToken = response.data?.accessToken ?? response.token;
      const newRefresh = response.data?.refreshToken ?? response.refreshToken ?? null;
      const usuario = response.data?.user ?? response.usuario;
      console.log('[UserStore] Usuário logado:', usuario);
      setToken(accessToken);
      if (newRefresh) setRefreshToken(newRefresh);
      setUser(usuario, accessToken);
      
      // Inicializar stores após login
      console.log('[UserStore] Inicializando stores dependentes...');
      const memberStore = useMemberStore();
      await memberStore.carregarMembros();
      
      // Se for admin/pastor, buscar células do usuário
      if (usuario.cargo === 'PASTOR' || usuario.isSuperAdmin) {
        await checkUserCell();
      }
      
      console.log('[UserStore] Login concluído com sucesso');
      console.log('[UserStore] Cargo do usuário:', usuario.cargo);
      console.log('[UserStore] É líder?:', usuario.cargo?.toUpperCase() === 'LIDER');
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

    setToken(ssoResult.token);
    setUser(userProfile, ssoResult.token);

    // Inicializar stores que dependem do usuário logado
    const memberStore = useMemberStore();
    await memberStore.carregarMembros();

    // Se for admin/pastor, buscar células do usuário
    if (userProfile.cargo === 'PASTOR' || userProfile.isSuperAdmin) {
      await checkUserCell();
    }

    console.log('Login com SSO concluído com sucesso.');
  }

  async function logout() {
    const currentRefresh = refreshToken.value;
    if (currentRefresh) {
      try {
        await api.logout(currentRefresh);
      } catch {
        // ignore network errors on logout
      }
    }
    setUser(null);
    setToken(null);
    setRefreshToken(null);
  }

  async function loadUserFromStorage() {
    const storedUser = localStorage.getItem('usuario');
    const storedToken = localStorage.getItem('token');
    const storedRefresh = localStorage.getItem('refreshToken');
    
    if (storedUser && storedToken) {
      if (api.isTokenExpired(storedToken)) {
        if (storedRefresh) {
          try {
            const refreshed = await api.refresh(storedRefresh);
            const accessToken = refreshed.data?.accessToken ?? refreshed.accessToken ?? refreshed.token;
            const newRefresh = refreshed.data?.refreshToken ?? refreshed.refreshToken ?? storedRefresh;
            if (accessToken) {
              setToken(accessToken);
              setRefreshToken(newRefresh);
              setUser(JSON.parse(storedUser) as UserProfile, accessToken);
              return;
            }
          } catch {
            // fall through
          }
        }
        console.log('[UserStore] Token expirado no localStorage, limpando sessão');
        setUser(null);
        setToken(null);
        setRefreshToken(null);
        return;
      }
      
      const userData = JSON.parse(storedUser) as UserProfile;
      setToken(storedToken);
      if (storedRefresh) setRefreshToken(storedRefresh);
      setUser(userData, storedToken);
      
      // Se for admin/pastor, buscar células do usuário
      if (userData.cargo === 'PASTOR' || userData.isSuperAdmin) {
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
      setRefreshToken(null);
    });
  }
  
  setTokenGetter(() => token.value);
  setRefreshTokenGetter(() => refreshToken.value);
  setOnTokensRefreshed((accessToken, newRefreshToken) => {
    setToken(accessToken);
    setRefreshToken(newRefreshToken);
  });

  return {
    user,
    token,
    loading,
    isLoggedIn,
    isAdmin,
    isChurchAdmin,
    isPlatformOwner,
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