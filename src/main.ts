import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import App from './App.vue'
import api from './services/api'
import AppIcon from './components/AppIcon.vue'
import vFadeIn from './directives/fadeInDirective'

// Verificar se o servidor backend está respondendo
api.get('/health')
  .then(() => console.log('✅ API conectada com sucesso'))
  .catch(err => console.warn('⚠️ API offline ou inacessível', err))

// Iniciar a aplicação
const app = createApp(App)
app.use(createPinia())
app.use(router)
app.component('AppIcon', AppIcon)
app.directive('fade-in', vFadeIn)
app.mount('#app')