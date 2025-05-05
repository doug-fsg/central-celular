<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'

const router = useRouter()
const userStore = useUserStore()

function navigateToLogin() {
  router.push({ name: 'login' })
}

function navigateToDashboard() {
  if (userStore.isLoggedIn) {
    if (userStore.isAdmin) {
      router.push({ name: 'admin-dashboard' })
    } else if (userStore.isSupervisor) {
      router.push({ name: 'supervisor-dashboard' })
    } else {
      router.push({ name: 'dashboard' })
    }
  } else {
    router.push({ name: 'login' })
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-primary-50 to-white">
    <header class="bg-white/80 backdrop-blur-sm fixed w-full z-50">
      <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
          <div class="flex-shrink-0">
            <h1 class="text-2xl font-bold text-primary-600">Central Celular</h1>
          </div>
          <div>
            <button
              v-if="userStore.isLoggedIn"
              @click="navigateToDashboard"
              class="btn btn-primary"
            >
              Acessar Sistema
            </button>
            <button 
              v-else
              @click="navigateToLogin" 
              class="btn btn-primary"
            >
              Entrar
            </button>
          </div>
        </div>
      </nav>
    </header>

    <main>
      <!-- Hero Section -->
      <div class="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto">
          <div class="text-center">
            <h2 class="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              Sistema de Gestão para
              <span class="text-primary-600">Células </span>
            </h2>
            <p class="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Gerencie sua célula com eficiência. Acompanhe a frequência dos membros, 
              gere relatórios e mantenha sua liderança informada.
            </p>
            <div class="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div class="rounded-md shadow">
                <button
                  @click="navigateToDashboard"
                  class="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 md:py-4 md:text-lg md:px-10"
                >
                  {{ userStore.isLoggedIn ? 'Acessar Meu Painel' : 'Começar Agora' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Features -->
      <div class="py-16 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div class="bg-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div class="text-primary-600 mb-4">
                <div class="h-12 w-12 rounded-md bg-primary-100 flex items-center justify-center">
                  📊
                </div>
              </div>
              <h3 class="text-xl font-bold text-gray-900 mb-2">Controle de Frequência</h3>
              <p class="text-gray-600">
                Registre e acompanhe a presença dos membros nos cultos e células de forma simples e organizada.
              </p>
            </div>

            <div class="bg-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div class="text-primary-600 mb-4">
                <div class="h-12 w-12 rounded-md bg-primary-100 flex items-center justify-center">
                  📈
                </div>
              </div>
              <h3 class="text-xl font-bold text-gray-900 mb-2">Relatórios Detalhados</h3>
              <p class="text-gray-600">
                Visualize estatísticas e gere relatórios completos sobre o crescimento e participação da sua célula.
              </p>
            </div>

            <div class="bg-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div class="text-primary-600 mb-4">
                <div class="h-12 w-12 rounded-md bg-primary-100 flex items-center justify-center">
                  👥
                </div>
              </div>
              <h3 class="text-xl font-bold text-gray-900 mb-2">Gestão de Membros</h3>
              <p class="text-gray-600">
                Organize seus membros, consolidadores e co-líderes em um só lugar, com todas as informações necessárias.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA Section -->
      <div class="bg-primary-700">
        <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 class="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span class="block">Pronto para começar?</span>
            <span class="block text-primary-200">Comece a usar hoje mesmo.</span>
          </h2>
          <div class="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div class="inline-flex rounded-md shadow">
              <button
                @click="navigateToDashboard"
                class="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50"
              >
                {{ userStore.isLoggedIn ? 'Acessar Sistema' : 'Entrar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="bg-gray-50">
      <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <p class="text-base text-gray-400">
            &copy; {{ new Date().getFullYear() }} Central Celular. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>