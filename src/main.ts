import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import App from './App.vue'
import api from './services/api'
import AppIcon from './components/AppIcon.vue'
import vFadeIn from './directives/fadeInDirective'
import VueApexCharts from 'vue3-apexcharts'
import { useUserStore } from './stores/userStore'

// Verificar se o servidor backend está respondendo (rota correta no backend: /api/health)
api.get('/health')
  .then(() => console.log('✅ API conectada com sucesso'))
  .catch(err => console.warn('⚠️ API offline ou inacessível', err))

function hideMobilePwaSplash(): void {
  const el = document.getElementById('app-splash')
  if (!el) return
  const style = window.getComputedStyle(el)
  if (style.display === 'none') {
    el.remove()
    return
  }
  el.classList.add('app-splash--out')
  const done = () => {
    el.removeEventListener('transitionend', onEnd)
    el.remove()
  }
  const onEnd = (e: TransitionEvent) => {
    if (e.propertyName === 'opacity') done()
  }
  el.addEventListener('transitionend', onEnd)
  window.setTimeout(done, 500)
}

async function bootstrap(): Promise<void> {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  await useUserStore().loadUserFromStorage()
  app.use(router)
  app.use(VueApexCharts)
  app.component('AppIcon', AppIcon)
  app.directive('fade-in', vFadeIn)
  app.mount('#app')

  void router.isReady().then(() => {
    requestAnimationFrame(() => hideMobilePwaSplash())
  })
}

void bootstrap().catch((err) => {
  console.error('[bootstrap] Falha ao iniciar app:', err)
})
