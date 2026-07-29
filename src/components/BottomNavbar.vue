<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/userStore';
import { useHaptic } from '../composables/useHaptic';
import {
  splitBottomNavItems,
  isMoreNavActive,
  type BottomNavItem,
} from '../composables/useBottomNav';
import AppIcon from './AppIcon.vue';
import MobileMoreSheet from './MobileMoreSheet.vue';
import type { IconName } from './AppIcon.vue';

const router = useRouter();
const userStore = useUserStore();
const { tap } = useHaptic();
const currentRoute = computed(() => router.currentRoute.value.name);
const showProfileDropdown = ref(false);
const showMoreSheet = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

const allNavItems = computed<BottomNavItem[]>(() => {
  if (userStore.canToggleView && userStore.currentView === 'cell') {
    return [
      { name: 'dashboard', label: 'Início', icon: 'home' },
      { name: 'minha-celula', label: 'Minha Célula', icon: 'users' },
      { name: 'attendance', label: 'Frequência', icon: 'calendar' },
      { name: 'reports', label: 'Relatórios', icon: 'chart-bar' },
    ];
  }

  if (userStore.isPlatformOwner) {
    return [
      { name: 'admin-dashboard', label: 'Dashboard', icon: 'home' },
      { name: 'admin-cells', label: 'Células', icon: 'grid' },
      { name: 'admin-users', label: 'Usuários', icon: 'users' },
      { name: 'admin-members', label: 'Membros', icon: 'users' },
      { name: 'admin-rede-cuidado', label: 'Rede', icon: 'heart' },
    ];
  }

  if (userStore.isChurchAdmin) {
    return [
      { name: 'admin-dashboard', label: 'Dashboard', icon: 'home' },
      { name: 'admin-cells', label: 'Células', icon: 'grid' },
      { name: 'admin-users', label: 'Usuários', icon: 'users' },
      { name: 'admin-members', label: 'Membros', icon: 'users' },
      { name: 'admin-rede-cuidado', label: 'Rede', icon: 'heart' },
    ];
  }

  return [
    { name: 'dashboard', label: 'Início', icon: 'home' },
    { name: 'minha-celula', label: 'Minha Célula', icon: 'users' },
    { name: 'attendance', label: 'Frequência', icon: 'calendar' },
    { name: 'reports', label: 'Relatórios', icon: 'chart-bar' },
  ];
});

const useOverflowMenu = computed(() => {
  if (userStore.canToggleView && userStore.currentView === 'cell') return false;
  return userStore.isChurchAdmin || userStore.isPlatformOwner;
});

const navSplit = computed(() =>
  splitBottomNavItems(allNavItems.value, { overflowMode: useOverflowMenu.value })
);

const primaryNavItemsComputed = computed(() => navSplit.value.primary);
const moreNavItemsComputed = computed(() => navSplit.value.more);

const moreNavActive = computed(() =>
  isMoreNavActive(moreNavItemsComputed.value, currentRoute.value)
);

const profileItems = [
  { name: 'profile', label: 'Meu Perfil', icon: 'user' as IconName },
  { name: 'configuracoes', label: 'Configurações', icon: 'settings' as IconName },
];

function navigateTo(routeName: string) {
  tap();
  router.push({ name: routeName });
}

function isActive(routeName: string): boolean {
  return currentRoute.value === routeName;
}

function isProfileActive(): boolean {
  return ['profile', 'configuracoes', 'super-admin'].includes(currentRoute.value as string);
}

function toggleProfileDropdown() {
  tap();
  showProfileDropdown.value = !showProfileDropdown.value;
  showMoreSheet.value = false;
}

function openMoreSheet() {
  tap();
  showMoreSheet.value = true;
  showProfileDropdown.value = false;
}

function navigateFromMore(routeName: string) {
  tap();
  router.push({ name: routeName });
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
  if (!userStore.canToggleView) return;
  tap();
  userStore.toggleView();
  showProfileDropdown.value = false;
  if (userStore.currentView === 'cell') {
    router.push({ name: 'dashboard' });
  } else {
    router.push({ name: 'admin-dashboard' });
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
    <div
      v-for="item in primaryNavItemsComputed"
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
      <span class="text-xs mt-1 font-medium truncate max-w-[4.5rem]">{{ item.label }}</span>
    </div>

    <div
      v-if="moreNavItemsComputed.length > 0"
      @click="openMoreSheet"
      class="nav-item"
      :class="moreNavActive ? 'nav-item-active' : 'nav-item-inactive'"
    >
      <AppIcon name="menu" size="md" :color="moreNavActive ? '#0074ff' : undefined" />
      <span class="text-xs mt-1 font-medium">Mais</span>
    </div>

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

      <div
        v-if="showProfileDropdown"
        class="absolute bottom-full right-0 mb-2 w-52 bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 py-2 z-50"
      >
        <div
          v-if="userStore.canToggleView"
          @click="toggleView"
          class="flex items-center px-4 py-3 text-primary-700 cursor-pointer select-none"
          style="min-height: 44px; touch-action: manipulation;"
        >
          <AppIcon name="grid" size="sm" class="mr-3" />
          <span class="text-sm font-medium">
            {{ userStore.currentView === 'admin' ? 'Ir para visão de célula' : 'Ir para visão admin' }}
          </span>
        </div>

        <div v-if="userStore.canToggleView" class="border-t border-gray-100 my-1"></div>

        <div
          v-if="userStore.isPlatformOwner"
          @click="navigateToProfile('super-admin')"
          class="flex items-center px-4 py-3 text-violet-700 cursor-pointer select-none"
          style="min-height: 44px; touch-action: manipulation;"
        >
          <AppIcon name="star" size="sm" class="mr-3" />
          <span class="text-sm font-medium">Super Admin</span>
        </div>

        <div v-if="userStore.isPlatformOwner" class="border-t border-gray-100 my-1"></div>

        <div
          v-for="profileItem in profileItems"
          :key="profileItem.name"
          @click="navigateToProfile(profileItem.name)"
          class="flex items-center px-4 py-3 text-gray-700 cursor-pointer select-none"
          style="min-height: 44px; touch-action: manipulation;"
        >
          <AppIcon :name="profileItem.icon" size="sm" class="mr-3" />
          <span class="text-sm font-medium">{{ profileItem.label }}</span>
        </div>

        <div class="border-t border-gray-100 my-1"></div>

        <div
          @click="handleLogout"
          class="flex items-center px-4 py-3 text-red-600 cursor-pointer select-none"
          style="min-height: 44px; touch-action: manipulation;"
        >
          <AppIcon name="logout" size="sm" class="mr-3" />
          <span class="text-sm font-medium">Sair</span>
        </div>
      </div>
    </div>
  </nav>

  <MobileMoreSheet
    :open="showMoreSheet"
    :items="moreNavItemsComputed"
    @navigate="navigateFromMore"
    @close="showMoreSheet = false"
  />
</template>
