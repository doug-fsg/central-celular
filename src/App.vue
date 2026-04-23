<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from './components/Navbar.vue';
import BottomNavbar from './components/BottomNavbar.vue';
import PageRouteLoader from './components/PageRouteLoader.vue';

const route = useRoute();

// Lista de rotas onde não queremos mostrar a navegação (landing page, login, etc.)
/** Rotas sem Navbar / barra inferior (telas públicas de foco único). */
const publicRoutes = ['home', 'login', 'gileade', 'first-access', 'reset-password'];

// Verificamos se estamos em uma rota autenticada onde devemos mostrar o menu
const showNavigation = computed(() => {
  return !publicRoutes.includes(route.name as string);
});
</script>

<template>
  <PageRouteLoader />

  <!-- Barra de navegação superior (visível em telas maiores) -->
  <Navbar v-if="showNavigation" class="hidden sm:block" />

  <router-view />
  
  <!-- Barra de navegação inferior (visível apenas em dispositivos móveis) -->
  <BottomNavbar v-if="showNavigation" class="sm:hidden" />
</template>