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
  if (!el) return
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
}
</script>

<template>
  <div
    class="min-h-[100svh] sm:min-h-screen flex flex-col bg-gradient-to-b from-vibrant-50 via-fun-50/70 to-accent-50 font-body text-neutral-800 antialiased selection:bg-vibrant-200/80 selection:text-vibrant-900"
  >
    <!-- Header -->
    <header class="bg-white/95 backdrop-blur-md fixed w-full z-50 border-b border-vibrant-100 shadow-soft">
      <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Principal">
        <div class="flex justify-between min-h-16 py-2 items-center gap-3">
          <div class="flex items-center gap-3">
            <BrandLogo variant="full" class="h-10 w-auto hidden sm:block" />
            <BrandLogo variant="icon" class="h-8 w-auto sm:hidden" />
          </div>
          <div class="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
            <button
              @click="() => scrollToId('sobre')"
              class="hidden sm:inline-flex text-sm text-neutral-600 hover:text-vibrant-700 px-3.5 py-2 rounded-xl hover:bg-fun-50 transition-colors duration-200 cursor-pointer font-semibold"
            >Sobre</button>
            <button
              @click="() => scrollToId('funcionalidades')"
              class="hidden sm:inline-flex text-sm text-neutral-600 hover:text-vibrant-700 px-3.5 py-2 rounded-xl hover:bg-fun-50 transition-colors duration-200 cursor-pointer font-semibold"
            >Funcionalidades</button>
            <button
              @click="() => scrollToId('beneficios')"
              class="hidden sm:inline-flex text-sm text-neutral-600 hover:text-vibrant-700 px-3.5 py-2 rounded-xl hover:bg-fun-50 transition-colors duration-200 cursor-pointer font-semibold"
            >Benefícios</button>
            <button
              @click="goToApp"
              class="px-4 py-2.5 sm:ml-1 bg-vibrant-600 text-white rounded-xl hover:bg-vibrant-700 transition-colors duration-200 cursor-pointer text-sm font-bold shadow-md shadow-vibrant-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vibrant-500"
            >{{ userStore.isLoggedIn ? 'Acessar Sistema' : 'Entrar' }}</button>
          </div>
        </div>
      </nav>
    </header>

    <!-- Hero -->
    <section class="relative overflow-hidden border-b border-vibrant-100/60">
      <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div class="absolute -top-20 right-[-8%] h-[26rem] w-[26rem] rounded-full bg-vibrant-200/35 blur-3xl" />
        <div class="absolute top-40 -left-24 h-64 w-64 rounded-full bg-fun-200/50 blur-3xl" />
        <div class="absolute bottom-8 right-1/4 h-48 w-48 rounded-full bg-accent-200/40 blur-2xl" />
      </div>

      <div class="relative pt-28 pb-20 sm:pt-36 sm:pb-24 px-4 sm:px-6 lg:px-8">
        <div class="max-w-3xl mx-auto text-center">
          <div
            v-fade-in
            class="inline-flex items-center gap-2.5 px-4 py-2 mb-8 rounded-full bg-white/90 border border-fun-200 shadow-sm"
          >
            <span class="flex h-2 w-2 rounded-full bg-fun-400 ring-4 ring-fun-100 shrink-0" aria-hidden="true" />
            <span class="text-sm font-bold text-vibrant-800">Sistema para gestão de células</span>
          </div>

          <h1
            v-fade-in="{ delay: 80 }"
            class="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-vibrant-700 via-vibrant-600 to-accent-600 bg-clip-text text-transparent leading-[1.1]"
          >
            Fortaleça o cuidado<br class="hidden sm:block" /> da sua célula
          </h1>

          <p
            v-fade-in="{ delay: 140 }"
            class="mt-8 max-w-2xl mx-auto text-neutral-600 text-lg sm:text-xl leading-relaxed"
          >
            <span class="font-bold text-vibrant-700">Aprisco</span> é o sistema que líderes de célula usam para organizar encontros,
            acompanhar discípulos e fortalecer a comunhão.
          </p>

          <div
            v-fade-in="{ delay: 220 }"
            class="mt-12 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 max-w-lg sm:max-w-none mx-auto"
          >
            <button
              @click="goToApp"
              class="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-vibrant-600 to-vibrant-700 text-white text-lg font-bold shadow-lg shadow-vibrant-500/25 hover:from-vibrant-700 hover:to-vibrant-800 transition-all duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vibrant-500"
            >
              {{ userStore.isLoggedIn ? 'Acessar o Sistema' : 'Entrar no Sistema' }}
            </button>
            <button
              @click="() => scrollToId('sobre')"
              class="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-vibrant-700 border-2 border-vibrant-200 text-lg font-bold hover:bg-vibrant-50 hover:border-vibrant-300 transition-colors duration-200 cursor-pointer shadow-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vibrant-400"
            >
              Saiba mais
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Sobre o Aprisco -->
    <section id="sobre" class="scroll-mt-[5.5rem] py-18 sm:py-24 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <p class="text-sm font-bold text-accent-600 mb-2">Sobre</p>
            <h2 v-fade-in class="font-display text-3xl sm:text-4xl font-bold text-neutral-800 tracking-tight">
              Sobre o Aprisco
            </h2>
            <p v-fade-in="{ delay: 80 }" class="mt-6 text-neutral-600 text-lg leading-relaxed">
              Aprisco foi criado especialmente para <span class="font-bold text-vibrant-700">líderes de célula</span> que querem
              cuidar melhor dos seus discípulos, com organização simples e eficiente.
            </p>
            <p v-fade-in="{ delay: 140 }" class="mt-4 text-neutral-600 text-lg leading-relaxed">
              Um sistema pensado para a realidade da sua igreja: registro de presença,
              acompanhamento de membros, relatórios e lembretes, tudo em um só lugar.
            </p>
            <div
              v-fade-in="{ delay: 180 }"
              class="mt-8 inline-flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-fun-50 border border-fun-200 text-vibrant-800 text-sm font-bold"
            >
              <svg class="w-5 h-5 text-vibrant-500 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              Feito com amor para células de igreja
            </div>
          </div>

          <div v-fade-in class="relative">
            <div
              class="rounded-3xl p-8 sm:p-10 bg-gradient-to-br from-vibrant-50 via-fun-50 to-accent-50 border-2 border-vibrant-100 shadow-card"
            >
              <div class="flex flex-col items-center text-center">
                <div
                  class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-vibrant-500 shadow-soft mb-5"
                >
                  <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                </div>
                <p v-fade-in="{ delay: 80 }" class="text-neutral-600 leading-relaxed text-lg italic max-w-md">
                  Com o Aprisco, cada encontro de célula e cada pessoa são lembrados
                  com carinho, listas de presença, aniversários, diário do discípulo,
                  um espaço para celebrar o que Deus está fazendo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Funcionalidades -->
    <section id="funcionalidades" class="scroll-mt-[5.5rem] py-18 sm:py-24 bg-gradient-to-b from-primary-50/80 via-vibrant-50/50 to-fun-50/40 border-y border-vibrant-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-14 sm:mb-16" v-fade-in>
          <p class="text-sm font-bold text-vibrant-600 mb-2">Funcionalidades</p>
          <h2 class="font-display text-3xl sm:text-4xl font-bold text-neutral-800 tracking-tight">
            Funcionalidades
          </h2>
          <p class="mt-4 text-neutral-600 text-lg leading-relaxed">
            Tudo que um <span class="font-bold text-vibrant-700">líder de célula</span> precisa, na palma da mão.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-fade-in
            class="group bg-white rounded-2xl p-7 border-2 border-fun-100 shadow-card hover:border-fun-300 hover:shadow-hover transition-all duration-300 cursor-default"
          >
            <div class="h-14 w-14 rounded-2xl bg-gradient-to-br from-fun-300 to-accent-400 text-white flex items-center justify-center mb-4 shadow-md">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <h3 class="font-display font-bold text-neutral-800 text-lg mb-2">Lembrete de aniversários</h3>
            <p class="text-neutral-600 leading-relaxed">Nunca mais esqueça o aniversário de alguém da célula. Receba os lembretes no seu WhatsApp.</p>
          </div>

          <div
            v-fade-in="{ delay: 80 }"
            class="group bg-white rounded-2xl p-7 border-2 border-vibrant-100 shadow-card hover:border-vibrant-300 hover:shadow-hover transition-all duration-300 cursor-default"
          >
            <div class="h-14 w-14 rounded-2xl bg-gradient-to-br from-vibrant-400 to-fun-400 text-white flex items-center justify-center mb-4 shadow-md">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <h3 class="font-display font-bold text-neutral-800 text-lg mb-2">Acompanhamento de membros</h3>
            <p class="text-neutral-600 leading-relaxed">Cuide de cada discípulo: registre visitas, acompanhe necessidades e celebre vitórias.</p>
          </div>

          <div
            v-fade-in="{ delay: 160 }"
            class="group bg-white rounded-2xl p-7 border-2 border-primary-100 shadow-card hover:border-primary-300 hover:shadow-hover transition-all duration-300 cursor-default"
          >
            <div class="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary-400 to-vibrant-400 text-white flex items-center justify-center mb-4 shadow-md">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
            <h3 class="font-display font-bold text-neutral-800 text-lg mb-2">Relatórios simples</h3>
            <p class="text-neutral-600 leading-relaxed">Relatórios de presença e crescimento prontos para compartilhar com a liderança.</p>
          </div>

          <div
            v-fade-in
            class="group bg-white rounded-2xl p-7 border-2 border-accent-100 shadow-card hover:border-accent-300 hover:shadow-hover transition-all duration-300 cursor-default"
          >
            <div class="h-14 w-14 rounded-2xl bg-gradient-to-br from-accent-400 to-vibrant-400 text-white flex items-center justify-center mb-4 shadow-md">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
              </svg>
            </div>
            <h3 class="font-display font-bold text-neutral-800 text-lg mb-2">Notificações e lembretes</h3>
            <p class="text-neutral-600 leading-relaxed">Receba no WhatsApp os compromissos e prazos de relatório sempre em dia.</p>
          </div>

          <div
            v-fade-in="{ delay: 80 }"
            class="group bg-white rounded-2xl p-7 border-2 border-accent-100 shadow-card hover:border-accent-300 hover:shadow-hover transition-all duration-300 cursor-default"
          >
            <div class="h-14 w-14 rounded-2xl bg-gradient-to-br from-accent-400 to-primary-400 text-white flex items-center justify-center mb-4 shadow-md">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 class="font-display font-bold text-neutral-800 text-lg mb-2">Controle de presença</h3>
            <p class="text-neutral-600 leading-relaxed">Acompanhe quem vai ao culto e à célula com facilidade e visão rápida da assiduidade.</p>
          </div>

          <div
            v-fade-in="{ delay: 160 }"
            class="group bg-white rounded-2xl p-7 border-2 border-vibrant-100 shadow-card hover:border-vibrant-300 hover:shadow-hover transition-all duration-300 cursor-default"
          >
            <div class="h-14 w-14 rounded-2xl bg-gradient-to-br from-vibrant-400 to-accent-400 text-white flex items-center justify-center mb-4 shadow-md">
              <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
              </svg>
            </div>
            <h3 class="font-display font-bold text-neutral-800 text-lg mb-2">Motivação ao cuidado</h3>
            <p class="text-neutral-600 leading-relaxed">Medalhas e indicadores que motivam constância, oração e acompanhamento amoroso.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Benefícios para o líder -->
    <section id="beneficios" class="scroll-mt-[5.5rem] py-18 sm:py-24 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-14 max-w-2xl mx-auto" v-fade-in>
          <p class="text-sm font-bold text-fun-700 mb-2">Benefícios</p>
          <h2 class="font-display text-3xl sm:text-4xl font-bold text-neutral-800 tracking-tight">
            Por que líderes de célula amam o Aprisco?
          </h2>
          <p class="mt-4 text-neutral-600 text-lg leading-relaxed">
            Ferramentas que servem a missão e fortalecem a comunidade.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div v-fade-in class="text-center group rounded-3xl p-8 bg-gradient-to-b from-vibrant-50/80 to-white border-2 border-vibrant-100 hover:border-vibrant-200 transition-colors duration-300">
            <div
              class="mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-accent-300 to-primary-400 flex items-center justify-center text-white mb-6 shadow-lg shadow-accent-500/20 group-hover:scale-105 transition-transform duration-300"
            >
              <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </div>
            <h3 class="font-display font-bold text-neutral-800 text-xl mb-3">Mais tempo para pessoas</h3>
            <p class="text-neutral-600 leading-relaxed">Menos papelada, menos tarefas soltas. Mais tempo para conversar, orar e estar presente com sua célula.</p>
          </div>

          <div
            v-fade-in="{ delay: 100 }"
            class="text-center group rounded-3xl p-8 bg-gradient-to-b from-fun-50/90 to-white border-2 border-fun-200 hover:border-fun-300 transition-colors duration-300"
          >
            <div
              class="mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-vibrant-400 to-primary-500 flex items-center justify-center text-white mb-6 shadow-lg shadow-vibrant-500/25 group-hover:scale-105 transition-transform duration-300"
            >
              <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            <h3 class="font-display font-bold text-neutral-800 text-xl mb-3">Comunicação clara</h3>
            <p class="text-neutral-600 leading-relaxed">Lembretes carinhosos e informações sempre no momento certo. Sua célula vai se sentir mais cuidada.</p>
          </div>

          <div
            v-fade-in="{ delay: 200 }"
            class="text-center group rounded-3xl p-8 bg-gradient-to-b from-accent-50/80 to-white border-2 border-accent-100 hover:border-accent-200 transition-colors duration-300"
          >
            <div
              class="mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-vibrant-400 to-fun-400 flex items-center justify-center text-white mb-6 shadow-lg shadow-fun-500/20 group-hover:scale-105 transition-transform duration-300"
            >
              <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            </div>
            <h3 class="font-display font-bold text-neutral-800 text-xl mb-3">Visão do cuidado</h3>
            <p class="text-neutral-600 leading-relaxed">Acompanhe o crescimento espiritual, celebre vitórias e ore com propósito pelos seus discípulos.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Final -->
    <section class="py-18 sm:py-24 bg-gradient-to-br from-vibrant-100/60 via-fun-100/50 to-accent-100/40">
      <div class="max-w-3xl mx-auto px-4">
        <div
          v-fade-in
          class="bg-white rounded-3xl border-2 border-vibrant-100 p-8 sm:p-12 shadow-hover relative overflow-hidden text-center"
        >
          <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-vibrant-400 via-fun-400 to-accent-400 rounded-t-3xl" />

          <div class="w-20 h-20 mx-auto mb-6 mt-1 rounded-2xl bg-gradient-to-br from-vibrant-100 to-fun-100 flex items-center justify-center border border-vibrant-100">
            <svg class="w-9 h-9 text-vibrant-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>

          <h2 class="font-display text-2xl sm:text-3xl font-bold text-neutral-800 mb-4">
            Pronto para cuidar melhor da sua célula?
          </h2>
          <p class="text-neutral-600 text-lg mb-10 leading-relaxed max-w-xl mx-auto">
            Cada líder de célula é um pastor do coração. O Aprisco está aqui para apoiar essa missão.
          </p>

          <button
            @click="goToApp"
            class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-vibrant-600 to-vibrant-700 text-white text-lg font-bold hover:from-vibrant-700 hover:to-vibrant-800 transition-all duration-200 shadow-lg shadow-vibrant-500/25 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vibrant-500"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            {{ userStore.isLoggedIn ? 'Acessar o Sistema' : 'Entrar no Sistema' }}
          </button>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="mt-auto bg-gradient-to-r from-vibrant-900 to-vibrant-700 text-white">
      <div class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div class="text-center">
          <div class="flex items-center justify-center gap-3 mb-4">
            <BrandLogo variant="icon" class="h-9 w-auto brightness-0 invert opacity-95" />
            <span class="text-2xl font-bold font-display tracking-wide">Aprisco</span>
          </div>
          <p class="text-vibrant-100 mb-2 text-base font-semibold">Feito com carinho para líderes de célula</p>
          <p class="text-sm text-vibrant-200/90">&copy; {{ new Date().getFullYear() }} Aprisco. Desenvolvido para servir a igreja local.</p>
        </div>
      </div>
    </footer>

    <!-- Balão WhatsApp, teste grátis (href estático: evita href vazio se a URL não existir no script) -->
    <div
      class="fixed z-[60] right-4 sm:right-6 w-[min(19rem,calc(100vw-2rem))]"
      style="bottom: max(1.25rem, env(safe-area-inset-bottom, 0px))"
    >
      <a
        href="https://wa.me/5555999067484?text=Ol%C3%A1!%20Vim%20pelo%20site%20do%20Aprisco%20e%20gostaria%20de%20falar%20conosco%20sobre%20o%20teste%20gr%C3%A1tis."
        target="_blank"
        rel="noopener noreferrer"
        class="group flex items-stretch gap-0 rounded-2xl shadow-lg shadow-neutral-900/15 border border-vibrant-100/80 bg-white/95 backdrop-blur-sm overflow-hidden hover:border-[#25D366]/40 hover:shadow-xl transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
        aria-label="Conversar conosco no WhatsApp sobre teste grátis"
      >
        <div class="flex shrink-0 items-center justify-center w-14 bg-[#25D366] text-white">
          <svg class="w-8 h-8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
            />
          </svg>
        </div>
        <div class="flex flex-col justify-center py-3 pr-4 pl-3 min-w-0">
          <p class="text-sm font-bold text-neutral-800 leading-tight">Teste grátis</p>
          <p class="text-xs text-neutral-500 mt-0.5 leading-snug">Fale conosco no WhatsApp</p>
        </div>
      </a>
    </div>
  </div>
</template>
