import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import { ssoLinkService } from '../services/ssoLinkService'
import LandingPage from '../views/LandingPage.vue'
import GileadeLandingPage from '../views/GileadeLandingPage.vue'
import LoginPage from '../views/LoginPage.vue'
import Dashboard from '../views/Dashboard.vue'
import MemberList from '../views/MemberList.vue'
import AttendanceForm from '../views/AttendanceForm.vue'
import Reports from '../views/Reports.vue'
import Profile from '../views/Profile.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import SupervisorDashboard from '../views/SupervisorDashboard.vue'
import WhatsAppConnections from '../components/WhatsAppConnections.vue'
import ConfiguracoesView from '../views/ConfiguracoesView.vue'

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
      path: '/dashboard',
      name: 'dashboard',
      component: Dashboard,
      meta: { requiresAuth: true, requiresLeader: true }
    },
    {
      path: '/admin',
      name: 'admin-dashboard',
      component: AdminDashboard,
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin/whatsapp',
      name: 'whatsapp-connections',
      component: WhatsAppConnections,
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
      meta: { requiresAuth: true, requiresLeader: true }
    },
    {
      path: '/attendance',
      name: 'attendance',
      component: AttendanceForm,
      meta: { requiresAuth: true, requiresLeader: true }
    },
    {
      path: '/reports',
      name: 'reports',
      component: Reports,
      meta: { requiresAuth: true, requiresLeader: true }
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
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    return next({ name: 'login' })
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