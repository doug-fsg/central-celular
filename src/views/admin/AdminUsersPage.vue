<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, Teleport } from 'vue'
import UserModal from '../../components/UserModal.vue'
import CellModal from '../../components/CellModal.vue'
import { adminService } from '../../services/adminService'
import type { Celula, Usuario } from '../../services/adminService'
import {
  ensureUserInLeaderList,
  filterUsersForCellLeaderSelect,
  normalizeCreatedUsuario,
} from '../../utils/cellLeaders'
import { normalizeCelulaFromApi } from '../../utils/celula'
import { ssoLinkService } from '../../services/ssoLinkService'
import AppIcon from '../../components/AppIcon.vue'
import AdminUsersBulkBar from '../../components/admin/AdminUsersBulkBar.vue'
import SortableTableHeader from '../../components/admin/SortableTableHeader.vue'
import { toggleSortState, compareUsuarios, type SortState } from '../../utils/tableSort'

/** Mesmas regras do menu "Enviar link": só líder ativo (célula validada no backend). */
function podeReceberLinkSso(user: Usuario): boolean {
  return user.cargo.toUpperCase() === 'LIDER' && user.status === 'ativo'
}

/** Sem senha ainda: pode reenviar link (no sistema aparece como pendente / inativo até o primeiro acesso). */
function podeReenviarConvitePrimeiroAcesso(user: Usuario): boolean {
  return user.possuiSenha === false
}

/** Ativar ou desativar manualmente só após o usuário ter senha (pendentes são ativados ao criar a senha). */
function podeAlternarAtivacaoManual(user: Usuario): boolean {
  return user.possuiSenha !== false
}

function badgeStatusUsuario(user: Usuario): { label: string; rowClass: string } {
  if (user.possuiSenha === false) {
    return { label: 'pendente', rowClass: 'bg-amber-100 text-amber-900' }
  }
  if (user.status === 'ativo') {
    return { label: 'ativo', rowClass: 'bg-green-100 text-green-800' }
  }
  return { label: 'inativo', rowClass: 'bg-red-100 text-red-800' }
}

// Estado para os dados
const loading = ref(false)

// Lista de usuários
const users = ref<Usuario[]>([])
const usersAll = ref<Usuario[]>([])
const loadingAllUsers = ref(false)
const pagination = ref({
  total: 0,
  pages: 0,
  currentPage: 1,
  perPage: 10
})

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number] | 'all'
const PAGE_SIZE_STORAGE_KEY = 'admin-users-page-size'

function loadPageSize(): PageSizeOption {
  try {
    const saved = localStorage.getItem(PAGE_SIZE_STORAGE_KEY)
    if (saved === 'all') return 'all'
    const num = Number(saved)
    if (PAGE_SIZE_OPTIONS.includes(num as (typeof PAGE_SIZE_OPTIONS)[number])) {
      return num as PageSizeOption
    }
  } catch {
    /* ignore */
  }
  return 10
}

const pageSize = ref<PageSizeOption>(loadPageSize())

const getEffectiveLimit = () => (pageSize.value === 'all' ? 500 : pageSize.value)

const paginationRange = computed(() => {
  const { total, currentPage, perPage } = pagination.value
  if (total === 0) return { from: 0, to: 0 }
  const from = (currentPage - 1) * perPage + 1
  const to = Math.min(currentPage * perPage, total)
  return { from, to }
})

const handlePageSizeChange = () => {
  localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize.value))
  loadUsers(1)
}

const filterSelectClass =
  'h-9 min-w-[8.5rem] cursor-pointer appearance-none rounded-lg border border-neutral-200 bg-neutral-50/80 pl-3 pr-8 text-sm text-neutral-700 transition-colors duration-200 hover:border-neutral-300 hover:bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20'

const sortState = ref<SortState | null>(null)

const handleSort = (key: string) => {
  sortState.value = toggleSortState(sortState.value, key)
  if (!isFilteringUsers.value) {
    loadUsers(1)
  }
}

// Filtros da lista de usuários
const userSearchTerm = ref('')
const userRoleFilter = ref('')
const isFilteringUsers = computed(() => userSearchTerm.value.trim() !== '' || userRoleFilter.value.trim() !== '')
const filteredUsers = computed(() => {
  const term = userSearchTerm.value.toLowerCase().trim()
  const source = isFilteringUsers.value ? usersAll.value : users.value
  let list = source.filter(u => {
    const matchesTerm = !term ||
      u.nome.toLowerCase().includes(term) ||
      (u.whatsapp || '').toLowerCase().includes(term) ||
      (u.cargo || '').toLowerCase().includes(term)
    const matchesRole = !userRoleFilter.value || (u.cargo || '').toUpperCase() === userRoleFilter.value
    return matchesTerm && matchesRole
  })

  if (sortState.value && isFilteringUsers.value) {
    list = [...list].sort((a, b) => compareUsuarios(a, b, sortState.value!))
  }

  return list
})

const selectedUserIds = ref<number[]>([])

const userById = computed(() => {
  const m = new Map<number, Usuario>()
  for (const u of users.value) m.set(u.id, u)
  for (const u of usersAll.value) m.set(u.id, u)
  return m
})

const selectedUsersSnapshot = computed((): Usuario[] =>
  selectedUserIds.value
    .map((id) => userById.value.get(id))
    .filter((u): u is Usuario => u != null),
)

const isSelected = (id: number) => selectedUserIds.value.includes(id)

function toggleSelectUser(userId: number, checked: boolean) {
  if (checked) {
    if (!selectedUserIds.value.includes(userId)) {
      selectedUserIds.value = [...selectedUserIds.value, userId]
    }
  } else {
    selectedUserIds.value = selectedUserIds.value.filter((id) => id !== userId)
  }
}

