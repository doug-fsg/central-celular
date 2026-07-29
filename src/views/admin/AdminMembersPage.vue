<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import MemberFrequencyModal from '../../components/MemberFrequencyModal.vue'
import SortableTableHeader from '../../components/admin/SortableTableHeader.vue'
import { adminService, type MembroCompleto } from '../../services/adminService'
import relatorioService from '../../services/relatorioService'
import { toggleSortState, type SortState } from '../../utils/tableSort'
import SkeletonList from '../../components/SkeletonList.vue'

// Estado para os dados
const loading = ref(false)

// Lista de membros
const members = ref<MembroCompleto[]>([])
const pagination = ref({
  total: 0,
  pages: 0,
  currentPage: 1,
  perPage: 20
})

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number] | 'all'
const PAGE_SIZE_STORAGE_KEY = 'admin-members-page-size'

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
  loadMembers(1)
}

const sortState = ref<SortState | null>(null)

const handleSort = (key: string) => {
  sortState.value = toggleSortState(sortState.value, key)
  loadMembers(1)
}

const filterSelectClass =
  'h-9 min-w-[8.5rem] cursor-pointer appearance-none rounded-lg border border-neutral-200 bg-neutral-50/80 pl-3 pr-8 text-sm text-neutral-700 transition-colors duration-200 hover:border-neutral-300 hover:bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20'

// Estado para filtros
const searchTerm = ref('')
const isFiltering = computed(() => searchTerm.value.trim() !== '')

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchTerm, () => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null
    loadMembers(1)
  }, 300)
})

// Estado do modal de frequência
const showFrequencyModal = ref(false)
const selectedMember = ref<{ id: number; nome: string; celulaId: number } | null>(null)

// Cache de frequências calculadas
const frequenciaCache = ref<Map<number, { celula: number; culto: number; loading: boolean }>>(new Map())

// Mensagens de feedback
const feedbackMessage = ref('')
const feedbackType = ref<'success' | 'error'>('success')

const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
  feedbackMessage.value = message
  feedbackType.value = type
  setTimeout(() => {
    feedbackMessage.value = ''
  }, 3000)
}

// Calcular frequência de um membro
const calcularFrequencia = async (membroId: number, celulaId: number) => {
  // Verificar cache
  if (frequenciaCache.value.has(membroId)) {
    const cached = frequenciaCache.value.get(membroId)!
    if (!cached.loading) {
      return { celula: cached.celula, culto: cached.culto }
    }
  }

  // Marcar como carregando
  frequenciaCache.value.set(membroId, { celula: 0, culto: 0, loading: true })

  try {
    const data = await relatorioService.obterFrequenciaMembro(membroId, celulaId)
    
    // Calcular % de presença (últimos 4 relatórios)
    let presentesCelula = 0
    let presentesCulto = 0
    const total = Math.min(data.length, 4) // Máximo 4 relatórios

    data.slice(0, 4).forEach(item => {
      if (item.presenteCelula) presentesCelula++
      if (item.presenteCulto) presentesCulto++
    })

    const percentualCelula = total > 0 ? Math.round((presentesCelula / total) * 100) : 0
    const percentualCulto = total > 0 ? Math.round((presentesCulto / total) * 100) : 0

    // Atualizar cache
    frequenciaCache.value.set(membroId, { 
      celula: percentualCelula, 
      culto: percentualCulto, 
      loading: false 
    })

    return { celula: percentualCelula, culto: percentualCulto }
  } catch (error) {
    console.error('Erro ao calcular frequência:', error)
    frequenciaCache.value.set(membroId, { celula: 0, culto: 0, loading: false })
    return { celula: 0, culto: 0 }
  }
}

// Obter frequência do cache ou calcular
const getFrequencia = (membroId: number, celulaId: number) => {
  const cached = frequenciaCache.value.get(membroId)
  if (cached) {
    if (!cached.loading) {
      return cached
    }
    // Já está carregando, retornar estado de loading
    return cached
  }
  // Não está no cache, calcular em background
  calcularFrequencia(membroId, celulaId)
  return { celula: 0, culto: 0, loading: true }
}

// Carregar membros
const loadMembers = async (page: number = 1) => {
  try {
    loading.value = true
    const response = await adminService.listarMembros(page, getEffectiveLimit(), {
      search: searchTerm.value.trim() || undefined,
      sortBy: sortState.value?.key,
      sortDir: sortState.value?.dir,
    })
    
    if (!response || typeof response !== 'object') {
      showFeedback('Resposta inválida do servidor', 'error')
      return
    }

    if (!response.membros || !Array.isArray(response.membros)) {
      showFeedback('Formato de resposta inválido', 'error')
      return
    }

    members.value = response.membros
    pagination.value = response.pagination

    // Calcular frequências em background para os membros da página atual
    members.value.forEach(member => {
      if (!frequenciaCache.value.has(member.id)) {
        calcularFrequencia(member.id, member.celulaId)
      }
    })
  } catch (error) {
    console.error('Erro ao carregar membros:', error)
    showFeedback('Erro ao carregar membros', 'error')
  } finally {
    loading.value = false
  }
}

