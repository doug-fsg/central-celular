import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import LandingPage from '../views/LandingPage.vue'
import LoginPage from '../views/LoginPage.vue'
import Dashboard from '../views/Dashboard.vue'
import MemberList from '../views/MemberList.vue'
import AttendanceForm from '../views/AttendanceForm.vue'
import Reports from '../views/Reports.vue'
import DetailedReports from '../views/DetailedReports.vue'
import Profile from '../views/Profile.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import SupervisorDashboard from '../views/SupervisorDashboard.vue'

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
      meta: { requiresAuth: true }
    },
    {
      path: '/admin',
      name: 'admin-dashboard',
      component: AdminDashboard,
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/supervisor',
      name: 'supervisor-dashboard',
      component: SupervisorDashboard,
      meta: { requiresAuth: true, requiresSupervisor: true }
    },
    {
      path: '/members',
      name: 'members',
      component: MemberList,
      meta: { requiresAuth: true }
    },
    {
      path: '/attendance',
      name: 'attendance',
      component: AttendanceForm,
      meta: { requiresAuth: true }
    },
    {
      path: '/reports',
      name: 'reports',
      component: Reports,
      meta: { requiresAuth: true }
    },
    {
      path: '/detailed-reports',
      name: 'detailed-reports',
      component: DetailedReports,
      meta: { requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: Profile,
      meta: { requiresAuth: true }
    }
  ]
})

// Navegação Guards
router.beforeEach((to, from, next) => {
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
  
  // Verifica se a rota é só para visitantes (login, registro)
  if (to.meta.requiresGuest && userStore.isLoggedIn) {
    return next({ name: 'dashboard' })
  }
  
  next()
})

export default router