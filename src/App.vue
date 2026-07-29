<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from './components/Navbar.vue'
import BottomNavbar from './components/BottomNavbar.vue'
import PageRouteLoader from './components/PageRouteLoader.vue'
import MobileOfflineBanner from './components/MobileOfflineBanner.vue'
import { usePlatform } from './composables/usePlatform'

const route = useRoute()
const { mobileShell } = usePlatform()

const publicRoutes = ['home', 'login', 'gileade', 'first-access', 'reset-password']

const showNavigation = computed(() => {
  return !publicRoutes.includes(route.name as string)
})
</script>

<template>
  <MobileOfflineBanner />

  <PageRouteLoader />

  <Navbar v-if="showNavigation" class="hidden sm:block" />

  <div
    class="app-shell"
    :class="{ 'app-shell--mobile': mobileShell && showNavigation }"
  >
    <router-view />
  </div>

  <BottomNavbar v-if="showNavigation" class="sm:hidden" />
</template>
