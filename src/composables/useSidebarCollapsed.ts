import { ref, watch } from 'vue'

const STORAGE_KEY = 'app-sidebar-collapsed'

function readStoredCollapsed(): boolean {
  if (typeof localStorage === 'undefined') return true
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === null) return true
  return stored === 'true'
}

const collapsed = ref(readStoredCollapsed())

watch(collapsed, (value) => {
  localStorage.setItem(STORAGE_KEY, String(value))
})

export function useSidebarCollapsed() {
  function toggleCollapsed() {
    collapsed.value = !collapsed.value
  }

  function setCollapsed(value: boolean) {
    collapsed.value = value
  }

  return {
    collapsed,
    toggleCollapsed,
    setCollapsed,
  }
}
