import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUserStore } from './userStore'
import celulaService, { Membro, NovoMembroInput } from '../services/celulaService'

export interface Member {
  id: string
  name: string
  email?: string
  telefone?: string
  isConsolidator: boolean
  isCoLeader: boolean
}

export const useMemberStore = defineStore('members', () => {
  const userStore = useUserStore()
  const members = ref<Member[]>([])
  const celulaId = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Get all members
  const getAllMembers = computed(() => members.value)
  
  // Get consolidators
  const getConsolidators = computed(() => 
    members.value.filter((member: Member) => member.isConsolidator)
  )
  
  // Get co-leaders
  const getCoLeaders = computed(() => 
    members.value.filter((member: Member) => member.isCoLeader)
  )

  // Carregar membros da célula do líder atual
  async function carregarMembros() {
    // Verifica se o usuário está logado
    if (!userStore.isLoggedIn || !userStore.user?.id) {
      error.value = 'Usuário não está logado'
      return
    }

    // Verificar se o usuário é líder (verificando em maiúsculo e minúsculo)
    const cargoUpperCase = userStore.user.cargo.toUpperCase()
    const isLider = cargoUpperCase === 'LIDER' || cargoUpperCase === 'LÍDER'
    
    if (!isLider) {
      error.value = `Usuário não é líder (cargo atual: ${userStore.user.cargo})`
      console.log('Cargo do usuário:', userStore.user.cargo)
      return
    }

    loading.value = true
    error.value = null

    try {
      // Buscar células do líder atual
      const celulas = await celulaService.listarCelulas({ 
        lider: userStore.user.id,
        ativo: true 
      })

      if (celulas.length === 0) {
        error.value = 'Líder não possui células ativas'
        members.value = []
        return
      }

      // Usar a primeira célula encontrada
      const celula = celulas[0]
      celulaId.value = celula.id

      // Buscar detalhes da célula (incluindo membros)
      const celulaDetalhes = await celulaService.obterCelula(celula.id)

      // Transformar os membros da célula para o formato usado pelo store
      members.value = celulaDetalhes.membros
        .filter(membro => membro.ativo)
        .map(membro => ({
          id: membro.id.toString(),
          name: membro.nome,
          email: membro.email,
          telefone: membro.telefone,
          isConsolidator: membro.ehConsolidador,
          isCoLeader: false // Agora o co-líder é um usuário separado, não um membro
        }))
    } catch (err) {
      console.error('Erro ao carregar membros:', err)
      error.value = 'Falha ao carregar membros da célula'
    } finally {
      loading.value = false
    }
  }
  
  // Adicionar um novo membro
  async function addMember(memberData: Omit<Member, 'id'>) {
    if (!celulaId.value) {
      error.value = 'Célula não selecionada'
      console.error('Erro: tentativa de adicionar membro sem uma célula selecionada')
      return
    }

    loading.value = true
    error.value = null

    try {
      // Converter do formato da interface Member para NovoMembroInput
      const dadosMembro: NovoMembroInput = {
        nome: memberData.name,
        email: memberData.email,
        telefone: memberData.telefone,
        ehConsolidador: memberData.isConsolidator,
        observacoes: ''
      }
      
      // Adicionar membro via serviço
      const novoMembro = await celulaService.adicionarMembro(celulaId.value, dadosMembro)
      
      // Adicionar à store local
      members.value.push({
        id: novoMembro.id.toString(),
        name: novoMembro.nome,
        email: novoMembro.email,
        telefone: novoMembro.telefone,
        isConsolidator: novoMembro.ehConsolidador,
        isCoLeader: false
      })
      
      return novoMembro.id.toString()
    } catch (err) {
      console.error('Erro ao adicionar membro:', err)
      error.value = 'Falha ao adicionar membro'
    } finally {
      loading.value = false
    }
  }
  
  // Remover um membro
  async function deleteMember(id: string) {
    if (!celulaId.value) {
      error.value = 'Célula não selecionada'
      return
    }

    loading.value = true
    error.value = null

    try {
      // Chamar o serviço para remover o membro
      await celulaService.removerMembro(celulaId.value, parseInt(id))
      
      // Remover membro localmente da store
      members.value = members.value.filter((member: Member) => member.id !== id)
    } catch (err) {
      console.error('Erro ao remover membro:', err)
      error.value = 'Falha ao remover membro'
    } finally {
      loading.value = false
    }
  }
  
  // Atualizar status de um membro (consolidador)
  async function updateMember(id: string, updates: Partial<Omit<Member, 'id'>>) {
    if (!celulaId.value) {
      error.value = 'Célula não selecionada'
      return
    }

    try {
      if ('isConsolidator' in updates) {
        await celulaService.marcarComoConsolidador(
          celulaId.value,
          parseInt(id),
          !!updates.isConsolidator
        )
      }

      // Atualizar localmente
      const index = members.value.findIndex((member: Member) => member.id === id)
      if (index !== -1) {
        members.value[index] = { ...members.value[index], ...updates }
      }
    } catch (err) {
      console.error('Erro ao atualizar membro:', err)
      error.value = 'Falha ao atualizar membro'
    }
  }

  // Carregar dados iniciais
  function init() {
    if (userStore.isLoggedIn) {
      carregarMembros()
    }
  }

  // Inicializar quando o store for criado
  init()

  return {
    members,
    celulaId,
    loading,
    error,
    getAllMembers,
    getConsolidators,
    getCoLeaders,
    carregarMembros,
    updateMember,
    addMember,
    deleteMember
  }
})