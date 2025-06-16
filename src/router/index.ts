import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import LandingPage from '../views/LandingPage.vue'
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
    }
  ]
})

// Navegação Guards
router.beforeEach((to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
  const userStore = useUserStore()
  
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