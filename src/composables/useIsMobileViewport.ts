import { ref, onMounted, onUnmounted } from 'vue'

const MOBILE_MAX_WIDTH = 639

function getIsMobileViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches
}

const isMobileViewport = ref(getIsMobileViewport())

let listenerCount = 0
let mediaQuery: MediaQueryList | null = null

function onViewportChange(event: MediaQueryListEvent) {
  isMobileViewport.value = event.matches
}

function subscribe() {
  if (typeof window === 'undefined') return
  if (listenerCount === 0) {
    mediaQuery = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`)
    isMobileViewport.value = mediaQuery.matches
    mediaQuery.addEventListener('change', onViewportChange)
  }
  listenerCount += 1
}

function unsubscribe() {
  listenerCount -= 1
  if (listenerCount === 0 && mediaQuery) {
    mediaQuery.removeEventListener('change', onViewportChange)
    mediaQuery = null
  }
}

export function useIsMobileViewport() {
  onMounted(subscribe)
  onUnmounted(unsubscribe)

  return { isMobileViewport }
}
