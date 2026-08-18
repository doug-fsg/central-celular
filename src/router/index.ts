import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { createRouter } from 'vue-router'
import { createRouterHistory } from './createRouterHistory'
import { useUserStore } from '../stores/userStore'
import { useNavigationLoadingStore } from '../stores/navigationLoadingStore'
import { ssoLinkService } from '../services/ssoLinkService'
import celulaService from '../services/celulaService'
import api from '../services/api'
import { isInstalledPwaDisplayMode } from '../utils/pwa'
import { isMobileShell } from '../utils/platform'

const router = createRouter({
  history: createRouterHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/LandingPage.vue'),
      beforeEnter: (to, from, next) => {
        if (!isMobileShell()) {
          next()
          return
        }
        const userStore = useUserStore()
        if (!userStore.isLoggedIn) {
          next({ name: 'login', replace: true })
          return
        }
        if (userStore.isPlatformOwner) {
          next({ name: 'admin-dashboard', replace: true })
          return
        }
        if (
          userStore.isAdmin &&
          !(userStore.canToggleView && userStore.currentView === 'cell')
        ) {
          next({ name: 'admin-dashboard', replace: true })
          return
        }
        if (userStore.isSupervisor) {
          next({ name: 'supervisor-dashboard', replace: true })
          return
        }
        next({ name: 'dashboard', replace: true })
      },
    },
    {
      path: '/gileade',
      name: 'gileade',
      component: () => import('../views/GileadeLandingPage.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginPage.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/reset-password/:token',
      name: 'reset-password',
      component: () => import('../views/ResetPasswordPage.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/first-access/:token',
      name: 'first-access',
      component: () => import('../views/FirstAccessPage.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/Dashboard.vue'),
      meta: { requiresAuth: true, requiresLeader: true, requiresOnboarding: true },
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: () => import('../views/OnboardingWizard.vue'),
      meta: { requiresAuth: true, requiresLeader: true },
    },
    {
      path: '/super-admin',
      name: 'super-admin',
      component: () => import('../views/super-admin/SuperAdminPage.vue'),
      meta: { requiresAuth: true, requiresPlatformOwner: true },
    },
    {
      path: '/admin',
      name: 'admin-dashboard',
      component: () => import('../views/admin/AdminDashboardPage.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/dashboard',
      name: 'admin-dashboard-page',
      component: () => import('../views/admin/AdminDashboardPage.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/usuarios',
      name: 'admin-users',
      component: () => import('../views/admin/AdminUsersPage.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/notificacoes',
      name: 'admin-push',
      component: () => import('../views/admin/AdminPushPage.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/celulas',
      name: 'admin-cells',
      component: () => import('../views/admin/AdminCellsPage.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/membros',
      name: 'admin-members',
      component: () => import('../views/admin/AdminMembersPage.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/rede-cuidado',
      name: 'admin-rede-cuidado',
      component: () => import('../views/admin/AdminRedeCuidadoPage.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/supervisor',
      name: 'supervisor-dashboard',
      component: () => import('../views/SupervisorDashboard.vue'),
      meta: { requiresAuth: true, requiresSupervisor: true },
    },
    {
      path: '/minha-celula',
      name: 'minha-celula',
      component: () => import('../views/MemberList.vue'),
      meta: { requiresAuth: true, requiresLeader: true, requiresOnboarding: true },
    },
    {
      path: '/attendance',
      name: 'attendance',
      component: () => import('../views/AttendanceForm.vue'),
      meta: { requiresAuth: true, requiresLeader: true, requiresOnboarding: true },
    },
    {
      path: '/reports',
      redirect: { name: 'dashboard' },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/Profile.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/configuracoes',
      name: 'configuracoes',
      component: () => import('../views/ConfiguracoesView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/rede-cuidado',
      name: 'rede-cuidado',
      component: () => import('../views/RedeCuidadoView.vue'),
      meta: { requiresAuth: true, requiresLeader: true, requiresOnboarding: true },
    },
    {
      path: '/sso/:token',
      name: 'sso-link',
      component: () => import('../views/AttendanceForm.vue'),
      meta: { requiresSSO: true },
    },
  ],
})

/** Primeira pintura na LP: sem overlay; demais navegações exibem loading global. */
router.beforeEach((to, from) => {
  const skipInitialHome = from.matched.length === 0 && to.name === 'home'
  if (!skipInitialHome) {
    useNavigationLoadingStore().start()
  }
})

router.afterEach(() => {
  void useNavigationLoadingStore().finish()
})

router.onError(() => {
  void useNavigationLoadingStore().finish()
})

// Navegação Guards
router.beforeEach(async (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
  const userStore = useUserStore()
  
  // Verificar se é uma rota SSO
  if (to.meta.requiresSSO) {
    const token = to.params.token as string
    
    try {
      // Validar o token SSO
      const result = await ssoLinkService.validarLink(token)
      
      if (result.valid && result.usuario && result.token) {
        // Autenticar o usuário com base nas informações do token
        await userStore.loginWithSSO({ usuario: result.usuario, token: result.token });
        
        // Redirecionar para o formulário de presença
        return next();
      } else {
        const msg =
          result.message?.trim() ||
          'Não foi possível abrir o link. Peça um novo link ao administrador.'
        alert(msg)
        return next({ name: 'login' })
      }
    } catch (error) {
      console.error('Erro ao validar token SSO:', error)
      alert('Erro ao validar o link. Tente de novo ou peça um novo link ao administrador.')
      return next({ name: 'login' })
    }
  }
  
  // Verifica se a rota requer autenticação
  if (to.meta.requiresAuth) {
    // Verificar se o token está expirado
    if (userStore.token && api.isTokenExpired(userStore.token)) {
      console.log('[Router] Token expirado, limpando sessão e redirecionando para login');
      userStore.logout();
      return next({ name: 'login' });
    }
    
    if (!userStore.isLoggedIn) {
      return next({ name: 'login' });
    }
  }
  
  if (to.meta.requiresPlatformOwner && !userStore.isPlatformOwner) {
    return next(userStore.isAdmin ? { name: 'admin-dashboard' } : { name: 'dashboard' })
  }

  // Verifica se a rota requer privilégios de admin da igreja
  if (to.meta.requiresAdmin && !userStore.isAdmin) {
    return next({ name: 'dashboard' })
  }
  
  // Verifica se a rota requer privilégios de supervisor
  if (to.meta.requiresSupervisor && !userStore.isSupervisor) {
    return next({ name: 'dashboard' })
  }

  // Verifica se a rota requer privilégios de líder
  if (to.meta.requiresLeader && userStore.isAdmin && !(userStore.canToggleView && userStore.currentView === 'cell')) {
    return next({ name: 'admin-dashboard' })
  }
  
  // Verificar onboarding para líderes (incluindo admins/pastores na visão célula)
  if (to.meta.requiresOnboarding && (userStore.isLeader || (userStore.canToggleView && userStore.currentView === 'cell')) && to.name !== 'onboarding') {
    try {
      const liderId = userStore.user?.id
      if (!liderId) {
        return next({ name: 'onboarding' })
      }

      // Buscar células ativas do líder
      const respostaAtivas = await celulaService.listarCelulas({ lider: liderId, ativo: true })
      let celula = respostaAtivas?.celulas?.[0]

      // Se não há células ativas, buscar quaisquer células
      if (!celula) {
        const respostaTodas = await celulaService.listarCelulas({ lider: liderId })
        celula = respostaTodas?.celulas?.[0]
      }

      if (!celula) {
        console.log('[Router] Líder sem célula, redirecionando para onboarding')
        return next({ name: 'onboarding' })
      }

      // Verificar membros
      const celulaDetalhada = await celulaService.obterCelula(celula.id)
      const temMembros = Array.isArray(celulaDetalhada?.membros) && celulaDetalhada.membros.length > 0

      if (!temMembros) {
        console.log('[Router] Líder sem membros, redirecionando para onboarding')
        return next({ name: 'onboarding' })
      }
    } catch (error) {
      console.error('[Router] Erro ao verificar onboarding:', error)
      return next({ name: 'onboarding' })
    }
  }
  
  // Verifica se a rota é só para visitantes (login, registro)
  if (to.meta.requiresGuest && userStore.isLoggedIn) {
    if (userStore.isPlatformOwner) {
      return next({ name: 'admin-dashboard' })
    }
    if (userStore.isAdmin && !(userStore.canToggleView && userStore.currentView === 'cell')) {
      return next({ name: 'admin-dashboard' })
    }
    return next({ name: 'dashboard' })
  }
  
  next()
})

export default router