/** Marca / desmarca todos os usuários visíveis na lista (filtro + página). */
function toggleSelectAllVisiveis(checked: boolean) {
  const ids = filteredUsers.value.map((u) => u.id)
  if (checked) {
    selectedUserIds.value = [...new Set([...selectedUserIds.value, ...ids])]
  } else {
    const remove = new Set(ids)
    selectedUserIds.value = selectedUserIds.value.filter((id) => !remove.has(id))
  }
}

const todosVisiveisMarcados = computed(() => {
  const vis = filteredUsers.value
  if (vis.length === 0) return false
  return vis.every((u) => selectedUserIds.value.includes(u.id))
})

const algumVisivelMarcado = computed(() =>
  filteredUsers.value.some((u) => selectedUserIds.value.includes(u.id)),
)

const qtdSelecionados = computed(() => selectedUserIds.value.length)

const bulkSheetOpen = ref(false)

// Carregar todas as páginas de usuários quando filtrar
const loadAllUsers = async () => {
  try {
    loadingAllUsers.value = true
    const first = await adminService.listarUsuarios(1, 500)
    let all: Usuario[] = first.usuarios
    const totalPages = first.pagination.pages
    for (let p = 2; p <= totalPages; p++) {
      const resp = await adminService.listarUsuarios(p, 500)
      all = all.concat(resp.usuarios)
    }
    usersAll.value = all
  } catch (error) {
    console.error('Erro ao carregar todas as páginas de usuários:', error)
  } finally {
    loadingAllUsers.value = false
  }
}

watch([userSearchTerm, userRoleFilter], async ([term, role]) => {
  selectedUserIds.value = []
  if ((term && term.trim() !== '') || (role && role.trim() !== '')) {
    if (usersAll.value.length === 0 && !loadingAllUsers.value) {
      await loadAllUsers()
    }
  }
})

const selectAllInputRef = ref<HTMLInputElement | null>(null)

watch([todosVisiveisMarcados, algumVisivelMarcado, filteredUsers], () => {
  const el = selectAllInputRef.value
  if (el) {
    el.indeterminate = algumVisivelMarcado.value && !todosVisiveisMarcados.value
  }
})

function onSelectAllHeaderChange(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  toggleSelectAllVisiveis(checked)
}

function limparSelecao() {
  selectedUserIds.value = []
  bulkSheetOpen.value = false
}

// Estado do modal
const showUserModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const selectedUser = ref<Partial<Usuario> | undefined>(undefined)

// Modal de célula (fluxo "criar célula após salvar líder")
const showCellModal = ref(false)
const selectedCell = ref<Partial<Celula> | undefined>(undefined)
const availableLeaders = ref<Usuario[]>([])
const isLoadingCell = ref(false)

function closeCellModal() {
  showCellModal.value = false
  selectedCell.value = undefined
}

// Confirmação de exclusão
const showDeleteConfirm = ref(false)
const userToDelete = ref<Usuario | null>(null)
const showTextConfirm = ref(false)
const confirmText = ref('')
const entityPendingDelete = ref<'user' | null>(null)
const entityInfo = ref<{ id: number, name: string } | null>(null)

// Mensagens de feedback
const feedbackMessage = ref('')
const feedbackType = ref<'success' | 'error'>('success')

// Estado para envio de link SSO
const sendingLink = ref(false)
const userSendingLink = ref<number | null>(null)
const showConfirmSendLink = ref(false)
const userIdToSendLink = ref<number | null>(null)

const showConfirmBulkSendLink = ref(false)
const sendingBulkLink = ref(false)
const showConfirmBulkAtivar = ref(false)
const showConfirmBulkDesativar = ref(false)
const sendingBulkStatus = ref(false)
const sendingBulkInvite = ref(false)

const sendingInvite = ref(false)
const userSendingInvite = ref<number | null>(null)

// Estado para menu de ações mobile
const openActionMenu = ref<number | null>(null)
const menuPosition = ref({ top: 0, right: 0 })

// Mostrar mensagem de feedback
const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
  feedbackMessage.value = message
  feedbackType.value = type
  setTimeout(() => {
    feedbackMessage.value = ''
  }, 3000)
}

// Carregamento inicial dos dados
const loadUsers = async (page: number = 1) => {
  try {
    loading.value = true
    const response = await adminService.listarUsuarios(
      page,
      getEffectiveLimit(),
      undefined,
      sortState.value ? { sortBy: sortState.value.key, sortDir: sortState.value.dir } : undefined,
    )
    users.value = response.usuarios
    pagination.value = response.pagination
  } catch (error) {
    console.error('Erro ao carregar usuários:', error)
  } finally {
    loading.value = false
  }
}

// Abrir modal para criar usuário
const handleNovoUsuario = () => {
  modalMode.value = 'create'
  selectedUser.value = undefined
  showUserModal.value = true
}

// Abrir modal para editar usuário
const handleEditarUsuario = (user: Usuario) => {
  modalMode.value = 'edit'
  selectedUser.value = user
  showUserModal.value = true
}

// Confirmar exclusão de usuário
const handleConfirmDelete = (user: Usuario) => {
  userToDelete.value = user
  entityPendingDelete.value = 'user'
  entityInfo.value = { id: user.id, name: user.nome }
  confirmText.value = ''
  showDeleteConfirm.value = true
  showTextConfirm.value = true
}

