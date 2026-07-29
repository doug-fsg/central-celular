import type { IconName } from '../components/AppIcon.vue'

export type BottomNavItem = {
  name: string
  label: string
  icon: IconName
}

/** Admin mobile: 3 atalhos na barra + restante em “Mais”. */
export function splitBottomNavItems(
  items: BottomNavItem[],
  options: { overflowMode?: boolean; maxPrimary?: number } = {}
): { primary: BottomNavItem[]; more: BottomNavItem[] } {
  const { overflowMode = false, maxPrimary = 3 } = options

  if (!overflowMode || items.length <= maxPrimary) {
    return { primary: items, more: [] }
  }

  return {
    primary: items.slice(0, maxPrimary),
    more: items.slice(maxPrimary),
  }
}

export function isMoreNavActive(
  moreItems: BottomNavItem[],
  currentRouteName: string | symbol | null | undefined
): boolean {
  if (currentRouteName == null) return false
  return moreItems.some((item) => item.name === currentRouteName)
}
