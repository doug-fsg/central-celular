<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import AppIcon from './AppIcon.vue';
import type { IconName } from './AppIcon.vue';

const router = useRouter();
const currentRoute = computed(() => router.currentRoute.value.name);

type NavItem = {
  name: string;
  label: string;
  icon: IconName;
};

const navItems: NavItem[] = [
  { name: 'dashboard', label: 'Início', icon: 'home' },
  { name: 'members', label: 'Membros', icon: 'users' },
  { name: 'attendance', label: 'Frequência', icon: 'calendar' },
  { name: 'reports', label: 'Relatórios', icon: 'chart-bar' },
  { name: 'profile', label: 'Perfil', icon: 'settings' }
];

function navigateTo(routeName: string) {
  router.push({ name: routeName });
}

function isActive(routeName: string): boolean {
  return currentRoute.value === routeName;
}
</script>

<template>
  <nav class="bottom-nav">
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
  </nav>
</template> 