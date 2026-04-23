import type { Directive, DirectiveBinding } from 'vue'

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

function cleanup(el: HTMLElement) {
  const obs = (el as HTMLElement & { __fadeObserver?: IntersectionObserver }).__fadeObserver
  if (obs) {
    obs.disconnect()
    delete (el as HTMLElement & { __fadeObserver?: IntersectionObserver }).__fadeObserver
  }
}

export const vFadeIn: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduce) {
      el.style.opacity = '1'
      el.style.transform = 'none'
      return
    }

    const delay = binding.value?.delay ?? 0
    const duration = binding.value?.duration ?? 560
    const threshold = binding.value?.threshold ?? 0.12
    const translateY = binding.value?.translateY ?? 22

    el.style.opacity = '0'
    el.style.transform = `translate3d(0, ${translateY}px, 0)`
    el.style.willChange = 'opacity, transform'
    el.style.transition = `opacity ${duration}ms ${EASE}, transform ${duration}ms ${EASE}`

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          window.setTimeout(() => {
            el.style.opacity = '1'
            el.style.transform = 'translate3d(0, 0, 0)'
            window.setTimeout(() => {
              el.style.willChange = 'auto'
            }, duration + delay)
          }, delay)
          observer.disconnect()
          delete (el as HTMLElement & { __fadeObserver?: IntersectionObserver }).__fadeObserver
        })
      },
      {
        threshold,
        rootMargin: binding.value?.rootMargin ?? '0px 0px -6% 0px',
      }
    )

    ;(el as HTMLElement & { __fadeObserver?: IntersectionObserver }).__fadeObserver = observer
    observer.observe(el)
  },

  unmounted(el: HTMLElement) {
    cleanup(el)
  },
}

export default vFadeIn
