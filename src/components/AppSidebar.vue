<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAppNavigation } from '../composables/useAppNavigation'
import { useSidebarCollapsed } from '../composables/useSidebarCollapsed'
import AppIcon from './AppIcon.vue'

const route = useRoute()
const { collapsed, toggleCollapsed } = useSidebarCollapsed()
const {
  userStore,
  navItems,
  homeRouteName,
  profileItems,
  badgeIcon,
  handleLogout,
  toggleView,
  navigateTo,
} = useAppNavigation()

const showUserMenu = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

const currentRouteName = computed(() => route.name)

function isActive(routeName: string): boolean {
  return currentRouteName.value === routeName
}

function isProfileActive(): boolean {
  return ['profile', 'configuracoes', 'super-admin'].includes(currentRouteName.value as string)
}

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value
}

function closeUserMenu() {
  showUserMenu.value = false
}

function onNavigate(routeName: string) {
  navigateTo(routeName)
  closeUserMenu()
}

async function onLogout() {
  closeUserMenu()
  try {
    await handleLogout()
  } catch (error) {
    console.error('Erro ao fazer logout:', error)
  }
}

function onToggleView() {
  toggleView()
  closeUserMenu()
}

function handleClickOutside(event: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
    closeUserMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <aside
    class="app-sidebar"
    :class="{ 'app-sidebar--collapsed': collapsed }"
    aria-label="Navegação principal"
  >
    <div class="app-sidebar__inner">
      <div class="app-sidebar__header">
        <router-link
          :to="{ name: homeRouteName }"
          class="app-sidebar__brand"
          :title="collapsed ? 'Aprisco' : undefined"
        >
          <img
            src="/src/assets/brand/logo-icon.png"
            alt=""
            class="size-8 shrink-0"
          />
          <span v-if="!collapsed" class="app-sidebar__brand-text">Aprisco</span>
        </router-link>

        <button
          type="button"
          class="app-sidebar__collapse-btn"
          :aria-label="collapsed ? 'Expandir menu' : 'Recolher menu'"
          :title="collapsed ? 'Expandir menu' : 'Recolher menu'"
          @click="toggleCollapsed"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-4 shrink-0 transition-transform duration-200"
            :class="{ 'rotate-180': collapsed }"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <nav class="app-sidebar__nav">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="app-sidebar__link"
          :class="[
            isActive(item.name) ? 'app-sidebar__link--active' : 'app-sidebar__link--inactive',
            collapsed ? 'app-sidebar__link--collapsed' : '',
          ]"
          :title="collapsed ? item.label : undefined"
        >
          <AppIcon
            :name="item.icon"
            size="md"
            :color="isActive(item.name) ? '#6617e9' : undefined"
          />
          <span v-if="!collapsed">{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="app-sidebar__footer">
        <button
          v-if="userStore.canToggleView"
          type="button"
          class="app-sidebar__view-toggle"
          :class="{ 'app-sidebar__view-toggle--collapsed': collapsed }"
          :title="collapsed ? (userStore.currentView === 'admin' ? 'Visão de célula' : 'Visão admin') : undefined"
          @click="onToggleView"
        >
          <AppIcon name="grid" size="sm" />
          <span v-if="!collapsed">
            {{ userStore.currentView === 'admin' ? 'Visão de célula' : 'Visão admin' }}
          </span>
        </button>

        <div ref="userMenuRef" class="relative">
          <button
            type="button"
            class="app-sidebar__user"
            :class="{
              'app-sidebar__user--active': isProfileActive() || showUserMenu,
              'app-sidebar__user--collapsed': collapsed,
            }"
            aria-haspopup="true"
            :aria-expanded="showUserMenu"
            :title="collapsed ? (userStore.userName || 'Conta') : undefined"
            @click.stop="toggleUserMenu"
          >
            <div class="relative shrink-0">
              <div class="app-sidebar__avatar">
                {{ userStore.userName ? userStore.userName.charAt(0).toUpperCase() : '' }}
              </div>
              <span
                v-if="badgeIcon && !userStore.isAdmin"
                class="absolute -top-1 -right-1 text-xs leading-none"
              >
                {{ badgeIcon }}
              </span>
            </div>
            <div v-if="!collapsed" class="min-w-0 flex-1 text-left">
              <p class="truncate text-sm font-semibold text-neutral-800">
                {{ userStore.userName || 'Usuário' }}
              </p>
              <p class="truncate text-xs text-neutral-500">
                {{ userStore.user?.cargo || 'Conta' }}
              </p>
            </div>
            <AppIcon
              v-if="!collapsed"
              name="dots"
              size="sm"
              class="shrink-0 text-neutral-400"
            />
          </button>

          <div
            v-if="showUserMenu"
            class="app-sidebar__menu"
            :class="{ 'app-sidebar__menu--collapsed': collapsed }"
            role="menu"
          >
            <button
              v-if="userStore.isPlatformOwner"
              type="button"
              class="app-sidebar__menu-item app-sidebar__menu-item--accent"
              role="menuitem"
              @click="onNavigate('super-admin')"
            >
              <AppIcon name="star" size="sm" />
              Super Admin
            </button>

            <button
              v-for="item in profileItems"
              :key="item.name"
              type="button"
              class="app-sidebar__menu-item"
              role="menuitem"
              @click="onNavigate(item.name)"
            >
              <AppIcon :name="item.icon" size="sm" />
              {{ item.label }}
            </button>

            <div class="my-1 border-t border-neutral-200" />

            <button
              type="button"
              class="app-sidebar__menu-item app-sidebar__menu-item--danger"
              role="menuitem"
              @click="onLogout"
            >
              <AppIcon name="logout" size="sm" />
              Sair
            </button>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>
