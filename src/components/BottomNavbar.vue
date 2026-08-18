<script setup lang="ts">
import { ref, computed } from 'vue';
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
import ProfileAvatar from './ProfileAvatar.vue';
import ProfileMenuSheet from './ProfileMenuSheet.vue';

const router = useRouter();
const userStore = useUserStore();
const { tap } = useHaptic();
const currentRoute = computed(() => router.currentRoute.value.name);
const showProfileSheet = ref(false);
const showMoreSheet = ref(false);

const allNavItems = computed<BottomNavItem[]>(() => {
  if (userStore.canToggleView && userStore.currentView === 'cell') {
    return [
      { name: 'dashboard', label: 'Início', icon: 'home' },
      { name: 'minha-celula', label: 'Minha Célula', icon: 'users' },
      { name: 'attendance', label: 'Frequência', icon: 'calendar' },
      { name: 'rede-cuidado', label: 'Rede', icon: 'heart' },
    ];
  }

  if (userStore.isPlatformOwner) {
    return [
      { name: 'admin-dashboard', label: 'Dashboard', icon: 'home' },
      { name: 'admin-cells', label: 'Células', icon: 'grid' },
      { name: 'admin-users', label: 'Usuários', icon: 'users' },
      { name: 'admin-push', label: 'Notificações', icon: 'bell' },
      { name: 'admin-members', label: 'Membros', icon: 'users' },
      { name: 'admin-rede-cuidado', label: 'Rede', icon: 'heart' },
    ];
  }

  if (userStore.isChurchAdmin) {
    return [
      { name: 'admin-dashboard', label: 'Dashboard', icon: 'home' },
      { name: 'admin-cells', label: 'Células', icon: 'grid' },
      { name: 'admin-users', label: 'Usuários', icon: 'users' },
      { name: 'admin-push', label: 'Notificações', icon: 'bell' },
      { name: 'admin-members', label: 'Membros', icon: 'users' },
      { name: 'admin-rede-cuidado', label: 'Rede', icon: 'heart' },
    ];
  }

  if (userStore.isSupervisor) {
    return [
      { name: 'supervisor-dashboard', label: 'Início', icon: 'home' },
    ];
  }

  return [
    { name: 'dashboard', label: 'Início', icon: 'home' },
    { name: 'minha-celula', label: 'Minha Célula', icon: 'users' },
    { name: 'attendance', label: 'Frequência', icon: 'calendar' },
    { name: 'rede-cuidado', label: 'Rede', icon: 'heart' },
  ];
});

const useOverflowMenu = computed(() => {
  if (userStore.isSupervisor) return false;
  return allNavItems.value.length > 4;
});

const navSplit = computed(() =>
  splitBottomNavItems(allNavItems.value, { overflowMode: useOverflowMenu.value })
);

const primaryNavItemsComputed = computed(() => navSplit.value.primary);
const moreNavItemsComputed = computed(() => navSplit.value.more);

const moreNavActive = computed(() =>
  isMoreNavActive(moreNavItemsComputed.value, currentRoute.value)
);

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

function openProfileSheet() {
  tap();
  showProfileSheet.value = true;
  showMoreSheet.value = false;
}

function openMoreSheet() {
  tap();
  showMoreSheet.value = true;
  showProfileSheet.value = false;
}

function navigateFromMore(routeName: string) {
  tap();
  router.push({ name: routeName });
}

function navigateFromProfile(routeName: string) {
  showProfileSheet.value = false;
  router.push({ name: routeName });
}

async function handleLogout() {
  try {
    showProfileSheet.value = false;
    await userStore.logout();
    router.push({ name: 'login' });
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
  }
}

function toggleViewFromSheet() {
  if (!userStore.canToggleView) return;
  tap();
  userStore.toggleView();
  showProfileSheet.value = false;
  if (userStore.currentView === 'cell') {
    router.push({ name: 'dashboard' });
  } else {
    router.push({ name: 'admin-dashboard' });
  }
}
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

    <div
      @click="openProfileSheet"
      class="nav-item"
      :class="isProfileActive() ? 'nav-item-active' : 'nav-item-inactive'"
    >
      <ProfileAvatar
        :name="userStore.user?.nome"
        :avatar-url="userStore.user?.avatarUrl"
        size="sm"
        :ring="isProfileActive()"
      />
      <span class="text-xs mt-1 font-medium">Perfil</span>
    </div>
  </nav>

  <MobileMoreSheet
    :open="showMoreSheet"
    :items="moreNavItemsComputed"
    @navigate="navigateFromMore"
    @close="showMoreSheet = false"
  />

  <ProfileMenuSheet
    :open="showProfileSheet"
    @close="showProfileSheet = false"
    @navigate="navigateFromProfile"
    @toggle-view="toggleViewFromSheet"
    @logout="handleLogout"
  />
</template>
