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
  if (userStore.isAdmin) {
    // Menu para admin/pastor
    return [
      { name: 'admin-dashboard', label: 'Dashboard', icon: 'home' },
      { name: 'admin-users', label: 'Usuários', icon: 'users' },
      { name: 'admin-cells', label: 'Células', icon: 'grid' },
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