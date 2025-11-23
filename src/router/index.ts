import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import { ssoLinkService } from '../services/ssoLinkService'
import celulaService from '../services/celulaService'
import api from '../services/api'
import LandingPage from '../views/LandingPage.vue'
import GileadeLandingPage from '../views/GileadeLandingPage.vue'
import LoginPage from '../views/LoginPage.vue'
import ResetPasswordPage from '../views/ResetPasswordPage.vue'
import FirstAccessPage from '../views/FirstAccessPage.vue'
import Dashboard from '../views/Dashboard.vue'
import MemberList from '../views/MemberList.vue'
import AttendanceForm from '../views/AttendanceForm.vue'
import Reports from '../views/Reports.vue'
import Profile from '../views/Profile.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import AdminDashboardPage from '../views/admin/AdminDashboardPage.vue'
import AdminUsersPage from '../views/admin/AdminUsersPage.vue'
import AdminCellsPage from '../views/admin/AdminCellsPage.vue'
import SupervisorDashboard from '../views/SupervisorDashboard.vue'
import WhatsAppConnections from '../components/WhatsAppConnections.vue'
import ConfiguracoesView from '../views/ConfiguracoesView.vue'
import OnboardingWizard from '../views/OnboardingWizard.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: LandingPage
    },
    {
      path: '/gileade',
      name: 'gileade',
      component: GileadeLandingPage,
      meta: { requiresGuest: true }
    },
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { requiresGuest: true }
    },
    {
      path: '/reset-password/:token',
      name: 'reset-password',
      component: ResetPasswordPage,
      meta: { requiresGuest: true }
    },
    {
      path: '/first-access/:token',
      name: 'first-access',
      component: FirstAccessPage,
      meta: { requiresGuest: true }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: Dashboard,
      meta: { requiresAuth: true, requiresLeader: true, requiresOnboarding: true }
    },
    {
      path: '/onboarding',
      name: 'onboarding',
      component: OnboardingWizard,
      meta: { requiresAuth: true, requiresLeader: true }
    },
    {
      path: '/admin',
      name: 'admin-dashboard',
      component: AdminDashboardPage,
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin/dashboard',
      name: 'admin-dashboard-page',
      component: AdminDashboardPage,
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin/usuarios',
      name: 'admin-users',
      component: AdminUsersPage,
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin/celulas',
      name: 'admin-cells',
      component: AdminCellsPage,
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/supervisor',
      name: 'supervisor-dashboard',
      component: SupervisorDashboard,
      meta: { requiresAuth: true, requiresSupervisor: true }
    },
    {
      path: '/minha-celula',
      name: 'minha-celula',
      component: MemberList,
      meta: { requiresAuth: true, requiresLeader: true, requiresOnboarding: true }
    },
    {
      path: '/attendance',
      name: 'attendance',
      component: AttendanceForm,
      meta: { requiresAuth: true, requiresLeader: true, requiresOnboarding: true }
    },
    {
      path: '/reports',
      name: 'reports',
      component: Reports,
      meta: { requiresAuth: true, requiresLeader: true, requiresOnboarding: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: Profile,
      meta: { requiresAuth: true }
    },
    {
      path: '/configuracoes',
      name: 'configuracoes',
      component: ConfiguracoesView,
      meta: { requiresAuth: true }
    },
    {
      path: '/sso/:token',
      name: 'sso-link',
      component: AttendanceForm,
      meta: { requiresSSO: true }
    }
  ]
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
        // Token inválido ou expirado
        alert('Link expirado ou inválido. Por favor, solicite um novo link ao administrador.')
        return next({ name: 'login' })
      }
    } catch (error) {
      console.error('Erro ao validar token SSO:', error)
      alert('Erro ao validar o link. Por favor, tente novamente ou solicite um novo link.')
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
  
  // Verifica se a rota requer privilégios de admin
  if (to.meta.requiresAdmin && !userStore.isAdmin) {
    return next({ name: 'dashboard' })
  }
  
  // Verifica se a rota requer privilégios de supervisor
  if (to.meta.requiresSupervisor && !userStore.isSupervisor) {
    return next({ name: 'dashboard' })
  }

  // Verifica se a rota requer privilégios de líder
  if (to.meta.requiresLeader && userStore.isAdmin) {
    return next({ name: 'admin-dashboard' })
  }
  
  // Verificar onboarding para líderes
  if (to.meta.requiresOnboarding && userStore.isLeader && to.name !== 'onboarding') {
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
    if (userStore.isAdmin) {
      return next({ name: 'admin-dashboard' })
    }
    return next({ name: 'dashboard' })
  }
  
  next()
})

export default router