// Excluir usuário
const handleDeleteUser = async () => {
  if (!userToDelete.value) return

  try {
    await adminService.excluirUsuario(userToDelete.value.id)
    showFeedback('Usuário excluído com sucesso')
    
    // Recarregar lista atual
    await handlePageChange(pagination.value.currentPage)
    
    // Se estiver filtrando, recarregar também usersAll
    if (isFilteringUsers.value) {
      await loadAllUsers()
    }
    
    entityPendingDelete.value = null
  } catch (error) {
    console.error('Erro ao excluir usuário:', error)
    showFeedback('Erro ao excluir usuário', 'error')
  } finally {
    showDeleteConfirm.value = false
    userToDelete.value = null
  }
}

// Carregar líderes disponíveis para o formulário de célula
const loadAvailableLeaders = async () => {
  try {
    const response = await adminService.listarUsuarios(1, 100, ['LIDER', 'SUPERVISOR', 'ADMINISTRADOR', 'PASTOR'])
    availableLeaders.value = filterUsersForCellLeaderSelect(response.usuarios)
  } catch (error) {
    console.error('Erro ao carregar líderes:', error)
    showFeedback('Erro ao carregar líderes disponíveis', 'error')
  }
}

// Salvar usuário (criar/editar)
const handleSaveUser = async (userData: Partial<Usuario> & {
  criarCelulaApos?: boolean
  enviarConvite?: boolean
}) => {
  const abrirCelulaAposSalvar =
    modalMode.value === 'create' && userData.cargo === 'LIDER' && userData.criarCelulaApos === true

  try {
    if (modalMode.value === 'create') {
      const criado = await adminService.criarUsuario(userData as any)
      if (userData.enviarConvite) {
        if (criado.conviteEnviado === false) {
          showFeedback(
            'Usuário criado, mas o convite não foi enviado pelo WhatsApp. Verifique a conexão do bot e tente enviar o link novamente (ex.: ação em lote ou novo convite).',
            'error'
          )
        } else {
          showFeedback(
            'Usuário criado com sucesso. Um link de convite foi enviado via WhatsApp para criar a senha no Aprisco.'
          )
        }
      } else {
        showFeedback('Usuário criado com sucesso.')
      }

      await handlePageChange(pagination.value.currentPage)
      if (isFilteringUsers.value) {
        await loadAllUsers()
      }

      if (abrirCelulaAposSalvar && criado.id) {
        await loadAvailableLeaders()
        const lider = normalizeCreatedUsuario(criado)
        availableLeaders.value = ensureUserInLeaderList(availableLeaders.value, lider)
        const leaderName = lider.nome || 'Líder'
        selectedCell.value = {
          liderId: lider.id,
          lider: { id: lider.id, nome: lider.nome, whatsapp: lider.whatsapp, cargo: lider.cargo, ativo: lider.ativo, status: lider.status },
          nome: `Célula - ${leaderName.split(' ')[0]}`,
        }
        showUserModal.value = false
        showCellModal.value = true
        return
      }
    } else {
      const atualizado = await adminService.atualizarUsuario(userData.id!, userData)
      const idx = users.value.findIndex(u => u.id === atualizado.id)
      if (idx !== -1) {
        users.value[idx] = atualizado
      }
      const idxAll = usersAll.value.findIndex(u => u.id === atualizado.id)
      if (idxAll !== -1) {
        usersAll.value[idxAll] = atualizado
      }
      showFeedback('Usuário atualizado com sucesso')
    }

    await handlePageChange(pagination.value.currentPage)
    if (isFilteringUsers.value) {
      await loadAllUsers()
    }
    showUserModal.value = false
  } catch (error) {
    console.error('Erro ao salvar usuário:', error)
    showFeedback('Erro ao salvar usuário', 'error')
  }
}

// Salvar célula (modal aberto após criar líder)
const handleSaveCell = async (cellData: Partial<Celula>) => {
  try {
    isLoadingCell.value = true

    if (!cellData.liderId) {
      showFeedback('Líder é obrigatório', 'error')
      return
    }

    const dadosParaSalvar: Record<string, unknown> = {
      nome: cellData.nome,
      publico: cellData.publico,
      endereco: cellData.endereco,
      diaSemana: cellData.diaSemana,
      horario: cellData.horario,
      liderId: cellData.liderId,
    }
    if (cellData.supervisor_id) {
      dadosParaSalvar.supervisor_id = cellData.supervisor_id
    }

    if (selectedCell.value?.id) {
      const atualizada = normalizeCelulaFromApi(
        await adminService.atualizarCelula(selectedCell.value.id, dadosParaSalvar),
      )
      selectedCell.value = { ...selectedCell.value, ...atualizada }
      showFeedback('Célula atualizada com sucesso')
      return
    }

    const novaCelula = normalizeCelulaFromApi(
      await adminService.criarCelula(dadosParaSalvar as Omit<Celula, 'id'>),
    )

    if (!novaCelula.id) {
      showFeedback('Célula criada, mas não foi possível carregar o painel de membros.', 'error')
      closeCellModal()
      return
    }

    selectedCell.value = novaCelula
    showFeedback('Célula criada. Agora você pode adicionar os membros.')
  } catch (error: unknown) {
    console.error('Erro ao salvar célula:', error)
    const err = error as { errors?: { message?: string }[]; message?: string }
    const mensagemErro = err.errors?.[0]?.message || err.message || 'Erro ao salvar célula'
    showFeedback(mensagemErro, 'error')
  } finally {
    isLoadingCell.value = false
  }
}

// Ativar/desativar usuário
const toggleUserStatus = async (userId: number, novoStatus: boolean) => {
  try {
    const usuarioAtualizado = await adminService.toggleStatusUsuario(userId, novoStatus)
    const index = users.value.findIndex(u => u.id === userId)
    if (index !== -1) {
      users.value[index] = usuarioAtualizado as Usuario
    }
    const idxAll = usersAll.value.findIndex(u => u.id === userId)
    if (idxAll !== -1) {
      usersAll.value[idxAll] = usuarioAtualizado as Usuario
    }
  } catch (error) {
    console.error('Erro ao alterar status do usuário:', error)
  }
}

