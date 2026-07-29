import { computed } from 'vue'
import {
  getPlatform,
  isIos,
  isMobileShell,
  isNativeApp,
  type AppPlatform,
} from '../utils/platform'

export function usePlatform() {
  const native = computed(() => isNativeApp())
  const mobileShell = computed(() => isMobileShell())
  const platform = computed<AppPlatform>(() => getPlatform())
  const ios = computed(() => isIos())

  return { native, mobileShell, platform, ios }
}
