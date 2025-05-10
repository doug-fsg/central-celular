<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import { useLeaderStore } from '../stores/leaderStore'
import api from '../services/api'

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
  if (userStore.isAdmin) {
    return []
  } else if (userStore.isSupervisor) {
    return [
      { name: 'supervisor-dashboard', label: 'Dashboard' },
      { name: 'reports', label: 'Relatórios' }
    ]
  } else {
    return [
      { name: 'dashboard', label: 'Dashboard' },
      { name: 'members', label: 'Membros' },
      { name: 'attendance', label: 'Frequência' },
      { name: 'reports', label: 'Relatórios' }
    ]
  }
})

async function handleLogout() {
  try {
    await api.logout()
    userStore.clearUser()
    router.push({ name: 'login' })
  } catch (error) {
    console.error('Erro ao fazer logout:', error)
  }
}

function navigateToProfile() {
  router.push({ name: 'profile' })
  showDropdown.value = false
}

function toggleDropdown() {
  showDropdown.value = !showDropdown.value
}
</script>

<template>
  <nav class="bg-white shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex">
          <div class="flex-shrink-0 flex items-center">
            <router-link 
              :to="userStore.isAdmin ? { name: 'admin-dashboard' } : { name: 'home' }" 
              class="flex flex-col items-start"
            >
              <span class="text-primary-600 font-bold text-xl">Central</span>
              <span v-if="userStore.isAdmin" class="text-xs text-gray-500">Painel Administrativo</span>
            </router-link>
          </div>
          <div v-if="!userStore.isAdmin" class="ml-6 flex space-x-8">
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
        
        <div class="ml-6 flex items-center">
          <!-- Menu perfil -->
          <div class="ml-3 relative">
            <div>
              <button @click="toggleDropdown" type="button" class="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500" id="user-menu-button" aria-expanded="false" aria-haspopup="true">
                <span class="sr-only">Abrir menu do usuário</span>
                <div class="relative">
                  <div class="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-800 font-bold">
                    {{ userStore.userName.charAt(0).toUpperCase() }}
                  </div>
                  <div v-if="badgeIcon && !userStore.isAdmin" class="absolute -top-1 -right-1 text-xs">
                    {{ badgeIcon }}
                  </div>
                </div>
              </button>
            </div>
            <div v-if="showDropdown" class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50" role="menu" aria-orientation="vertical" aria-labelledby="user-menu-button" tabindex="-1">
              <div v-if="leaderStore.leaderBadge !== 'none' && !userStore.isAdmin" class="px-3 py-1.5 text-xs text-gray-500 border-b border-gray-100">
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
              <button @click="handleLogout" class="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem" tabindex="-1">Sair</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template> 