async function handleReenviarConvitePrimeiroAcesso(user: Usuario) {
  try {
    sendingInvite.value = true
    userSendingInvite.value = user.id
    const r = await adminService.reenviarConviteUsuario(user.id)
    if (r.conviteEnviado) {
      showFeedback(`Link de primeiro acesso reenviado para ${user.nome} via WhatsApp.`)
    } else {
      showFeedback('Não foi possível enviar o WhatsApp.', 'error')
    }
  } catch (err: any) {
    showFeedback(err?.message || 'Não foi possível reenviar o convite.', 'error')
  } finally {
    sendingInvite.value = false
    userSendingInvite.value = null
    openActionMenu.value = null
  }
}

async function handleReenviarConvitesEmLote() {
  const alvo = selectedUsersSnapshot.value.filter((u) => u.possuiSenha === false)
  if (alvo.length === 0) {
    showFeedback('Nenhum usuário pendente (sem senha) na seleção.', 'error')
    return
  }
  sendingBulkInvite.value = true
  let ok = 0
  let fail = 0
  for (const u of alvo) {
    try {
      const r = await adminService.reenviarConviteUsuario(u.id)
      if (r.conviteEnviado) ok++
      else fail++
    } catch {
      fail++
    }
  }
  sendingBulkInvite.value = false
  limparSelecao()
  if (fail === 0) {
    showFeedback(`Convite reenviado para ${ok} usuário(s).`)
  } else if (ok === 0) {
    showFeedback('Nenhum convite foi enviado. Verifique o WhatsApp do bot.', 'error')
  } else {
    showFeedback(`Enviados: ${ok}. Falhas: ${fail}.`, 'error')
  }
}

// Mudar página da lista de usuários
const handlePageChange = async (page: number) => {
  await loadUsers(page)
}

// Confirmar envio de link SSO
const confirmSendSsoLink = (userId: number) => {
  userIdToSendLink.value = userId
  showConfirmSendLink.value = true
}

// Enviar link SSO para um líder
const handleSendSsoLink = async () => {
  try {
    sendingLink.value = true
    userSendingLink.value = userIdToSendLink.value
    
    const result = await ssoLinkService.gerarEnviarLink(userIdToSendLink.value as number)
    
    if (result.success) {
      showFeedback('Link enviado com sucesso para o líder')
    } else {
      showFeedback('Erro ao enviar link: ' + result.message, 'error')
    }
  } catch (error) {
    console.error('Erro ao enviar link SSO:', error)
    showFeedback('Erro ao enviar link SSO', 'error')
  } finally {
    sendingLink.value = false
    showConfirmSendLink.value = false
    userSendingLink.value = null
  }
}

const idsParaEnvioEmLote = computed(() => {
  const map = userById.value
  return [...new Set(selectedUserIds.value)].filter((id) => {
    const u = map.get(id)
    return u != null && podeReceberLinkSso(u)
  })
})

function abrirConfirmacaoEnvioEmLote() {
  if (idsParaEnvioEmLote.value.length === 0) {
    showFeedback('Inclua ao menos um líder ativo na seleção para enviar o link.', 'error')
    return
  }
  showConfirmBulkSendLink.value = true
}

function aplicarStatusLocal(usuarioIds: number[], ativo: boolean) {
  const status = ativo ? 'ativo' : 'inativo'
  const patch = (list: typeof users.value) => {
    for (const u of list) {
      if (usuarioIds.includes(u.id)) {
        u.ativo = ativo
        u.status = status
      }
    }
  }
  patch(users.value)
  patch(usersAll.value)
}

async function executarBulkAtivar() {
  const ids = [...new Set(selectedUserIds.value)]
  if (ids.length === 0) {
    showConfirmBulkAtivar.value = false
    return
  }
  try {
    sendingBulkStatus.value = true
    const r = await adminService.alterarStatusUsuariosLote(ids, true)
    aplicarStatusLocal(
      r.detalhes.filter((d) => d.ok).map((d) => d.usuarioId),
      true,
    )
    if (r.falhas === 0) {
      showFeedback(`${r.alterados} usuário(s) ativado(s)`)
      selectedUserIds.value = []
      bulkSheetOpen.value = false
    } else {
      showFeedback(`Ativados: ${r.alterados}. Falhas: ${r.falhas}.`, 'error')
    }
    await handlePageChange(pagination.value.currentPage)
    if (isFilteringUsers.value) await loadAllUsers()
  } catch (e) {
    console.error(e)
    showFeedback('Erro ao ativar em lote', 'error')
  } finally {
    sendingBulkStatus.value = false
    showConfirmBulkAtivar.value = false
  }
}

async function executarBulkDesativar() {
  const ids = [...new Set(selectedUserIds.value)]
  if (ids.length === 0) {
    showConfirmBulkDesativar.value = false
    return
  }
  try {
    sendingBulkStatus.value = true
    const r = await adminService.alterarStatusUsuariosLote(ids, false)
    aplicarStatusLocal(
      r.detalhes.filter((d) => d.ok).map((d) => d.usuarioId),
      false,
    )
    if (r.falhas === 0) {
      showFeedback(`${r.alterados} usuário(s) desativado(s)`)
      selectedUserIds.value = []
      bulkSheetOpen.value = false
    } else {
      showFeedback(`Desativados: ${r.alterados}. Falhas: ${r.falhas}.`, 'error')
    }
    await handlePageChange(pagination.value.currentPage)
    if (isFilteringUsers.value) await loadAllUsers()
  } catch (e) {
    console.error(e)
    showFeedback('Erro ao desativar em lote', 'error')
  } finally {
    sendingBulkStatus.value = false
    showConfirmBulkDesativar.value = false
  }
}

