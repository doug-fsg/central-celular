import type { Directive, DirectiveBinding } from 'vue'

export const vFadeIn: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    // Inicialmente define a opacidade como 0 e transforma o elemento
    el.style.opacity = '0'
    el.style.transform = 'translateY(20px)'
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease'
    
    // Configuração opcional
    const delay = binding.value?.delay || 0
    const duration = binding.value?.duration || 500
    const threshold = binding.value?.threshold || 0.1
    
    // Atualiza a transição se a duração for customizada
    if (binding.value?.duration) {
      el.style.transition = `opacity ${duration / 1000}s ease, transform ${duration / 1000}s ease`
    }
    
    // Cria um observador de interseção para detectar quando o elemento está visível
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // Adiciona um pequeno delay se especificado
          setTimeout(() => {
            el.style.opacity = '1'
            el.style.transform = 'translateY(0)'
          }, delay)
          
          // Desconecta o observador após a animação
          observer.disconnect()
        }
      })
    }, { threshold })
    
    observer.observe(el)
  }
}

export default vFadeIn 