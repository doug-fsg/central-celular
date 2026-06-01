<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import { useLeaderStore } from '../stores/leaderStore'
import api from '../services/api'

const dropdownRef = ref<HTMLElement | null>(null)

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const router = useRouter()
const userStore = useUserStore()
const leaderStore = useLeaderStore()

const showDropdown = ref(false)

const badgeIcon = computed(() => {
  switch (leaderStore.leaderBadge) {
    case 'bronze': return '🥉'
    case 'silver': return '🥈'
    case 'gold': return '🥇'
    default: return ''
  }
})

// Computed para controlar quais links mostrar
const navLinks = computed(() => {
  // Se pode alternar visão e está na visão célula, mostrar links de líder
  if (userStore.canToggleView && userStore.currentView === 'cell') {
    return [
      { name: 'dashboard', label: 'Início' },
      { name: 'minha-celula', label: 'Minha Célula' },
      { name: 'attendance', label: 'Frequência' },
      { name: 'reports', label: 'Relatórios' }
    ]
  }
  
  if (userStore.isPlatformOwner) {
    return [
      { name: 'super-admin', label: 'Super Admin' },
      { name: 'admin-dashboard', label: 'Igreja' },
      { name: 'admin-users', label: 'Usuários' },
      { name: 'admin-cells', label: 'Células' },
      { name: 'admin-members', label: 'Membros' },
      { name: 'admin-rede-cuidado', label: 'Rede de cuidado' },
    ]
  }

  if (userStore.isChurchAdmin) {
    return [
      { name: 'admin-dashboard', label: 'Dashboard' },
      { name: 'admin-users', label: 'Usuários' },
      { name: 'admin-cells', label: 'Células' },
      { name: 'admin-members', label: 'Membros' },
      { name: 'admin-rede-cuidado', label: 'Rede de cuidado' },
    ]
  } else if (userStore.isSupervisor) {
    return [
      { name: 'supervisor-dashboard', label: 'Início' },
      { name: 'reports', label: 'Relatórios' }
    ]
  } else {
    return [
      { name: 'dashboard', label: 'Início' },
      { name: 'minha-celula', label: 'Minha Célula' },
      { name: 'attendance', label: 'Frequência' },
      { name: 'reports', label: 'Relatórios' }
    ]
  }
})

async function handleLogout() {
  try {
    await userStore.logout();
    router.push({ name: 'login' });
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
  }
}

function navigateToProfile() {
  router.push({ name: 'profile' })
  showDropdown.value = false
}

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}

function toggleView() {
  if (!userStore.canToggleView) return
  userStore.toggleView()
  // Navegar para a rota apropriada após alternar
  if (userStore.currentView === 'cell') {
    router.push({ name: 'dashboard' })
  } else {
    router.push({ name: 'admin-dashboard' })
  }
}
</script>

<template>
  <nav class="bg-white shadow-sm" style="padding-top: env(safe-area-inset-top, 0px);">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex">
          <div class="flex-shrink-0 flex items-center">
            <router-link 
              :to="userStore.isPlatformOwner ? { name: 'super-admin' } : userStore.isChurchAdmin ? { name: 'admin-dashboard' } : { name: 'home' }" 
              class="flex items-center gap-2"
            >
              <img src="/src/assets/brand/logo-icon.png" alt="Aprisco" class="h-7 w-7" />
            </router-link>
          </div>
          <div class="ml-6 flex space-x-8">
            <router-link
              v-for="link in navLinks"
              :key="link.name"
              :to="{ name: link.name }"
              class="border-transparent text-gray-500 hover:border-primary-500 hover:text-primary-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              active-class="border-primary-500 text-primary-900"
            >
              {{ link.label }}
            </router-link>
          </div>
        </div>
        
        <div class="ml-6 flex items-center gap-3">
          <!-- Botão de alternância de visão -->
          <button
            v-if="userStore.canToggleView"
            @click="toggleView"
            type="button"
            class="inline-flex items-center px-3 py-2 border-2 border-primary-500 shadow-sm text-sm font-medium rounded-md text-primary-700 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            :title="userStore.currentView === 'admin' ? 'Alternar para visão de célula' : 'Alternar para visão admin'"
          >
            <svg v-if="userStore.currentView === 'admin'" class="h-5 w-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <svg v-else class="h-5 w-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span class="font-semibold">{{ userStore.currentView === 'admin' ? 'Célula' : 'Admin' }}</span>
          </button>
          
          <!-- Menu perfil -->
          <div class="ml-3 relative" ref="dropdownRef">
            <div>
              <button @click="toggleDropdown" type="button" class="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500" id="user-menu-button" aria-expanded="false" aria-haspopup="true">
                <span class="sr-only">Abrir menu do usuário</span>
                <div class="relative">
                  <div class="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-800 font-bold">
                    {{ userStore.userName ? userStore.userName.charAt(0).toUpperCase() : '' }}
                  </div>
                  <div v-if="badgeIcon && !userStore.isAdmin" class="absolute -top-1 -right-1 text-xs">
                    {{ badgeIcon }}
                  </div>
                </div>
              </button>
            </div>
            <div v-if="showDropdown" class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" tabindex="-1">
              <div v-if="false" class="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-100">
                <div class="flex items-center">
                  <span class="mr-1">
                    {{ leaderStore.leaderBadge === 'bronze' ? '🥉' : leaderStore.leaderBadge === 'silver' ? '🥈' : '🥇' }}
                  </span>
                  <span class="font-medium">
                    {{ leaderStore.leaderBadge === 'bronze' ? 'Bronze' : leaderStore.leaderBadge === 'silver' ? 'Prata' : 'Ouro' }}
                  </span>
                  <span class="ml-1 text-gray-400">({{ leaderStore.stats.consecutiveOnTimeReports }}m)</span>
                </div>
              </div>
              <router-link :to="{ name: 'profile' }" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem" tabindex="-1">Meu Perfil</router-link>
              <router-link :to="{ name: 'configuracoes' }" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem" tabindex="-1">Configurações</router-link>
              <button @click="handleLogout" class="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem" tabindex="-1">Sair</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template> 