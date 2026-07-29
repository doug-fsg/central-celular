import {
  createWebHashHistory,
  createWebHistory,
  type RouterHistory,
} from 'vue-router'

/** Hash no Capacitor (sem fallback server); history no browser/PWA. */
export function createRouterHistory(): RouterHistory {
  if (import.meta.env.VITE_CAPACITOR === 'true') {
    return createWebHashHistory()
  }
  return createWebHistory()
}
