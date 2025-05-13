import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface UserProfile {
  id: number
  nome: string
  email?: string
  whatsapp?: string
  cargo: string
  ativo: boolean
}

export const useUserStore = defineStore('user', () => {
  // Estado
  const user = ref<UserProfile | null>(null)
  const isLoggedIn = ref(false)

  // Getters
  const isAdmin = computed(() => 
    user.value?.cargo === 'ADMINISTRADOR' || user.value?.cargo === 'PASTOR'
  )
  
  const isSupervisor = computed(() => 
    user.value?.cargo === 'SUPERVISOR'
  )
  
  const isLeader = computed(() => 
    user.value?.cargo === 'LIDER'
  )
  
  const userRole = computed(() => user.value?.cargo || '')
  
  const userName = computed(() => user.value?.nome || '')

  // Actions
  function setUser(userData: UserProfile | null) {
    user.value = userData
    isLoggedIn.value = !!userData
    
    // Salvar dados na localStorage para persistência
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData))
    } else {
      localStorage.removeItem('user')
    }
  }
  
  function loadUser() {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser)
        setUser(userData)
      } catch (e) {
        console.error('Erro ao carregar dados do usuário:', e)
        clearUser()
      }
    }
  }
  
  function clearUser() {
    user.value = null
    isLoggedIn.value = false
    localStorage.removeItem('user')
  }

  // Carregar automaticamente o usuário do localStorage
  loadUser()

  return {
    user,
    isLoggedIn,
    isAdmin,
    isSupervisor,
    isLeader,
    userRole,
    userName,
    setUser,
    loadUser,
    clearUser
  }
}) 