// Abrir modal de frequência
const handleVerMembro = (member: MembroCompleto) => {
  selectedMember.value = {
    id: member.id,
    nome: member.nome,
    celulaId: member.celulaId
  }
  showFrequencyModal.value = true
}

// Mudar página
const handlePageChange = (page: number) => {
  loadMembers(page)
}

// Carregar dados ao montar
onMounted(() => {
  loadMembers()
})

onUnmounted(() => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
})
</script>

<template>
  <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-neutral-800">Membros</h1>
        <p class="mt-1 text-xs sm:text-sm text-neutral-500">Gerencie membros do sistema</p>
      </div>
    </div>

    <!-- Filtros -->
    <div class="bg-white shadow-sm rounded-xl border border-gray-100 p-4 sm:p-5 mb-4">
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          id="search"
          v-model="searchTerm"
          class="block w-full pl-12 pr-11 py-3 text-sm sm:text-base border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 placeholder:text-gray-400 text-gray-900"
          placeholder="Buscar membros por nome, telefone, célula ou líder..."
        >
        <button
          v-if="searchTerm"
          @click="searchTerm = ''"
          type="button"
          class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 active:text-gray-700 transition-colors touch-manipulation"
          aria-label="Limpar busca"
        >
          <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      <!-- Contador de resultados -->
      <div v-if="isFiltering && members.length > 0" class="mt-3 text-xs sm:text-sm text-gray-600 flex items-center gap-1.5">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ pagination.total }} {{ pagination.total === 1 ? 'membro encontrado' : 'membros encontrados' }}</span>
      </div>
    </div>

    <SkeletonList v-if="loading" :rows="6" class="mt-4" />

    <div v-else-if="members.length === 0" class="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden p-8 sm:p-12">
      <div class="text-center">
        <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
          <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="text-base sm:text-lg font-semibold text-gray-900 mb-2">
          {{ isFiltering ? 'Nenhum membro encontrado' : 'Nenhum membro cadastrado' }}
        </h3>
        <p class="text-sm sm:text-base text-gray-500 max-w-sm mx-auto">
          {{ isFiltering
            ? `Não encontramos membros que correspondam a "${searchTerm}". Tente buscar com outros termos.`
            : 'Comece criando células e adicionando membros a elas.' }}
        </p>
        <button
          v-if="searchTerm"
          @click="searchTerm = ''"
          class="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 active:text-primary-800 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Limpar busca
        </button>
      </div>
    </div>

    <div v-else class="bg-white shadow overflow-hidden sm:rounded-lg">
      <!-- Lista mobile -->
      <div class="sm:hidden space-y-2.5 p-3">
        <div
          v-for="member in members"
          :key="member.id"
          @click="handleVerMembro(member)"
          class="relative border border-gray-200 rounded-xl px-4 py-3 shadow-md bg-white cursor-pointer transition-all duration-200 active:scale-[0.98] active:shadow-lg active:bg-blue-50 active:border-primary-300 group touch-manipulation"
          style="-webkit-tap-highlight-color: rgba(59, 130, 246, 0.1);"
        >
          <!-- Indicador visual de clicável -->
          <div class="absolute top-2.5 right-3 flex items-center justify-center w-7 h-7 rounded-full bg-primary-50 group-active:bg-primary-100 transition-colors">
            <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          
          <div class="flex items-start justify-between mb-2 pr-10">
            <div class="flex-1 min-w-0">
              <div class="flex items-center mb-0.5">
                <p class="text-sm font-semibold text-gray-900 group-active:text-primary-700 transition-colors truncate">{{ member.nome }}</p>
              </div>
              <p class="text-xs font-medium text-gray-700 truncate">{{ member.celula?.nome || 'Sem célula' }}</p>
            </div>
          </div>
          
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-1.5 text-xs text-gray-600">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>{{ member.celula?.lider?.nome || 'Sem líder' }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-500">Célula:</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" :class="getFrequencia(member.id, member.celulaId).loading ? 'bg-gray-100 text-gray-500' : (getFrequencia(member.id, member.celulaId).celula >= 75 ? 'bg-green-100 text-green-700' : getFrequencia(member.id, member.celulaId).celula >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')">
                {{ getFrequencia(member.id, member.celulaId).loading ? '...' : `${getFrequencia(member.id, member.celulaId).celula}%` }}
              </span>
              <span class="text-xs text-gray-500">Culto:</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold" :class="getFrequencia(member.id, member.celulaId).loading ? 'bg-gray-100 text-gray-500' : (getFrequencia(member.id, member.celulaId).culto >= 75 ? 'bg-green-100 text-green-700' : getFrequencia(member.id, member.celulaId).culto >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700')">
                {{ getFrequencia(member.id, member.celulaId).loading ? '...' : `${getFrequencia(member.id, member.celulaId).culto}%` }}
              </span>
            </div>
          </div>
          
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span v-if="member.ehConsolidador" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              Consolidador
            </span>
            <span v-if="member.ehCoLider" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
              Co-líder
            </span>
            <span v-if="member.ehAnfitriao" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              Anfitrião
            </span>
          </div>
        </div>
      </div>
      
      <!-- Lista desktop -->
      <div class="hidden sm:block overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <SortableTableHeader
                label="Nome"
                sort-key="nome"
                :active-key="sortState?.key ?? null"
                :direction="sortState?.dir ?? 'asc'"
                @sort="handleSort"
              />
              <SortableTableHeader
                label="Célula"
                sort-key="celula"
                :active-key="sortState?.key ?? null"
                :direction="sortState?.dir ?? 'asc'"
                @sort="handleSort"
              />
              <SortableTableHeader
                label="Líder"
                sort-key="lider"
                :active-key="sortState?.key ?? null"
                :direction="sortState?.dir ?? 'asc'"
                @sort="handleSort"
              />
              <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Frequência Célula
              </th>
              <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Frequência Culto
              </th>
              <SortableTableHeader
                label="Status"
                sort-key="status"
                :active-key="sortState?.key ?? null"
                :direction="sortState?.dir ?? 'asc'"
                @sort="handleSort"
              />
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr 
              v-for="member in members" 
              :key="member.id"
              @click="handleVerMembro(member)"
              class="cursor-pointer transition-all duration-200 hover:bg-blue-50 hover:shadow-sm hover:border-l-4 hover:border-l-primary-500 group"
            >
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 group-hover:text-primary-700 transition-colors">
                {{ member.nome }}
                <span class="ml-2 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity inline-block">
                  →
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                {{ member.celula?.nome || '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                {{ member.celula?.lider?.nome || '-' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="getFrequencia(member.id, member.celulaId).loading ? 'bg-gray-100 text-gray-500' : (getFrequencia(member.id, member.celulaId).celula >= 75 ? 'bg-green-100 text-green-800' : getFrequencia(member.id, member.celulaId).celula >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800')">
                  {{ getFrequencia(member.id, member.celulaId).loading ? '...' : `${getFrequencia(member.id, member.celulaId).celula}%` }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="getFrequencia(member.id, member.celulaId).loading ? 'bg-gray-100 text-gray-500' : (getFrequencia(member.id, member.celulaId).culto >= 75 ? 'bg-green-100 text-green-800' : getFrequencia(member.id, member.celulaId).culto >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800')">
                  {{ getFrequencia(member.id, member.celulaId).loading ? '...' : `${getFrequencia(member.id, member.celulaId).culto}%` }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <div class="flex flex-wrap gap-1">
                  <span v-if="member.ehConsolidador" class="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                    Consolidador
                  </span>
                  <span v-if="member.ehCoLider" class="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                    Co-líder
                  </span>
                  <span v-if="member.ehAnfitriao" class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Anfitrião
                  </span>
                  <span v-if="!member.ativo" class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                    Inativo
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginação -->
      <div
        v-if="members.length > 0"
        class="bg-white px-4 py-3 flex flex-col gap-3 border-t border-gray-200 sm:px-6 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label class="inline-flex items-center gap-2 text-sm text-gray-700">
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
            Mostrando
            <span class="font-medium">{{ paginationRange.from }}</span>
            até
            <span class="font-medium">{{ paginationRange.to }}</span>
            de
            <span class="font-medium">{{ pagination.total }}</span>
            {{ pagination.total === 1 ? 'membro' : 'membros' }}
          </p>
        </div>

        <div v-if="pagination.pages > 1" class="flex items-center justify-between sm:justify-end gap-3">
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
          <nav class="relative z-0 hidden sm:inline-flex rounded-md shadow-sm -space-x-px" aria-label="Paginação de membros">
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

    <!-- Mensagem de feedback -->
    <div
      v-if="feedbackMessage"
      :class="[
        'fixed top-4 right-4 px-4 py-2 rounded-md z-50',
        feedbackType === 'success' ? 'bg-green-500' : 'bg-red-500',
        'text-white'
      ]"
    >
      {{ feedbackMessage }}
    </div>

    <!-- Modal de frequência do membro -->
    <MemberFrequencyModal
      :is-open="showFrequencyModal"
      :membro-id="selectedMember?.id || null"
      :membro-nome="selectedMember?.nome || ''"
      :celula-id="selectedMember?.celulaId || null"
      @close="showFrequencyModal = false"
    />
  </main>
</template>