const handleSendBulkSsoLink = async () => {
  const ids = idsParaEnvioEmLote.value
  if (ids.length === 0) {
    showConfirmBulkSendLink.value = false
    return
  }

  try {
    sendingBulkLink.value = true
    const result = await ssoLinkService.gerarEnviarLinkLote(ids)

    if (result.falhas === 0) {
      showFeedback(`Links enviados com sucesso para ${result.enviados} líder(es)`)
      selectedUserIds.value = []
    } else if (result.enviados > 0) {
      showFeedback(
        `Enviados: ${result.enviados}. Falhas: ${result.falhas}. Verifique líderes sem célula ou WhatsApp.`,
        'error',
      )
    } else {
      showFeedback(
        result.detalhes[0]?.erro || 'Nenhum link foi enviado. Verifique WhatsApp e dados dos líderes.',
        'error',
      )
    }
  } catch (error) {
    console.error('Erro ao enviar links SSO em lote:', error)
    showFeedback('Erro ao enviar links em lote', 'error')
  } finally {
    sendingBulkLink.value = false
    showConfirmBulkSendLink.value = false
  }
}

// Fechar menu de ações ao clicar fora
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.action-menu-container')) {
    openActionMenu.value = null
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  loadUsers()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Toggle menu de ações
const toggleActionMenu = (userId: number, event: Event) => {
  event.stopPropagation()
  if (openActionMenu.value === userId) {
    openActionMenu.value = null
  } else {
    const button = event.target as HTMLElement
    const rect = button.getBoundingClientRect()
    menuPosition.value = {
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right
    }
    openActionMenu.value = userId
  }
}

// Formatar WhatsApp removendo DDI (55)
const formatWhatsApp = (whatsapp: string | null | undefined): string => {
  if (!whatsapp) return 'Sem WhatsApp'
  if (whatsapp.startsWith('55') && whatsapp.length >= 12) {
    return whatsapp.substring(2)
  }
  return whatsapp
}
</script>

