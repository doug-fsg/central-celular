import { onUnmounted, watch, type WatchSource } from 'vue'

export function useDebouncedWatch(
  source: WatchSource<string>,
  callback: () => void,
  delayMs = 300,
) {
  let timer: ReturnType<typeof setTimeout> | null = null

  watch(source, () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      callback()
    }, delayMs)
  })

  onUnmounted(() => {
    if (timer) clearTimeout(timer)
  })
}
