<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import AppIcon from './AppIcon.vue';
import type { IconName } from './AppIcon.vue';

const router = useRouter();
const userStore = useUserStore();
const currentRoute = computed(() => router.currentRoute.value.name);
const showProfileDropdown = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

type NavItem = {
  name: string;
  label: string;
  icon: IconName;
};

// Itens de navegação baseados no cargo do usuário
const navItems = computed<NavItem[]>(() => {
  // Se pode alternar visão e está na visão célula, mostrar links de líder
  if (userStore.canToggleView && userStore.currentView === 'cell') {
    return [
      { name: 'dashboard', label: 'Início', icon: 'home' },
      { name: 'minha-celula', label: 'Minha Célula', icon: 'users' },
      { name: 'attendance', label: 'Frequência', icon: 'calendar' },
      { name: 'reports', label: 'Relatórios', icon: 'chart-bar' },
    ];
  }
  
  if (userStore.isAdmin) {
    // Menu para admin/pastor
    return [
      { name: 'admin-dashboard', label: 'Dashboard', icon: 'home' },
      { name: 'admin-users', label: 'Usuários', icon: 'users' },
      { name: 'admin-cells', label: 'Células', icon: 'grid' },
      { name: 'admin-members', label: 'Membros', icon: 'users' },
    ];
  } else {
    // Menu para membros/líderes
    return [
      { name: 'dashboard', label: 'Início', icon: 'home' },
      { name: 'minha-celula', label: 'Minha Célula', icon: 'users' },
      { name: 'attendance', label: 'Frequência', icon: 'calendar' },
      { name: 'reports', label: 'Relatórios', icon: 'chart-bar' },
    ];
  }
});

const profileItems = [
  { name: 'profile', label: 'Meu Perfil', icon: 'user' },
  { name: 'configuracoes', label: 'Configurações', icon: 'settings' },
];

function navigateTo(routeName: string) {
  router.push({ name: routeName });
}

function isActive(routeName: string): boolean {
  return currentRoute.value === routeName;
}

function isProfileActive(): boolean {
  return ['profile', 'configuracoes'].includes(currentRoute.value as string);
}

function toggleProfileDropdown() {
  showProfileDropdown.value = !showProfileDropdown.value;
}

function navigateToProfile(routeName: string) {
  router.push({ name: routeName });
  showProfileDropdown.value = false;
}

async function handleLogout() {
  try {
    await userStore.logout();
    router.push({ name: 'login' });
    showProfileDropdown.value = false;
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
  }
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

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    showProfileDropdown.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <nav class="bottom-nav">
    <!-- Itens principais de navegação -->
    <div 
      v-for="item in navItems" 
      :key="item.name" 
      @click="navigateTo(item.name)"
      class="nav-item"
      :class="isActive(item.name) ? 'nav-item-active' : 'nav-item-inactive'"
    >
      <AppIcon 
        :name="item.icon" 
        size="md" 
        :color="isActive(item.name) ? '#0074ff' : undefined"
      />
      <span class="text-xs mt-1 font-medium">{{ item.label }}</span>
    </div>

    <!-- Botão de alternância de visão (flutuante) -->
    <button
      v-if="userStore.canToggleView"
      @click="toggleView"
      class="fixed bottom-20 right-4 z-40 bg-white border-2 border-primary-500 rounded-xl px-4 py-2 shadow-lg hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all flex items-center gap-2"
      :title="userStore.currentView === 'admin' ? 'Alternar para visão de célula' : 'Alternar para visão admin'"
    >
      <svg v-if="userStore.currentView === 'admin'" class="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
      <svg v-else class="h-5 w-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <span class="text-xs font-semibold text-primary-700">
        {{ userStore.currentView === 'admin' ? 'Célula' : 'Admin' }}
      </span>
    </button>

    <!-- Menu do perfil com dropdown -->
    <div class="relative" ref="dropdownRef">
      <div 
        @click="toggleProfileDropdown"
        class="nav-item"
        :class="isProfileActive() ? 'nav-item-active' : 'nav-item-inactive'"
      >
        <AppIcon 
          name="user" 
          size="md" 
          :color="isProfileActive() ? '#0074ff' : undefined"
        />
        <span class="text-xs mt-1 font-medium">Perfil</span>
      </div>

      <!-- Dropdown do perfil -->
      <div 
        v-if="showProfileDropdown"
        class="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
      >
        <!-- Opções do perfil -->
        <div 
          v-for="profileItem in profileItems" 
          :key="profileItem.name"
          @click="navigateToProfile(profileItem.name)"
          class="flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          <AppIcon 
            :name="profileItem.icon" 
            size="sm" 
            class="mr-3"
          />
          <span class="text-sm font-medium">{{ profileItem.label }}</span>
        </div>
        
        <!-- Separador -->
        <div class="border-t border-gray-100 my-1"></div>
        
        <!-- Opção de sair -->
        <div 
          @click="handleLogout"
          class="flex items-center px-4 py-3 text-red-600 hover:bg-red-50 cursor-pointer"
        >
          <AppIcon 
            name="logout" 
            size="sm" 
            class="mr-3"
          />
          <span class="text-sm font-medium">Sair</span>
        </div>
      </div>
    </div>
  </nav>
</template> 