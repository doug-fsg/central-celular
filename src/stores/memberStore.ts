import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useUserStore } from './userStore'
import celulaService, { Membro, NovoMembroInput } from '../services/celulaService'

export interface Member {
  id: string
  name: string
  telefone?: string
  dataNascimento?: string
  isConsolidator: boolean
  isCoLeader: boolean
  isHost: boolean
  isActive: boolean
}

export const useMemberStore = defineStore('members', () => {
  const userStore = useUserStore()
  const members = ref<Member[]>([])
  const celulaId = ref<number | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Get all members (ordered by active status)
  const getAllMembers = computed(() => {
    return [...members.value].sort((a, b) => {
      // Ordenar por status (ativos primeiro)
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      // Se ambos têm o mesmo status, ordenar por nome
      return a.name.localeCompare(b.name);
    });
  })
  
  // Get only active members
  const getActiveMembers = computed(() => 
    members.value.filter((member: Member) => member.isActive)
    .sort((a, b) => a.name.localeCompare(b.name))
  )
  
  // Get inactive members
  const getInactiveMembers = computed(() => 
    members.value.filter((member: Member) => !member.isActive)
    .sort((a, b) => a.name.localeCompare(b.name))
  )
  
  // Get consolidators (only active)
  const getConsolidators = computed(() => 
    getActiveMembers.value.filter(member => member.isConsolidator)
  )
  
  // Get co-leaders (only active)
  const getCoLeaders = computed(() => 
    getActiveMembers.value.filter(member => member.isCoLeader)
  )

  // Get hosts (only active)
  const getHosts = computed(() => 
    getActiveMembers.value.filter(member => member.isHost)
  )

  // Carregar membros da célula do líder atual
  async function carregarMembros() {
    // Verifica se o usuário está logado
    if (!userStore.isLoggedIn || !userStore.user) {
      error.value = 'Usuário não está logado';
      console.log('Erro: usuário não está logado');
      return;
    }

    // Verificar se o usuário tem ID
    if (!userStore.user.id) {
      error.value = 'ID do usuário não encontrado';
      console.log('Erro: ID do usuário não encontrado');
      return;
    }

    // Verificar se o usuário é líder (verificando em maiúsculo e minúsculo)
    const cargoUpperCase = userStore.user.cargo?.toUpperCase() || '';
    const isLider = cargoUpperCase === 'LIDER' || cargoUpperCase === 'LÍDER';
    
    if (!isLider) {
      error.value = `Usuário não é líder (cargo atual: ${userStore.user.cargo})`;
      console.log('Erro: usuário não é líder:', userStore.user.cargo);
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      console.log('Buscando células do líder:', userStore.user.id);
      
      // Buscar células do líder atual
      const response = await celulaService.listarCelulas({ 
        lider: userStore.user.id,
        ativo: true 
      });

      if (!response || !response.celulas || response.celulas.length === 0) {
        error.value = 'Líder não possui células ativas';
        members.value = [];
        return;
      }

      // Usar a primeira célula encontrada
      const celula = response.celulas[0];
      celulaId.value = celula.id;

      // Buscar detalhes da célula (incluindo membros)
      const celulaDetalhes = await celulaService.obterCelula(celula.id);

      if (!celulaDetalhes || !celulaDetalhes.membros) {
        error.value = 'Erro ao carregar detalhes da célula';
        members.value = [];
        return;
      }

      console.log('[memberStore] Membros recebidos do backend:', celulaDetalhes.membros);

      // Transformar os membros da célula para o formato usado pelo store
      members.value = celulaDetalhes.membros
        .map(membro => {
          console.log('[memberStore] Processando membro:', membro.nome);
          console.log('[memberStore] Data de nascimento:', {
            valor: membro.dataNascimento,
            tipo: typeof membro.dataNascimento
          });

          return {
            id: membro.id.toString(),
            name: membro.nome,
            telefone: membro.telefone,
            dataNascimento: membro.dataNascimento,
            isConsolidator: membro.ehConsolidador,
            isCoLeader: membro.ehCoLider,
            isHost: membro.ehAnfitriao,
            isActive: membro.ativo
          };
        });

      console.log('[memberStore] Membros transformados:', members.value);
    } catch (err) {
      console.error('Erro ao carregar membros:', err);
      error.value = 'Falha ao carregar membros da célula';
      members.value = [];
    } finally {
      loading.value = false;
    }
  }
  
  // Adicionar um novo membro
  async function addMember(memberData: Omit<Member, 'id'>) {
    if (!celulaId.value) {
      error.value = 'Célula não selecionada'
      console.error('Erro: tentativa de adicionar membro sem uma célula selecionada')
      return
    }

    console.log('[memberStore] Adicionando membro com dados:', memberData);
    console.log('[memberStore] Data de nascimento recebida:', {
      valor: memberData.dataNascimento,
      tipo: memberData.dataNascimento ? typeof memberData.dataNascimento : 'null/undefined'
    });

    loading.value = true
    error.value = null

    try {
      // Converter do formato da interface Member para NovoMembroInput
      const dadosMembro: NovoMembroInput = {
        nome: memberData.name,
        telefone: memberData.telefone,
        dataNascimento: memberData.dataNascimento,
        ehConsolidador: memberData.isConsolidator,
        ehCoLider: memberData.isCoLeader,
        ehAnfitriao: memberData.isHost,
        observacoes: ''
      }
      
      console.log('[memberStore] Dados convertidos para envio:', dadosMembro);
      console.log('[memberStore] Data de nascimento para envio:', {
        valor: dadosMembro.dataNascimento,
        tipo: dadosMembro.dataNascimento ? typeof dadosMembro.dataNascimento : 'null/undefined'
      });
      
      // Adicionar membro via serviço
      const novoMembro = await celulaService.adicionarMembro(celulaId.value, dadosMembro)
      
      // Adicionar à store local
      members.value.push({
        id: novoMembro.id.toString(),
        name: novoMembro.nome,
        telefone: novoMembro.telefone,
        dataNascimento: novoMembro.dataNascimento,
        isConsolidator: novoMembro.ehConsolidador,
        isCoLeader: novoMembro.ehCoLider,
        isHost: novoMembro.ehAnfitriao,
        isActive: novoMembro.ativo
      })
      
      return novoMembro.id.toString()
    } catch (err) {
      console.error('Erro ao adicionar membro:', err)
      error.value = 'Falha ao adicionar membro'
    } finally {
      loading.value = false
    }
  }
  
  // Remover um membro (agora realmente deleta)
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
  
  // Atualizar dados de um membro
  async function updateMember(id: string, updates: Partial<Omit<Member, 'id'>>) {
    if (!celulaId.value) {
      error.value = 'Célula não selecionada'
      return
    }

    if (!updates.name) {
      error.value = 'Nome é obrigatório'
      return
    }

    loading.value = true
    error.value = null

    try {
      // Converter do formato da interface Member para NovoMembroInput
      const dadosMembro: NovoMembroInput = {
        nome: updates.name,
        telefone: updates.telefone,
        dataNascimento: updates.dataNascimento,
        ehConsolidador: updates.isConsolidator,
        ehCoLider: updates.isCoLeader,
        ehAnfitriao: updates.isHost,
        observacoes: ''
      }

      console.log('[memberStore] Atualizando membro:', id);
      console.log('[memberStore] Dados para atualização:', dadosMembro);
      
      try {
        // Atualizar membro via serviço
        const membroAtualizado = await celulaService.atualizarMembro(
          celulaId.value,
          parseInt(id),
          dadosMembro
        )

        // Atualizar localmente se recebemos uma resposta válida
        if (membroAtualizado && membroAtualizado.id) {
          const index = members.value.findIndex((member: Member) => member.id === id)
          if (index !== -1) {
            members.value[index] = {
              id: membroAtualizado.id.toString(),
              name: membroAtualizado.nome,
              telefone: membroAtualizado.telefone,
              dataNascimento: membroAtualizado.dataNascimento,
              isConsolidator: membroAtualizado.ehConsolidador,
              isCoLeader: membroAtualizado.ehCoLider,
              isHost: membroAtualizado.ehAnfitriao,
              isActive: membroAtualizado.ativo
            }
          }
        } else {
          // Se não recebemos uma resposta válida, atualizamos com os dados locais
          const index = members.value.findIndex((member: Member) => member.id === id)
          if (index !== -1) {
            members.value[index] = {
              ...members.value[index],
              name: updates.name!,
              telefone: updates.telefone,
              dataNascimento: updates.dataNascimento,
              isConsolidator: updates.isConsolidator || false,
              isCoLeader: updates.isCoLeader || false,
              isHost: updates.isHost || false
            }
          }
        }
      } catch (serviceError) {
        console.error('[memberStore] Erro no serviço de atualização:', serviceError)
        
        // Mesmo com erro no serviço, atualizamos a UI para melhor experiência
        const index = members.value.findIndex((member: Member) => member.id === id)
        if (index !== -1) {
          members.value[index] = {
            ...members.value[index],
            name: updates.name!,
            telefone: updates.telefone,
            dataNascimento: updates.dataNascimento,
            isConsolidator: updates.isConsolidator || false,
            isCoLeader: updates.isCoLeader || false,
            isHost: updates.isHost || false
          }
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar membro:', err)
      error.value = 'Falha ao atualizar membro'
    } finally {
      loading.value = false
    }
  }

  // Ativar/Desativar membro
  async function toggleMemberActive(id: string) {
    if (!celulaId.value) {
      error.value = 'Célula não selecionada'
      return
    }

    loading.value = true
    error.value = null

    try {
      const member = members.value.find((m: Member) => m.id === id)
      if (!member) {
        throw new Error('Membro não encontrado')
      }

      const newActiveState = !member.isActive
      
      // Chamar o serviço para atualizar o status
      await celulaService.toggleAtivoMembro(celulaId.value, parseInt(id), newActiveState)
      
      // Atualizar localmente
      member.isActive = newActiveState
    } catch (err) {
      console.error('Erro ao atualizar status do membro:', err)
      error.value = 'Falha ao atualizar status do membro'
    } finally {
      loading.value = false
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
    getActiveMembers,
    getInactiveMembers,
    getConsolidators,
    getCoLeaders,
    getHosts,
    carregarMembros,
    updateMember,
    addMember,
    deleteMember,
    toggleMemberActive
  }
})