<template>
  <main
    class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 transition-[padding-bottom]"
    :class="qtdSelecionados > 0 ? 'pb-[5.75rem] sm:pb-6' : ''"
  >
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-neutral-800">Usuários</h1>
        <p class="mt-1 text-xs sm:text-sm text-neutral-500">Gerencie usuários do sistema</p>
      </div>
      <button 
        @click="handleNovoUsuario"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
      >
        Novo Usuário
      </button>
    </div>
    
    <div class="bg-white shadow overflow-hidden sm:rounded-lg">
      <!-- Filtros da lista de usuários -->
      <div class="p-4 border-b border-gray-200 flex flex-row gap-3 items-center sm:justify-between">
        <div class="flex-1">
          <input
            v-model="userSearchTerm"
            type="text"
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            placeholder="Pesquisar por nome, WhatsApp ou cargo"
          />
        </div>
        <div class="flex-shrink-0">
          <select
            v-model="userRoleFilter"
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="">Todos</option>
            <option value="LIDER">Líder</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="PASTOR">Pastor (admin da igreja)</option>
          </select>
        </div>
      </div>

      <AdminUsersBulkBar
        v-model:sheet-open="bulkSheetOpen"
        :selected-users="selectedUsersSnapshot"
        :busy="sendingBulkStatus || sendingBulkLink || sendingBulkInvite"
        :busy-links="sendingBulkLink"
        :busy-convites="sendingBulkInvite"
        @clear="limparSelecao"
        @ativar="showConfirmBulkAtivar = true"
        @desativar="showConfirmBulkDesativar = true"
        @enviar-links="abrirConfirmacaoEnvioEmLote"
        @reenviar-convites="handleReenviarConvitesEmLote"
      />

      <!-- Loading -->
      <div v-if="loading" class="p-8 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
      
      <!-- Conteúdo quando não está carregando -->
      <template v-else>
        <!-- Lista mobile -->
        <div class="sm:hidden space-y-3 p-4">
          <div v-if="filteredUsers.length === 0" class="text-center py-8 text-gray-500">
            <p>Nenhum usuário encontrado</p>
          </div>
          <div
            v-for="user in filteredUsers"
            :key="user.id"
            class="border border-gray-200 rounded-lg p-4 shadow-sm relative"
          >
          <div class="flex items-start justify-between mb-2 gap-2">
            <div class="pt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                class="h-5 w-5 sm:h-4 sm:w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 touch-manipulation"
                :checked="isSelected(user.id)"
                @change="toggleSelectUser(user.id, ($event.target as HTMLInputElement).checked)"
                :aria-label="`Selecionar ${user.nome}`"
              />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-gray-900">{{ user.nome }}</p>
              <p class="text-xs text-gray-500">{{ user.cargo }}</p>
            </div>
            <div class="flex items-center gap-2">
              <span 
                :class="[
                  badgeStatusUsuario(user).rowClass,
                  'px-2 inline-flex text-xs leading-5 font-semibold rounded-full'
                ]"
              >
                {{ badgeStatusUsuario(user).label }}
              </span>
              <div class="relative action-menu-container">
                <button
                  @click="toggleActionMenu(user.id, $event)"
                  :class="[
                    'p-1.5 rounded-md transition-colors',
                    openActionMenu === user.id 
                      ? 'bg-gray-100 text-gray-700' 
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  ]"
                  aria-label="Menu de ações"
                >
                  <AppIcon name="dots" size="sm" />
                </button>
                <Teleport to="body">
                  <div
                    v-if="openActionMenu === user.id"
                    :style="{ top: `${menuPosition.top}px`, right: `${menuPosition.right}px` }"
                    class="fixed w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-[9999] py-1"
                    @click.stop
                  >
                  <button
                    @click="handleEditarUsuario(user); openActionMenu = null"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  >
                    <AppIcon name="edit" size="xs" />
                    Editar
                  </button>
                  <button
                    v-if="podeReenviarConvitePrimeiroAcesso(user)"
                    type="button"
                    class="w-full text-left px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                    :disabled="sendingInvite && userSendingInvite === user.id"
                    @click="handleReenviarConvitePrimeiroAcesso(user)"
                  >
                    <AppIcon name="email" size="xs" />
                    <span v-if="sendingInvite && userSendingInvite === user.id">Enviando convite…</span>
                    <span v-else>Reenviar link primeiro acesso</span>
                  </button>
                  <button
                    v-if="podeAlternarAtivacaoManual(user)"
                    @click="toggleUserStatus(user.id, user.status === 'ativo' ? false : true); openActionMenu = null"
                    :class="[
                      'w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors',
                      user.status === 'ativo' ? 'text-red-600' : 'text-green-600'
                    ]"
                  >
                    <AppIcon name="refresh" size="xs" />
                    {{ user.status === 'ativo' ? 'Desativar' : 'Ativar' }}
                  </button>
                  <button
                    v-if="user.cargo.toUpperCase() === 'LIDER' && user.status === 'ativo'"
                    @click="confirmSendSsoLink(user.id); openActionMenu = null"
                    class="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-50 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="sendingLink && userSendingLink === user.id"
                  >
                    <AppIcon name="email" size="xs" />
                    <span v-if="sendingLink && userSendingLink === user.id">
                      Enviando...
                    </span>
                    <span v-else>
                      Enviar Link
                    </span>
                  </button>
                  <div class="border-t border-gray-100 my-1"></div>
                  <button
                    @click="handleConfirmDelete(user); openActionMenu = null"
                    class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <AppIcon name="delete" size="xs" />
                    Excluir
                  </button>
                  </div>
                </Teleport>
              </div>
            </div>
          </div>
          <p class="text-sm text-gray-500">
            {{ formatWhatsApp(user.whatsapp) }}
          </p>
        </div>
        </div>
        
        <!-- Lista desktop -->
        <div class="hidden sm:block overflow-x-auto">
          <div v-if="filteredUsers.length === 0" class="text-center py-8 text-gray-500">
            <p>Nenhum usuário encontrado</p>
          </div>
          <table v-else class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="pl-4 pr-2 py-3 text-left w-10">
                <span class="sr-only">Selecionar todos nesta lista</span>
                <input
                  v-if="filteredUsers.length > 0"
                  ref="selectAllInputRef"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  :checked="todosVisiveisMarcados"
                  @change="onSelectAllHeaderChange"
                  aria-label="Selecionar todos os usuários visíveis na lista"
                />
              </th>
              <SortableTableHeader
                label="Nome"
                sort-key="nome"
                :active-key="sortState?.key ?? null"
                :direction="sortState?.dir ?? 'asc'"
                @sort="handleSort"
              />
              <SortableTableHeader
                label="Whatsapp"
                sort-key="whatsapp"
                :active-key="sortState?.key ?? null"
                :direction="sortState?.dir ?? 'asc'"
                @sort="handleSort"
              />
              <SortableTableHeader
                label="Função"
                sort-key="cargo"
                :active-key="sortState?.key ?? null"
                :direction="sortState?.dir ?? 'asc'"
                @sort="handleSort"
              />
              <SortableTableHeader
                label="Status"
                sort-key="status"
                :active-key="sortState?.key ?? null"
                :direction="sortState?.dir ?? 'asc'"
                @sort="handleSort"
              />
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-gray-50">
              <td class="pl-4 pr-2 py-4 whitespace-nowrap w-10">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  :checked="isSelected(user.id)"
                  @change="toggleSelectUser(user.id, ($event.target as HTMLInputElement).checked)"
                  :aria-label="`Selecionar ${user.nome}`"
                />
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {{ user.nome }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatWhatsApp(user.whatsapp) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ user.cargo }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  :class="[
                    badgeStatusUsuario(user).rowClass,
                    'px-2 inline-flex text-xs leading-5 font-semibold rounded-full'
                  ]"
                >
                  {{ badgeStatusUsuario(user).label }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="relative action-menu-container">
                  <button
                    @click="toggleActionMenu(user.id, $event)"
                    :class="[
                      'p-1.5 rounded-md transition-colors',
                      openActionMenu === user.id 
                        ? 'bg-gray-100 text-gray-700' 
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    ]"
                    aria-label="Menu de ações"
                  >
                    <AppIcon name="dots" size="sm" />
                  </button>
                  <Teleport to="body">
                    <div
                      v-if="openActionMenu === user.id"
                      :style="{ top: `${menuPosition.top}px`, right: `${menuPosition.right}px` }"
                    class="fixed w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-[9999] py-1"
                    @click.stop
                  >
                    <button
                      @click="handleEditarUsuario(user); openActionMenu = null"
                      class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                    >
                      <AppIcon name="edit" size="xs" />
                      Editar
                    </button>
                    <button
                      v-if="podeReenviarConvitePrimeiroAcesso(user)"
                      type="button"
                      class="w-full text-left px-4 py-2 text-sm text-sky-700 hover:bg-sky-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                      :disabled="sendingInvite && userSendingInvite === user.id"
                      @click="handleReenviarConvitePrimeiroAcesso(user)"
                    >
                      <AppIcon name="email" size="xs" />
                      <span v-if="sendingInvite && userSendingInvite === user.id">Enviando convite…</span>
                      <span v-else>Reenviar link primeiro acesso</span>
                    </button>
                    <button
                      v-if="podeAlternarAtivacaoManual(user)"
                      @click="toggleUserStatus(user.id, user.status === 'ativo' ? false : true); openActionMenu = null"
                      :class="[
                        'w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 transition-colors',
                        user.status === 'ativo' ? 'text-red-600' : 'text-green-600'
                      ]"
                    >
                      <AppIcon name="refresh" size="xs" />
                      {{ user.status === 'ativo' ? 'Desativar' : 'Ativar' }}
                    </button>
                    <button
                      v-if="user.cargo.toUpperCase() === 'LIDER' && user.status === 'ativo'"
                      @click="confirmSendSsoLink(user.id); openActionMenu = null"
                      class="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-50 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      :disabled="sendingLink && userSendingLink === user.id"
                    >
                      <AppIcon name="email" size="xs" />
                      <span v-if="sendingLink && userSendingLink === user.id">
                        Enviando...
                      </span>
                      <span v-else>
                        Enviar Link
                      </span>
                    </button>
                    <div class="border-t border-gray-100 my-1"></div>
                    <button
                      @click="handleConfirmDelete(user); openActionMenu = null"
                      class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                    >
                      <AppIcon name="delete" size="xs" />
                      Excluir
                    </button>
                  </div>
                  </Teleport>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </template>

      <!-- Paginação -->
      <div
        v-if="!loading && filteredUsers.length > 0"
        class="bg-white px-4 py-3 flex flex-col gap-3 border-t border-gray-200 sm:px-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label v-if="!isFilteringUsers" class="inline-flex items-center gap-2 text-sm text-gray-700">
            <span class="whitespace-nowrap">Itens por página</span>
            <div class="relative">
              <select
                v-model="pageSize"
                :class="[filterSelectClass, 'min-w-[5.5rem] h-8']"
                aria-label="Itens por página"
                @change="handlePageSizeChange"
              >
                <option v-for="opt in PAGE_SIZE_OPTIONS" :key="opt" :value="opt">
                  {{ opt }}
                </option>
                <option value="all">Todos</option>
              </select>
              <div class="pointer-events-none absolute inset-y-0 right-2.5 flex items-center" aria-hidden="true">
                <svg class="h-4 w-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </label>
          <p class="text-sm text-gray-700 tabular-nums">
            <template v-if="isFilteringUsers">
              <span class="font-medium">{{ filteredUsers.length }}</span>
              {{ filteredUsers.length === 1 ? 'usuário encontrado' : 'usuários encontrados' }}
            </template>
            <template v-else>
              Mostrando
              <span class="font-medium">{{ paginationRange.from }}</span>
              até
              <span class="font-medium">{{ paginationRange.to }}</span>
              de
              <span class="font-medium">{{ pagination.total }}</span>
              {{ pagination.total === 1 ? 'usuário' : 'usuários' }}
            </template>
          </p>
        </div>

        <div v-if="!isFilteringUsers && pagination.pages > 1" class="flex items-center justify-between sm:justify-end gap-3">
          <div class="flex sm:hidden gap-2">
            <button
              type="button"
              :disabled="pagination.currentPage === 1"
              @click="handlePageChange(pagination.currentPage - 1)"
              class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              type="button"
              :disabled="pagination.currentPage === pagination.pages"
              @click="handlePageChange(pagination.currentPage + 1)"
              class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
          <nav class="relative z-0 hidden sm:inline-flex rounded-md shadow-sm -space-x-px" aria-label="Paginação de usuários">
            <button
              type="button"
              :disabled="pagination.currentPage === 1"
              @click="handlePageChange(pagination.currentPage - 1)"
              class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span class="sr-only">Anterior</span>
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
            <button
              v-for="page in pagination.pages"
              :key="page"
              type="button"
              @click="handlePageChange(page)"
              :class="[
                'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                page === pagination.currentPage
                  ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
              ]"
            >
              {{ page }}
            </button>
            <button
              type="button"
              :disabled="pagination.currentPage === pagination.pages"
              @click="handlePageChange(pagination.currentPage + 1)"
              class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span class="sr-only">Próxima</span>
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>

    <!-- Confirmar envio de link SSO -->
    <div v-if="showConfirmSendLink" class="modal-backdrop z-[110]" @click.self="showConfirmSendLink = false">
      <div class="modal-panel modal-panel-sm p-6" @click.stop>
        <h3 class="text-lg leading-6 font-medium text-gray-900 mb-2">Confirmar envio</h3>
        <p class="text-sm text-gray-700 mb-4">Deseja enviar o link do relatório semanal para este líder agora?</p>
        <div class="sm:flex sm:flex-row-reverse gap-3">
          <button @click="handleSendSsoLink" class="inline-flex justify-center px-4 py-2 rounded-md text-white bg-primary-600 hover:bg-primary-700">Enviar</button>
          <button @click="showConfirmSendLink = false" class="inline-flex justify-center px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Confirmar envio em lote -->
    <div v-if="showConfirmBulkSendLink" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-[110] p-4">
      <div class="bg-white rounded-xl px-4 pt-5 pb-4 overflow-hidden shadow-xl transform transition-all max-w-md w-full sm:p-6">
        <h3 class="text-lg leading-6 font-medium text-gray-900 mb-2">Enviar link a vários líderes</h3>
        <p class="text-sm text-gray-700 mb-4">
          Será enviada uma mensagem no WhatsApp com o link do relatório para
          <span class="font-semibold">{{ idsParaEnvioEmLote.length }}</span>
          líder(es). Líderes sem célula ou com falha no envio aparecerão no resultado.
        </p>
        <div class="flex flex-col-reverse sm:flex-row sm:flex-row-reverse gap-2 sm:gap-3">
          <button
            type="button"
            :disabled="sendingBulkLink"
            class="inline-flex justify-center items-center min-h-[48px] px-4 py-2 rounded-xl text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 touch-manipulation font-medium"
            @click="handleSendBulkSsoLink"
          >
            {{ sendingBulkLink ? 'Enviando…' : 'Enviar a todos' }}
          </button>
          <button
            type="button"
            :disabled="sendingBulkLink"
            class="inline-flex justify-center items-center min-h-[48px] px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 touch-manipulation font-medium"
            @click="showConfirmBulkSendLink = false"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmar ativar em lote -->
    <div v-if="showConfirmBulkAtivar" class="fixed inset-0 bg-neutral-900/40 backdrop-blur-[1px] flex items-center justify-center z-[110] p-4">
      <div class="bg-white rounded-xl px-4 pt-5 pb-4 shadow-xl max-w-md w-full sm:p-6 border border-neutral-100">
        <h3 class="text-lg font-semibold text-neutral-900 mb-2">Ativar usuários</h3>
        <p class="text-sm text-neutral-600 mb-4">
          Confirma ativar <span class="font-semibold tabular-nums">{{ qtdSelecionados }}</span> usuário(s)
          selecionado(s)? Eles poderão acessar o sistema conforme a regra de cada cargo.
        </p>
        <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            class="min-h-[48px] px-4 rounded-xl border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50 touch-manipulation"
            :disabled="sendingBulkStatus"
            @click="showConfirmBulkAtivar = false"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="min-h-[48px] px-4 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 touch-manipulation"
            :disabled="sendingBulkStatus"
            @click="executarBulkAtivar"
          >
            {{ sendingBulkStatus ? 'Aplicando…' : 'Ativar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Confirmar desativar em lote -->
    <div v-if="showConfirmBulkDesativar" class="fixed inset-0 bg-neutral-900/40 backdrop-blur-[1px] flex items-center justify-center z-[110] p-4">
      <div class="bg-white rounded-xl px-4 pt-5 pb-4 shadow-xl max-w-md w-full sm:p-6 border border-neutral-100">
        <h3 class="text-lg font-semibold text-red-900 mb-2">Desativar usuários</h3>
        <p class="text-sm text-neutral-600 mb-4">
          <span class="font-semibold tabular-nums">{{ qtdSelecionados }}</span> usuário(s) perderão o acesso até serem
          reativados. O último administrador ativo não pode ser desativado (validação no servidor).
        </p>
        <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            type="button"
            class="min-h-[48px] px-4 rounded-xl border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50 touch-manipulation"
            :disabled="sendingBulkStatus"
            @click="showConfirmBulkDesativar = false"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="min-h-[48px] px-4 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 touch-manipulation"
            :disabled="sendingBulkStatus"
            @click="executarBulkDesativar"
          >
            {{ sendingBulkStatus ? 'Aplicando…' : 'Desativar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Mensagem de feedback -->
    <div
      v-if="feedbackMessage"
      :class="[
        'fixed top-4 right-4 px-4 py-2 rounded-md z-[200] max-w-[min(90vw,320px)] shadow-lg',
        feedbackType === 'success' ? 'bg-green-500' : 'bg-red-500',
        'text-white'
      ]"
    >
      {{ feedbackMessage }}
    </div>

    <!-- Modal de usuário -->
    <UserModal
      :is-open="showUserModal"
      :mode="modalMode"
      :user="selectedUser"
      @close="showUserModal = false"
      @save="handleSaveUser"
    />

    <!-- Modal de célula (após criar líder com "criar célula após salvar") -->
    <CellModal
      :is-open="showCellModal"
      :cell="selectedCell"
      :available-leaders="availableLeaders"
      :is-loading="isLoadingCell"
      @close="closeCellModal"
      @save="handleSaveCell"
    />

    <!-- Modal de confirmação de exclusão -->
    <div v-if="showDeleteConfirm" class="modal-backdrop z-[110]" @click.self="showDeleteConfirm = false">
      <div class="modal-panel modal-panel-md p-6" @click.stop>
        <div class="sm:flex sm:items-start">
          <div class="mt-3 text-center sm:mt-0 sm:text-left w-full">
            <h3 class="text-lg leading-6 font-medium text-gray-900">
              Confirmar Exclusão
            </h3>
            <div class="mt-2 space-y-3">
              <p class="text-sm text-gray-700">
                Você está prestes a excluir o usuário <span class="font-semibold">"{{ entityInfo?.name }}"</span>.
                Se este usuário for líder de uma célula, a célula e todos os membros associados serão apagados.
              </p>
              <p class="text-sm text-red-600">
                Para continuar, digite <span class="font-mono bg-red-50 px-1 rounded">delete</span> no campo abaixo.
              </p>
              <input
                v-model="confirmText"
                type="text"
                placeholder="Digite delete para confirmar"
                class="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
              />
            </div>
          </div>
        </div>
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            :disabled="confirmText.trim().toLowerCase() !== 'delete'"
            @click="handleDeleteUser()"
            class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm"
            :class="confirmText.trim().toLowerCase() === 'delete' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-red-400 cursor-not-allowed'"
          >
            Excluir
          </button>
          <button
            type="button"
            @click="showDeleteConfirm = false"
            class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

