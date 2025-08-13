<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import BrandLogo from '../components/BrandLogo.vue'

const router = useRouter()
const userStore = useUserStore()



function goToApp() {
  if (userStore.isLoggedIn) {
    if (userStore.isAdmin) router.push({ name: 'admin-dashboard' })
    else if (userStore.isSupervisor) router.push({ name: 'supervisor-dashboard' })
    else router.push({ name: 'dashboard' })
  } else {
    router.push({ name: 'login' })
  }
}

function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
	  <div class="min-h-[100svh] sm:min-h-screen flex flex-col bg-gradient-to-br from-vibrant-50 via-fun-50 to-accent-50">
    <!-- Header -->
    <header class="bg-white/90 backdrop-blur-sm fixed w-full z-50 border-b border-vibrant-100 shadow-sm">
      <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16 items-center">
                    <div class="flex items-center gap-3">
            <BrandLogo variant="full" class="h-10 w-auto hidden sm:block" />
          </div>
          <div class="flex items-center gap-4">
            <button 
              @click="() => scrollToId('sobre')" 
              class="hidden sm:inline-flex text-sm text-neutral-600 hover:text-vibrant-700 px-3 py-2 rounded-lg hover:bg-vibrant-50 transition-colors"
            >Sobre</button>
            <button
              @click="() => scrollToId('funcionalidades')" 
              class="hidden sm:inline-flex text-sm text-neutral-600 hover:text-vibrant-700 px-3 py-2 rounded-lg hover:bg-vibrant-50 transition-colors"
            >Funcionalidades</button>
            <button 
              @click="() => scrollToId('beneficios')" 
              class="hidden sm:inline-flex text-sm text-neutral-600 hover:text-vibrant-700 px-3 py-2 rounded-lg hover:bg-vibrant-50 transition-colors"
            >Benefícios</button>
            <button
              @click="goToApp"
              class="px-4 py-2 bg-vibrant-900 text-white rounded-lg hover:bg-vibrant-800 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
            >{{ userStore.isLoggedIn ? 'Acessar Sistema' : 'Entrar' }}</button>
          </div>
        </div>
      </nav>
    </header>

        <!-- Hero -->
    <section class="relative overflow-hidden">
            <div class="absolute inset-0 pointer-events-none">
        <svg class="absolute -top-32 -right-32 w-[32rem] h-[32rem] text-vibrant-100 opacity-60" viewBox="0 0 100 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M40.9,-63C55.2,-55.8,70.6,-46.6,76.5,-33.7C82.3,-20.7,78.6,-4.1,72.3,10.7C66.1,25.6,57.2,38.8,46.3,50.7C35.4,62.6,22.5,73.2,7.7,78.6C-7.1,83.9,-23.7,84,-37.5,77.5C-51.3,71.1,-62.3,58.1,-70.6,44.2C-78.8,30.3,-84.3,15.6,-82.9,1C-81.5,-13.6,-73.2,-27.2,-63.7,-38.7C-54.1,-50.2,-43.3,-59.6,-30.9,-67.2C-18.5,-74.8,-4.6,-80.5,8.7,-81.3C22.1,-82.1,44.2,-78.1,40.9,-63Z" transform="translate(100 100)" />
        </svg>
        <svg class="absolute -bottom-20 -left-32 w-[24rem] h-[24rem] text-fun-100 opacity-30" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <path fill="currentColor" d="M35.2,-58.1C45.8,-51.2,54.6,-41.4,60.8,-29.8C67,-18.2,70.6,-4.8,69.1,7.8C67.6,20.4,61,32.2,52,41.8C43,51.4,31.6,58.8,18.8,62.1C6,65.4,-8.2,64.6,-21.4,60.4C-34.6,56.2,-46.8,48.6,-55.4,38.2C-64,27.8,-69,14.6,-68.8,1.6C-68.6,-11.4,-63.2,-22.8,-55.6,-32.8C-48,-42.8,-38.2,-51.4,-26.8,-57.8C-15.4,-64.2,-2.4,-68.4,11.4,-68.6C25.2,-68.8,50.4,-65,35.2,-58.1Z" transform="translate(100 100)" />
        </svg>
      </div>

      <div class="pt-28 pb-16 sm:pt-36 sm:pb-24 px-4 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto">
          <div class="text-center">
            <div v-fade-in class="inline-flex items-center px-4 py-2 bg-gradient-to-r from-vibrant-100 to-fun-100 rounded-full mb-6">
              <span class="text-sm font-medium text-vibrant-700">🎉 Sistema para líderes de célula</span>
            </div>
            <h2 v-fade-in="{ delay: 80 }" class="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-vibrant-700 via-fun-800 to-accent-500 bg-clip-text text-transparent">
              Transforme o cuidado da sua célula
            </h2>
            <p v-fade-in="{ delay: 140 }" class="mt-6 max-w-3xl mx-auto text-neutral-700 text-lg sm:text-xl leading-relaxed">
              Aprisco é a plataforma que <span class="font-semibold text-vibrant-600">líderes de célula</span> usam para organizar encontros, 
              acompanhar discípulos e fortalecer a comunhão.
            </p>
            <div v-fade-in="{ delay: 220 }" class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button @click="goToApp" class="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-vibrant-500 to-vibrant-600 text-white text-lg font-semibold rounded-xl hover:from-vibrant-600 hover:to-vibrant-900 transform hover:scale-105 transition-all shadow-lg hover:shadow-xl">
                ✨ {{ userStore.isLoggedIn ? 'Acessar Sistema' : 'Começar agora' }}
              </button>
              <button @click="() => scrollToId('sobre')" class="w-full sm:w-auto px-8 py-4 bg-white text-vibrant-600 border-2 border-vibrant-200 text-lg font-semibold rounded-xl hover:bg-vibrant-50 hover:border-vibrant-300 transition-all shadow-md">
                Conhecer mais
                </button>
            </div>
          </div>
        </div>
      </div>
    </section>

        <!-- Sobre o Aprisco -->
    <section id="sobre" class="py-16 sm:py-20 bg-white">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h3 v-fade-in class="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-vibrant-600 to-fun-900 bg-clip-text text-transparent">
              Sobre o Aprisco
            </h3>
            <p v-fade-in="{ delay: 80 }" class="mt-6 text-neutral-700 text-lg leading-relaxed">
              Aprisco foi criado especialmente para <span class="font-semibold text-vibrant-600">líderes de célula</span> que querem 
              cuidar melhor dos seus discípulos!
            </p>
            <div v-fade-in="{ delay: 140 }" class="mt-6 flex items-center gap-2 text-sm text-vibrant-600">
              <span class="font-medium">✨ Feito com amor para células</span>
            </div>
                </div>
          <div v-fade-in class="bg-gradient-to-br from-vibrant-50 to-fun-50 border border-vibrant-100 rounded-2xl p-8 shadow-md">
            <div class="text-center">
              <p v-fade-in="{ delay: 80 }" class="text-neutral-700 leading-relaxed italic">
                Com o Aprisco, cada encontro de célula e cada pessoa são lembrados 
                com carinho: listas de presença, aniversários, diário do discípulo, um espaço para celebrar o que Deus está fazendo 💜
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

        <!-- Funcionalidades -->
    <section id="funcionalidades" class="py-16 sm:py-20 bg-gradient-to-b from-fun-50 to-accent-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12" v-fade-in>
          <h3 class="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-fun-600 to-vibrant-600 bg-clip-text text-transparent">
            Funcionalidades incríveis!
          </h3>
          <p class="mt-4 text-neutral-700 text-lg max-w-2xl mx-auto">
            Tudo que um <span class="font-semibold text-fun-600">líder de célula</span> precisa, na palma da mão! 
          </p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-fade-in class="bg-white rounded-2xl p-6 shadow-md border border-fun-100 hover:shadow-lg transform hover:scale-105 transition-all">
            <div class="h-12 w-12 rounded-xl bg-gradient-to-br from-fun-400 to-accent-400 text-white flex items-center justify-center mb-4 text-xl">📅</div>
            <h4 class="font-bold text-gray-800 mb-2">Lembrete de aniversários</h4>
            <p class="text-sm text-gray-600">Nunca mais esqueça o aniversário de alguém da célula 🎉 Receba os lembretes no seu WhatsApp</p>
          </div>
          <div v-fade-in="{ delay: 80 }" class="bg-white rounded-2xl p-6 shadow-md border border-vibrant-100 hover:shadow-lg transform hover:scale-105 transition-all">
            <div class="h-12 w-12 rounded-xl bg-gradient-to-br from-vibrant-400 to-fun-400 text-white flex items-center justify-center mb-4 text-xl">👥</div>
            <h4 class="font-bold text-gray-800 mb-2">Acompanhamento de membros</h4>
            <p class="text-sm text-gray-600">Cuide de cada discípulo: registre visitas, acompanhe necessidades e celebre vitórias! 🎉</p>
          </div>
          <div v-fade-in="{ delay: 160 }" class="bg-white rounded-2xl p-6 shadow-md border border-primary-100 hover:shadow-lg transform hover:scale-105 transition-all">
            <div class="h-12 w-12 rounded-xl bg-gradient-to-br from-primary-400 to-vibrant-400 text-white flex items-center justify-center mb-4 text-xl">📊</div>
            <h4 class="font-bold text-gray-800 mb-2">Relatórios simples</h4>
            <p class="text-sm text-gray-600">Relatórios de presença e crescimento lindos e prontos para compartilhar com a liderança! 📈</p>
          </div>
          <div v-fade-in class="bg-white rounded-2xl p-6 shadow-md border border-accent-100 hover:shadow-lg transform hover:scale-105 transition-all">
            <div class="h-12 w-12 rounded-xl bg-gradient-to-br from-accent-400 to-vibrant-400 text-white flex items-center justify-center mb-4 text-xl">🔔</div>
            <h4 class="font-bold text-gray-800 mb-2">Notificações e lembretes</h4>
            <p class="text-sm text-gray-600">Receba no seu WhatsApp os compromissos e prazos de relatório sempre em dia! 🎂</p>
          </div>
          <div v-fade-in="{ delay: 80 }" class="bg-white rounded-2xl p-6 shadow-md border border-accent-100 hover:shadow-lg transform hover:scale-105 transition-all">
            <div class="h-12 w-12 rounded-xl bg-gradient-to-br from-accent-400 to-primary-400 text-white flex items-center justify-center mb-4 text-xl">✅</div>
            <h4 class="font-bold text-gray-800 mb-2">Controle de presença</h4>
            <p class="text-sm text-gray-600">Acompanhe quem vai ao culto e à célula com super facilidade e visão rápida da assiduidade! 📋</p>
          </div>
          <div v-fade-in="{ delay: 160 }" class="bg-white rounded-2xl p-6 shadow-md border border-vibrant-100 hover:shadow-lg transform hover:scale-105 transition-all">
            <div class="h-12 w-12 rounded-xl bg-gradient-to-br from-vibrant-400 to-accent-400 text-white flex items-center justify-center mb-4 text-xl">💖</div>
            <h4 class="font-bold text-gray-800 mb-2">Motivação ao cuidado</h4>
            <p class="text-sm text-gray-600">Medalhas e indicadores que motivam constância, oração e acompanhamento amoroso! 🏆</p>
          </div>
        </div>
      </div>
    </section>

        <!-- Benefícios para o líder -->
    <section id="beneficios" class="py-16 sm:py-20 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12" v-fade-in>
          <h3 class="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-accent-600 to-primary-600 bg-clip-text text-transparent">
            Por que líderes de célula amam o Aprisco? 💚
          </h3>
          <p class="mt-4 text-neutral-700 text-lg max-w-2xl mx-auto">
            Ferramentas que servem a missão e fortalecem a comunidade de forma divertida!
          </p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div v-fade-in class="text-center group">
            <div class="mx-auto w-20 h-20 bg-gradient-to-br from-accent-400 to-primary-400 rounded-full flex items-center justify-center text-white text-3xl mb-6 group-hover:scale-110 transition-transform shadow-lg">
              ⏰
            </div>
            <h4 class="font-bold text-neutral-800 text-xl mb-3">Mais tempo para pessoas</h4>
            <p class="text-neutral-600">Menos papelada, menos tarefas soltas. Mais tempo para conversar, orar e estar presente com sua célula! 🤗</p>
          </div>
          <div v-fade-in="{ delay: 100 }" class="text-center group">
            <div class="mx-auto w-20 h-20 bg-gradient-to-br from-primary-400 to-vibrant-400 rounded-full flex items-center justify-center text-white text-3xl mb-6 group-hover:scale-110 transition-transform shadow-lg">
              💬
            </div>
            <h4 class="font-bold text-neutral-800 text-xl mb-3">Comunicação clara</h4>
            <p class="text-neutral-600">Lembretes carinhosos e informações sempre no momento certo. Sua célula vai se sentir mais cuidada! 📱</p>
          </div>
          <div v-fade-in="{ delay: 200 }" class="text-center group">
            <div class="mx-auto w-20 h-20 bg-gradient-to-br from-vibrant-400 to-fun-400 rounded-full flex items-center justify-center text-white text-3xl mb-6 group-hover:scale-110 transition-transform shadow-lg">
              🎯
            </div>
            <h4 class="font-bold text-neutral-800 text-xl mb-3">Visão do cuidado</h4>
            <p class="text-neutral-600">Acompanhe o crescimento espiritual, celebre vitórias e ore com propósito pelos seus discípulos! 🙏</p>
          </div>
        </div>
      </div>
    </section>

    <section class="py-8 sm:py-12 bg-gradient-to-br from-primary-50 to-vibrant-50">
      <div class="max-w-4xl mx-auto">
        <div v-fade-in class="bg-white rounded-3xl border border-vibrant-100 p-8 sm:p-12 shadow-xl relative">
          <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-vibrant-400 via-fun-400 to-accent-400"></div>
          <div class="pt-4 border-t border-neutral-100 text-center">
            <p v-fade-in="{ delay: 120 }" class="text-neutral-600 text-sm">
              ✨ Cada líder de célula é um pastor do coração. O Aprisco está aqui para apoiar essa missão linda! 
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="mt-auto bg-gradient-to-r from-vibrant-900 to-vibrant-500 text-white">
      <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <div class="flex items-center justify-center gap-2 mb-4">
            <div class="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">🐑</div>
            <span class="text-xl font-bold">Aprisco</span>
          </div>
          <p class="text-vibrant-100 mb-2">Feito com 💜 para líderes de célula</p>
          <p class="text-sm text-vibrant-200">&copy; {{ new Date().getFullYear() }} Aprisco. Desenvolvido para servir a igreja local.</p>
        </div>
      </div>
    </footer>
  </div>
</template>