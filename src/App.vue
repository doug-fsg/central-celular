<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import BottomNavbar from './components/BottomNavbar.vue'
import PageRouteLoader from './components/PageRouteLoader.vue'
import MobileOfflineBanner from './components/MobileOfflineBanner.vue'
import { usePlatform } from './composables/usePlatform'
import { useSidebarCollapsed } from './composables/useSidebarCollapsed'
import { useIsMobileViewport } from './composables/useIsMobileViewport'

const route = useRoute()
const { mobileShell } = usePlatform()
const { collapsed } = useSidebarCollapsed()
const { isMobileViewport } = useIsMobileViewport()

const publicRoutes = ['home', 'login', 'gileade', 'first-access', 'reset-password']

const showNavigation = computed(() => {
  return !publicRoutes.includes(route.name as string)
})
</script>

<template>
  <MobileOfflineBanner />

  <PageRouteLoader />

  <div
    class="app-layout"
    :class="{
      'app-layout--authenticated': showNavigation,
      'app-layout--sidebar-collapsed': showNavigation && collapsed,
    }"
  >
    <AppSidebar v-if="showNavigation" class="hidden sm:flex" />

    <div
      class="app-shell"
      :class="{ 'app-shell--mobile': mobileShell && showNavigation }"
    >
      <router-view />
    </div>
  </div>

  <div v-if="showNavigation && isMobileViewport">
    <BottomNavbar />
  </div>
</template>
