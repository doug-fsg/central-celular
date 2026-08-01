import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import { useLeaderStore } from '../stores/leaderStore'
import type { IconName } from '../components/AppIcon.vue'

export type AppNavItem = {
  name: string
  label: string
  icon: IconName
}

export function useAppNavigation() {
  const router = useRouter()
  const userStore = useUserStore()
  const leaderStore = useLeaderStore()

  const navItems = computed<AppNavItem[]>(() => {
    if (userStore.canToggleView && userStore.currentView === 'cell') {
      return [
        { name: 'dashboard', label: 'Início', icon: 'home' },
        { name: 'minha-celula', label: 'Minha Célula', icon: 'users' },
        { name: 'attendance', label: 'Frequência', icon: 'calendar' },
        { name: 'rede-cuidado', label: 'Rede de cuidado', icon: 'heart' },
      ]
    }

    if (userStore.isPlatformOwner || userStore.isChurchAdmin) {
      return [
        { name: 'admin-dashboard', label: 'Dashboard', icon: 'home' },
        { name: 'admin-users', label: 'Usuários', icon: 'users' },
        { name: 'admin-cells', label: 'Células', icon: 'grid' },
        { name: 'admin-members', label: 'Membros', icon: 'users' },
        { name: 'admin-rede-cuidado', label: 'Rede de cuidado', icon: 'heart' },
      ]
    }

    if (userStore.isSupervisor) {
      return [
        { name: 'supervisor-dashboard', label: 'Início', icon: 'home' },
      ]
    }

    return [
      { name: 'dashboard', label: 'Início', icon: 'home' },
      { name: 'minha-celula', label: 'Minha Célula', icon: 'users' },
      { name: 'attendance', label: 'Frequência', icon: 'calendar' },
      { name: 'rede-cuidado', label: 'Rede de cuidado', icon: 'heart' },
    ]
  })

  const homeRouteName = computed(() => {
    if (userStore.isPlatformOwner || userStore.isChurchAdmin) {
      return 'admin-dashboard'
    }
    return 'dashboard'
  })

  const profileItems: AppNavItem[] = [
    { name: 'profile', label: 'Meu Perfil', icon: 'user' },
    { name: 'configuracoes', label: 'Configurações', icon: 'settings' },
  ]

  const badgeIcon = computed(() => {
    switch (leaderStore.leaderBadge) {
      case 'bronze':
        return '🥉'
      case 'silver':
        return '🥈'
      case 'gold':
        return '🥇'
      default:
        return ''
    }
  })

  async function handleLogout() {
    await userStore.logout()
    router.push({ name: 'login' })
  }

  function toggleView() {
    if (!userStore.canToggleView) return
    userStore.toggleView()
    if (userStore.currentView === 'cell') {
      router.push({ name: 'dashboard' })
    } else {
      router.push({ name: 'admin-dashboard' })
    }
  }

  function navigateTo(routeName: string) {
    router.push({ name: routeName })
  }

  return {
    userStore,
    leaderStore,
    navItems,
    homeRouteName,
    profileItems,
    badgeIcon,
    handleLogout,
    toggleView,
    navigateTo,
  }
}
