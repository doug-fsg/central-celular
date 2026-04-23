import { defineStore } from 'pinia'
import { ref, nextTick } from 'vue'

/**
 * Loading em tela cheia durante troca de rota (lazy chunks + guards).
 * A primeira carga direta na LP (`home`) não exibe overlay — ver router.
 */
export const useNavigationLoadingStore = defineStore('navigationLoading', () => {
  const isLoading = ref(false)

  function start() {
    isLoading.value = true
  }

  async function finish() {
    await nextTick()
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve())
      })
    })
    isLoading.value = false
  }

  return { isLoading, start, finish }
})
