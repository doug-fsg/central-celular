<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Teleport } from 'vue'
import { adminService } from '../services/adminService'
import redeCuidadoService from '../services/redeCuidadoService'
import type { RedeCuidadoResponse } from '../services/redeCuidadoService'
import MemberFrequencyModal from './MemberFrequencyModal.vue'
import CellWeekReportsModal from './CellWeekReportsModal.vue'
import AppIcon from './AppIcon.vue'
import { Dialog, DialogPanel, DialogTitle, TransitionRoot, TransitionChild } from '@headlessui/vue'

interface Membro {
  id: number
  nome: string
  telefone?: string
  ativo: boolean
  dataCadastro?: string
  ehConsolidador?: boolean
  ehCoLider?: boolean
  ehAnfitriao?: boolean
  ehLider?: boolean
}

const props = defineProps<{
  isOpen: boolean
  cellId: number | null
  cellName?: string
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

// Modal de frequência do membro
const showFrequencyModal = ref(false)
const selectedMembro = ref<{ id: number; nome: string } | null>(null)

function handleMembroClick(membro: Membro) {
  if (membro.ehLider) return
  selectedMembro.value = { id: membro.id, nome: membro.nome }
  showFrequencyModal.value = true
}

const loading = ref(false)
const membros = ref<Membro[]>([])
const redeData = ref<RedeCuidadoResponse | null>(null)
const celulaDetalhe = ref<{
  lider?: { id: number; nome: string }
  coLider?: { nome: string } | null
} | null>(null)

/** Atribuição: quem cuida de cada membro (nome) */
const cuidadoPorNome = computed(() => {
  const m = new Map<number, string>()
  const r = redeData.value
  if (!r) return m
  for (const c of r.cuidadores) {
    for (const cd of c.cuidados) {
      m.set(cd.membroId, c.nome)
    }
  }
  return m
})

/** Nomes que cada consolidador (membro id) cuida */
const nomesCuidadosPorConsolidadorId = computed(() => {
  const m = new Map<number, string[]>()
  const r = redeData.value
  if (!r) return m
  for (const c of r.cuidadores) {
    if (c.tipo === 'consolidador') {
      m.set(c.cuidadorId, c.cuidados.map((x) => x.nome))
    }
  }
  return m
})

function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/).filter(Boolean)
  if (p.length === 0) return '?'
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

function membroSemRede(m: Membro) {
  if (m.ehLider) return false
  return m.ativo && !cuidadoPorNome.value.has(m.id)
}

function nomesQueCuidadosDe(linha: Membro): string[] {
  if (linha.ehLider) return cuidadosDoLider.value
  return nomesQueCuidadosConsolidador(linha.id)
}

function badgesDaLinha(m: Membro) {
  const badges: { key: string; label: string; class: string }[] = []
  if (m.ehLider) {
    badges.push({ key: 'lider', label: 'Líder', class: 'bg-primary-100 text-primary-800' })
  }
  for (const b of papelBadges) {
    if (m[b.prop]) badges.push({ key: b.key, label: b.label, class: b.class })
  }
  return badges
}

function linhaTemPapel(m: Membro) {
  return Boolean(m.ehLider || m.ehConsolidador || m.ehCoLider || m.ehAnfitriao)
}

async function loadRede() {
  if (!props.cellId) {
    redeData.value = null
    return
  }
  try {
    redeData.value = await redeCuidadoService.obterRede(props.cellId)
  } catch (e) {
    console.warn('[CellMembersModal] rede cuidado:', e)
    redeData.value = null
  }
}

const showRedeModal = ref(false)
const salvandoRede = ref(false)
const modalMembroId = ref<number | null>(null)
const modalMembroNome = ref('')
const modalCuidadorSelecionado = ref('')
const modalError = ref('')

const opcoesCuidadores = computed(() => {
  const r = redeData.value
  if (!r) return [] as { key: string; label: string }[]
  const opts: { key: string; label: string }[] = [{ key: 'lider', label: `★ ${r.lider.nome}` }]
  for (const c of r.cuidadores) {
    if (c.tipo === 'consolidador') opts.push({ key: String(c.cuidadorId), label: `◆ ${c.nome}` })
  }
  return opts
})

function cuidadorAtualKeyParaMembro(membroId: number): string {
  const r = redeData.value
  if (!r) return ''
  for (const c of r.cuidadores) {
    if (c.cuidados.some((x) => x.membroId === membroId))
      return c.tipo === 'lider' ? 'lider' : String(c.cuidadorId)
  }
  return ''
}

function abrirModalRede(membroId: number, membroNome: string, presetKey?: string) {
  modalMembroId.value = membroId
  modalMembroNome.value = membroNome
  modalCuidadorSelecionado.value = presetKey ?? (cuidadorAtualKeyParaMembro(membroId) || '')
  modalError.value = ''
  showRedeModal.value = true
}

function fecharModalRede() {
  showRedeModal.value = false
  modalMembroId.value = null
  modalMembroNome.value = ''
  modalCuidadorSelecionado.value = ''
  modalError.value = ''
}

async function confirmarAtribuicaoRede() {
  const mid = modalMembroId.value
  if (!mid || !props.cellId || !redeData.value) {
    modalError.value = 'Dados incompletos'
    return
  }
  if (!modalCuidadorSelecionado.value) {
    modalError.value = 'Escolha um cuidador'
    return
  }
  salvandoRede.value = true
  modalError.value = ''
  const isLider = modalCuidadorSelecionado.value === 'lider'
  try {
    await redeCuidadoService.atribuir(props.cellId, {
      membroId: mid,
      consolidadorId: isLider ? null : Number(modalCuidadorSelecionado.value),
      liderId: isLider ? redeData.value.lider.id : null,
    })
    fecharModalRede()
    await loadRede()
  } catch (e: unknown) {
    modalError.value = e instanceof Error ? e.message : 'Erro ao salvar'
  } finally {
    salvandoRede.value = false
  }
}

async function removerDaRede(membroId: number, membroNome: string, e: Event) {
  e.stopPropagation()
  if (!props.cellId) return
  if (!confirm(`Remover ${membroNome} da rede?`)) return
  try {
    await redeCuidadoService.remover(props.cellId, membroId)
    await loadRede()
  } catch (err) {
    console.warn(err)
  }
}

function nomesQueCuidadosConsolidador(membroId: number): string[] {
  return nomesCuidadosPorConsolidadorId.value.get(membroId) ?? []
}

const liderNome = computed(
  () => redeData.value?.lider?.nome ?? celulaDetalhe.value?.lider?.nome ?? null
)

const coliderNomes = computed(() => {
  const nomes = new Set<string>()
  if (celulaDetalhe.value?.coLider?.nome) nomes.add(celulaDetalhe.value.coLider.nome)
  for (const m of membros.value) {
    if (m.ehCoLider) nomes.add(m.nome)
  }
  return [...nomes]
})

const anfitriaoNomes = computed(() =>
  membros.value.filter((m) => m.ehAnfitriao).map((m) => m.nome)
)

const consolidadorNomes = computed(() =>
  membros.value.filter((m) => m.ehConsolidador).map((m) => m.nome)
)

function formatNomesLista(nomes: string[]) {
  return nomes.length > 0 ? nomes.join(', ') : '—'
}

const cuidadosDoLider = computed((): string[] => {
  const r = redeData.value
  if (!r) return []
  const entry = r.cuidadores.find(
    (c) => c.tipo === 'lider' && c.cuidadorId === r.lider.id
  )
  return entry?.cuidados.map((x) => x.nome) ?? []
})

const linhaLider = computed((): Membro | null => {
  const id = redeData.value?.lider?.id ?? celulaDetalhe.value?.lider?.id
  const nome = redeData.value?.lider?.nome ?? celulaDetalhe.value?.lider?.nome
  if (!nome) return null
  return { id: id ?? 0, nome, ativo: true, ehLider: true }
})

const linhasTabela = computed(() => {
  const lider = linhaLider.value
  if (lider) return [lider, ...membros.value]
  return membros.value
})

const totalMembros = computed(() => linhasTabela.value.length)
const totalComPapel = computed(() => linhasTabela.value.filter((m) => linhaTemPapel(m)).length)
const totalComCuidadoPor = computed(() =>
  membros.value.filter((m) => cuidadoPorNome.value.has(m.id)).length
)
const totalCuidados = computed(() => {
  const r = redeData.value
  if (r) return r.cuidadores.reduce((acc, c) => acc + c.cuidados.length, 0)
  let n = 0
  for (const nomes of nomesCuidadosPorConsolidadorId.value.values()) {
    n += nomes.length
  }
  return n
})

const papelBadges = [
  { key: 'consolidador', prop: 'ehConsolidador' as const, label: 'Consolid.', class: 'bg-violet-100 text-violet-800' },
  { key: 'colider', prop: 'ehCoLider' as const, label: 'Co-líder', class: 'bg-amber-100 text-amber-800' },
  { key: 'anfitriao', prop: 'ehAnfitriao' as const, label: 'Anfitrião', class: 'bg-sky-100 text-sky-800' },
]

const equipeCelula = computed(() => [
  {
    id: 'lider',
    label: 'Líder',
    nomes: liderNome.value ? [liderNome.value] : [],
    labelClass: 'text-gray-500',
    chipClass: 'bg-gray-50 text-gray-900 ring-gray-200/80',
  },
  {
    id: 'colider',
    label: coliderNomes.value.length > 1 ? 'Co-líderes' : 'Co-líder',
    nomes: coliderNomes.value,
    labelClass: 'text-amber-800',
    chipClass: 'bg-amber-50 text-amber-900 ring-amber-200/80',
  },
  {
    id: 'anfitriao',
    label: anfitriaoNomes.value.length > 1 ? 'Anfitriões' : 'Anfitrião',
    nomes: anfitriaoNomes.value,
    labelClass: 'text-blue-700',
    chipClass: 'bg-sky-50 text-sky-900 ring-sky-200/80',
  },
  {
    id: 'consolidador',
    label: consolidadorNomes.value.length > 1 ? 'Consolidadores' : 'Consolidador',
    nomes: consolidadorNomes.value,
    labelClass: 'text-violet-700',
    chipClass: 'bg-violet-50 text-violet-900 ring-violet-200/80',
  },
])

// Dashboard de frequência
const frequenciaCulto = ref({ ultimaSemana: 0, penultimaSemana: 0, media: 0 })
const frequenciaCelula = ref({ ultimaSemana: 0, penultimaSemana: 0, media: 0 })
/** Barras do gráfico: % + segunda-feira da semana (yyyy-MM-dd) para abrir relatórios. */
const chartBars = ref<Array<{ pct: number; weekStart: string }>>([])

const showWeekReportsModal = ref(false)
const selectedWeekStart = ref<string | null>(null)

function openWeekReports(weekStart: string) {
  if (!weekStart || !props.cellId) return
  selectedWeekStart.value = weekStart
  showWeekReportsModal.value = true
}

async function loadFrequencia() {
  if (!props.cellId) return
  try {
    const data = await adminService.obterEstatisticasFrequencia(props.cellId)
    if (data.culto) frequenciaCulto.value = data.culto
    if (data.celula) frequenciaCelula.value = data.celula
    const s = Array.isArray(data.series) ? data.series : []
    const w = Array.isArray(data.seriesSemanas) ? data.seriesSemanas : []
    const maxBarras = 8
    const sliceStart = Math.max(0, s.length - maxBarras)
    chartBars.value = s.slice(sliceStart).map((pct, idx) => ({
      pct,
      weekStart: w[sliceStart + idx] || '',
    }))
  } catch (error) {
    console.error('Erro ao carregar estatísticas de frequência:', error)
    chartBars.value = []
  }
}

async function loadCelulaDetalhe() {
  if (!props.cellId) {
    celulaDetalhe.value = null
    return
  }
  try {
    const c = await adminService.obterCelula(props.cellId)
    celulaDetalhe.value = {
      lider: c.lider ? { id: c.lider.id, nome: c.lider.nome } : undefined,
      coLider: c.coLider ? { nome: c.coLider.nome } : null,
    }
  } catch (e) {
    console.warn('[CellMembersModal] detalhe célula:', e)
    celulaDetalhe.value = null
  }
}

async function loadMembers() {
  if (!props.cellId) return
  try {
    loading.value = true
    await Promise.all([loadMembersData(), loadFrequencia(), loadRede(), loadCelulaDetalhe()])
  } finally {
    loading.value = false
  }
}

async function loadMembersData() {
  if (!props.cellId) return
  try {
    const data = await adminService.listarMembrosCelula(props.cellId)
    membros.value = Array.isArray(data) ? data : (data?.membros || [])
  } catch (error) {
    console.error('Erro ao carregar membros:', error)
    membros.value = []
  }
}

watch(() => props.isOpen, (open) => { if (open) loadMembers() })
watch(() => props.cellId, () => { if (props.isOpen) loadMembers() })
</script>

<template>
  <!-- Mobile: Fullscreen App-like -->
  <Teleport to="body">
    <div v-if="isOpen" class="modal-backdrop" @click.self="emit('close')">
      <!-- Modal Container -->
      <div class="modal-panel modal-panel-xl" @click.stop>
      <!-- Header Fixo (App-like no mobile) -->
      <div class="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-white">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <!-- Botão voltar no mobile (estilo app) -->
          <button 
            @click="emit('close')" 
            class="sm:hidden flex-shrink-0 w-10 h-10 flex items-center justify-center -ml-2 text-gray-600 active:text-gray-900 active:bg-gray-100 rounded-full transition-colors"
            aria-label="Voltar"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div class="flex-1 min-w-0">
            <h3 class="text-base sm:text-lg font-medium text-gray-900 truncate">
              Membros da Célula
            </h3>
            <p v-if="cellName" class="text-xs sm:hidden text-gray-500 truncate mt-0.5">{{ cellName }}</p>
            <span v-if="cellName" class="hidden sm:inline text-sm text-gray-500"> - {{ cellName }}</span>
          </div>
        </div>
        <!-- Botão fechar apenas no desktop -->
        <button 
          @click="emit('close')" 
          class="hidden sm:flex flex-shrink-0 w-8 h-8 items-center justify-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors text-xl font-bold"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>
      
      <!-- Conteúdo com Scroll (tudo dentro de uma única área scrollável) -->
      <div class="flex-1 overflow-y-auto overscroll-contain -webkit-overflow-scrolling-touch">
        <!-- Composição da célula (líder, co-líderes, anfitriões, consolidadores) -->
        <div class="px-4 sm:px-6 py-3 border-b border-gray-100 bg-gray-50/70">
          <div class="flex items-start gap-3">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 min-w-0 flex-1">
              <div
                v-for="papel in equipeCelula"
                :key="papel.id"
                class="min-w-0 rounded-lg border border-gray-200/80 bg-white px-3 py-2 shadow-sm flex flex-col"
              >
                <p
                  class="text-[11px] font-medium uppercase tracking-wide truncate flex items-center gap-1"
                  :class="papel.labelClass"
                >
                  <span class="truncate">{{ papel.label }}</span>
                  <span
                    v-if="papel.nomes.length > 1"
                    class="shrink-0 text-[10px] font-semibold tabular-nums normal-case tracking-normal opacity-80"
                  >
                    ({{ papel.nomes.length }})
                  </span>
                </p>
                <p
                  v-if="papel.nomes.length === 0"
                  class="mt-1 text-sm text-gray-400 leading-snug"
                >
                  —
                </p>
                <p
                  v-else-if="papel.nomes.length === 1"
                  class="mt-1 text-sm sm:text-[15px] font-semibold text-gray-900 truncate leading-snug"
                  :title="papel.nomes[0]"
                >
                  {{ papel.nomes[0] }}
                </p>
                <ul
                  v-else
                  class="mt-1 flex flex-col gap-1 min-w-0 max-h-[5.5rem] overflow-y-auto overscroll-contain"
                  :aria-label="`${papel.label}: ${formatNomesLista(papel.nomes)}`"
                >
                  <li v-for="nome in papel.nomes" :key="nome" class="min-w-0">
                    <span
                      class="block w-full truncate rounded-md px-2 py-1 text-xs sm:text-sm font-medium ring-1 ring-inset leading-snug"
                      :class="papel.chipClass"
                      :title="nome"
                    >
                      {{ nome }}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
            <button
              v-if="cellId && redeData"
              type="button"
              class="rounded-full p-2 text-gray-500 hover:bg-white hover:text-gray-700 shrink-0 mt-0.5"
              title="Atualizar rede"
              aria-label="Atualizar rede"
              @click="loadRede()"
            >
              <AppIcon name="refresh" size="sm" />
            </button>
          </div>
        </div>

        <!-- Rede + membros -->
        <div class="px-4 sm:px-6 pb-4 pt-4 border-b border-gray-100">
          <div v-if="loading" class="text-center text-gray-500 py-8 text-sm">Carregando…</div>
          <template v-else>
            <!-- Mobile -->
            <div class="sm:hidden space-y-2">
              <div
                v-for="m in linhasTabela"
                :key="m.ehLider ? 'lider' : m.id"
                :role="m.ehLider ? undefined : 'button'"
                :tabindex="m.ehLider ? undefined : 0"
                class="rounded-lg border px-3 py-2.5 flex flex-col gap-2 shadow-sm transition-colors touch-manipulation"
                :class="[
                  m.ehLider
                    ? 'bg-primary-50/80 border-primary-100'
                    : membroSemRede(m)
                      ? 'bg-rose-50/90 border-rose-200/80 active:bg-gray-50 cursor-pointer'
                      : 'bg-white border-gray-100 active:bg-gray-50 cursor-pointer',
                ]"
                @click="!m.ehLider && handleMembroClick(m)"
                @keydown.enter.prevent="!m.ehLider && handleMembroClick(m)"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <div
                    class="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
                    :class="m.ehLider ? 'bg-primary-600' : membroSemRede(m) ? 'bg-rose-400' : 'bg-gradient-to-br from-primary-400 to-primary-600'"
                  >
                    {{ iniciais(m.nome) }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-gray-900 truncate">{{ m.nome }}</p>
                    <div class="flex flex-wrap items-center gap-1 mt-1">
                      <span
                        v-for="badge in badgesDaLinha(m)"
                        :key="badge.key"
                        class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none"
                        :class="badge.class"
                      >
                        {{ badge.label }}
                      </span>
                    </div>
                  </div>
                  <div v-if="!m.ehLider" class="flex-shrink-0 flex items-center gap-1" @click.stop>
                    <button
                      type="button"
                      class="rounded-full p-2 text-gray-500 hover:bg-violet-50 hover:text-violet-600"
                      title="Rede de cuidado"
                      aria-label="Editar rede"
                      @click="abrirModalRede(m.id, m.nome)"
                    >
                      <AppIcon name="heart" size="sm" />
                    </button>
                    <button
                      v-if="cuidadoPorNome.get(m.id)"
                      type="button"
                      class="rounded-full p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      title="Remover da rede"
                      aria-label="Remover da rede"
                      @click="removerDaRede(m.id, m.nome, $event)"
                    >
                      <AppIcon name="close" size="sm" />
                    </button>
                  </div>
                </div>
                <div v-if="!m.ehLider" class="flex items-start justify-between gap-2 text-[11px]">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <AppIcon name="heart" size="xs" class="text-rose-400 flex-shrink-0 mt-0.5" />
                    <template v-if="cuidadoPorNome.get(m.id)">
                      <span class="truncate text-gray-700">{{ cuidadoPorNome.get(m.id) }}</span>
                    </template>
                    <span v-else-if="membroSemRede(m)" class="text-rose-500 text-[11px] font-medium italic"
                      >livre</span
                    >
                    <span v-else class="text-gray-400">—</span>
                  </div>
                  <div class="flex items-center gap-1 flex-shrink-0">
                    <AppIcon name="users" size="xs" class="text-violet-400" />
                    <template v-if="nomesQueCuidadosDe(m).length">
                      <span
                        v-for="(nm, i) in nomesQueCuidadosDe(m).slice(0, 3)"
                        :key="i"
                        class="w-7 h-7 rounded-full bg-violet-100 text-[9px] font-bold text-violet-800 flex items-center justify-center ring-2 ring-white -ml-1 first:ml-0"
                        :title="nm"
                        >{{ iniciais(nm) }}</span
                      >
                      <span
                        v-if="nomesQueCuidadosDe(m).length > 3"
                        class="text-[10px] text-gray-500 ml-1"
                        >+{{ nomesQueCuidadosDe(m).length - 3 }}</span
                      >
                    </template>
                    <span v-else class="text-gray-300 text-lg leading-none px-1">—</span>
                  </div>
                </div>
                <div v-else class="flex items-center gap-1.5 text-[11px] min-w-0">
                  <AppIcon name="users" size="xs" class="text-violet-400 flex-shrink-0" />
                  <template v-if="nomesQueCuidadosDe(m).length">
                    <span class="truncate text-gray-700">{{ nomesQueCuidadosDe(m).join(', ') }}</span>
                  </template>
                  <span v-else class="text-gray-400">—</span>
                </div>
              </div>
              <p v-if="linhasTabela.length === 0" class="text-center text-gray-500 py-10 text-sm">Nenhum membro</p>
            </div>
            <!-- Desktop -->
            <div class="hidden sm:block rounded-lg border border-gray-200 overflow-hidden">
              <table class="min-w-full divide-y divide-gray-200 text-sm">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-3 py-2.5 text-left text-sm font-semibold text-gray-600 w-[30%]" scope="col">
                      <span class="inline-flex items-baseline gap-1.5">
                        Nome
                        <span class="text-xs font-normal tabular-nums text-gray-400">{{ totalMembros }}</span>
                      </span>
                    </th>
                    <th class="px-2 py-2.5 text-left text-sm font-semibold text-gray-600 w-[14%]" scope="col" title="Papel na célula">
                      <span class="inline-flex items-baseline gap-1.5">
                        Papel
                        <span class="text-xs font-normal tabular-nums text-gray-400">{{ totalComPapel }}</span>
                      </span>
                    </th>
                    <th class="px-2 py-2.5 text-left text-sm font-semibold text-gray-600 w-[22%]" scope="col">
                      <span class="inline-flex items-baseline gap-1.5">
                        <span class="inline-flex items-center gap-1">
                          <AppIcon name="heart" size="xs" class="text-rose-400" />Cuidado por
                        </span>
                        <span class="text-xs font-normal tabular-nums text-gray-400">{{ totalComCuidadoPor }}</span>
                      </span>
                    </th>
                    <th class="px-2 py-2.5 text-left text-sm font-semibold text-gray-600 w-[25%]" scope="col">
                      <span class="inline-flex items-baseline gap-1.5">
                        <span class="inline-flex items-center gap-1">
                          <AppIcon name="users" size="xs" class="text-violet-400" />Cuida de
                        </span>
                        <span class="text-xs font-normal tabular-nums text-gray-400">{{ totalCuidados }}</span>
                      </span>
                    </th>
                    <th class="px-2 py-2.5 text-right text-sm font-semibold text-gray-600 w-[15%]" scope="col" title="Rede">
                      &nbsp;
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-100">
                  <tr
                    v-for="m in linhasTabela"
                    :key="m.ehLider ? 'lider' : m.id"
                    class="transition-colors group"
                    :class="[
                      m.ehLider
                        ? 'bg-primary-50/60'
                        : 'cursor-pointer hover:bg-blue-50/60',
                      !m.ehLider && membroSemRede(m) ? 'bg-rose-50/95 hover:bg-rose-50' : '',
                    ]"
                    @click="!m.ehLider && handleMembroClick(m)"
                  >
                    <td class="px-3 py-2 whitespace-nowrap">
                      <div class="flex items-center gap-2 min-w-0">
                        <span
                          class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                          :class="m.ehLider ? 'bg-primary-600' : membroSemRede(m) ? 'bg-rose-400' : 'bg-primary-500'"
                          >{{ iniciais(m.nome) }}</span
                        >
                        <span
                          class="font-medium text-gray-900 truncate"
                          :class="!m.ehLider ? 'group-hover:text-primary-700' : ''"
                        >{{ m.nome }}</span>
                      </div>
                    </td>
                    <td class="px-2 py-2 align-middle">
                      <div class="flex flex-wrap gap-1" @click.stop>
                        <span
                          v-for="badge in badgesDaLinha(m)"
                          :key="badge.key"
                          class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none"
                          :class="badge.class"
                        >
                          {{ badge.label }}
                        </span>
                        <span v-if="!linhaTemPapel(m)" class="text-[10px] text-gray-400">—</span>
                      </div>
                    </td>
                    <td class="px-2 py-2 text-gray-700 min-w-0 max-w-[10rem]" @click.stop>
                      <div class="truncate">
                        <span v-if="m.ehLider" class="text-gray-400">—</span>
                        <span v-else-if="cuidadoPorNome.get(m.id)" class="text-gray-800">{{ cuidadoPorNome.get(m.id) }}</span>
                        <span v-else-if="membroSemRede(m)" class="text-rose-500 text-xs italic">livre</span>
                        <span v-else class="text-gray-400">—</span>
                      </div>
                    </td>
                    <td class="px-2 py-2 min-w-0" @click.stop>
                      <div class="flex items-center gap-1 flex-wrap">
                        <template v-if="nomesQueCuidadosDe(m).length">
                          <span
                            v-for="(nm, i) in nomesQueCuidadosDe(m).slice(0, 4)"
                            :key="i"
                            class="w-8 h-8 rounded-full bg-violet-100 text-[10px] font-bold text-violet-900 flex items-center justify-center shadow-sm ring-2 ring-white -ml-1 first:ml-0 cursor-default"
                            :title="nm"
                            >{{ iniciais(nm) }}</span
                          >
                          <span
                            v-if="nomesQueCuidadosDe(m).length > 4"
                            class="text-[11px] text-gray-400 ml-0.5"
                            >+{{ nomesQueCuidadosDe(m).length - 4 }}</span
                          >
                        </template>
                        <span v-else class="text-gray-300">—</span>
                      </div>
                    </td>
                    <td class="px-2 py-2 text-right whitespace-nowrap align-middle">
                      <div v-if="!m.ehLider" class="flex items-center justify-end gap-1" @click.stop>
                        <button
                          type="button"
                          class="rounded-full p-1.5 text-gray-400 hover:bg-violet-100 hover:text-violet-600"
                          title="Editar rede de cuidado"
                          aria-label="Editar rede"
                          @click="abrirModalRede(m.id, m.nome)"
                        >
                          <AppIcon name="edit" size="sm" />
                        </button>
                        <button
                          v-if="cuidadoPorNome.get(m.id)"
                          type="button"
                          class="rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                          title="Remover da rede"
                          aria-label="Remover da rede"
                          @click="removerDaRede(m.id, m.nome, $event)"
                        >
                          <AppIcon name="close" size="xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="linhasTabela.length === 0" class="py-12 text-center text-gray-500 text-sm">Nenhum membro</div>
            </div>
          </template>
        </div>

        <!-- Frequência -->
        <div class="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 pb-6 sm:pb-8">
          <div class="flex items-center gap-2 mb-3 text-gray-900">
            <AppIcon name="chart-bar" size="sm" class="text-violet-500 flex-shrink-0" />
            <span class="text-sm font-semibold">Frequência (últimas semanas)</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div class="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
                <AppIcon name="calendar" size="sm" class="text-sky-500 flex-shrink-0" />
                Culto
              </div>
              <dl class="space-y-1.5 text-xs text-gray-600">
                <div class="flex justify-between gap-2">
                  <dt>Última semana</dt>
                  <dd class="font-semibold tabular-nums text-green-600">{{ frequenciaCulto.ultimaSemana }}%</dd>
                </div>
                <div class="flex justify-between gap-2">
                  <dt>Penúltima semana</dt>
                  <dd class="font-semibold tabular-nums text-blue-600">{{ frequenciaCulto.penultimaSemana }}%</dd>
                </div>
                <div class="flex justify-between gap-2 pt-1 border-t border-gray-200/80">
                  <dt>Média</dt>
                  <dd class="font-semibold tabular-nums text-primary-600">{{ frequenciaCulto.media }}%</dd>
                </div>
              </dl>
            </div>
            <div class="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div class="flex items-center gap-2 text-sm font-medium text-gray-800 mb-2">
                <AppIcon name="users" size="sm" class="text-violet-500 flex-shrink-0" />
                Célula
              </div>
              <dl class="space-y-1.5 text-xs text-gray-600">
                <div class="flex justify-between gap-2">
                  <dt>Última semana</dt>
                  <dd class="font-semibold tabular-nums text-green-600">{{ frequenciaCelula.ultimaSemana }}%</dd>
                </div>
                <div class="flex justify-between gap-2">
                  <dt>Penúltima semana</dt>
                  <dd class="font-semibold tabular-nums text-blue-600">{{ frequenciaCelula.penultimaSemana }}%</dd>
                </div>
                <div class="flex justify-between gap-2 pt-1 border-t border-gray-200/80">
                  <dt>Média</dt>
                  <dd class="font-semibold tabular-nums text-primary-600">{{ frequenciaCelula.media }}%</dd>
                </div>
              </dl>
            </div>
          </div>

          <div v-if="chartBars.length" class="mt-2">
            <p class="text-xs text-gray-500 mb-2 sm:hidden">Toque numa barra para ver os relatórios da semana.</p>
            <p class="text-xs text-gray-500 mb-2 hidden sm:block">Clique numa barra para ver os relatórios da semana.</p>
            <div class="h-24 sm:h-28 flex items-stretch gap-1.5 sm:gap-2">
              <button
                v-for="(bar, i) in chartBars"
                :key="`${bar.weekStart}-${i}`"
                type="button"
                class="flex-1 flex flex-col justify-end min-w-0 min-h-[52px] rounded-md touch-manipulation transition-opacity active:opacity-90 disabled:opacity-40 disabled:pointer-events-none focus-visible:outline focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
                :disabled="!bar.weekStart"
                :title="bar.weekStart ? `Semana • ${bar.pct}% • relatórios` : ''"
                :aria-label="bar.weekStart ? `Semana, ${bar.pct}%. Abrir relatórios` : `Semana ${i + 1}`"
                @click="openWeekReports(bar.weekStart)"
              >
                <div
                  class="w-full mx-auto max-w-[2.75rem] rounded-md bg-violet-200/95 ring-1 ring-violet-300/70 border border-violet-100/90 shadow-sm"
                  :style="{ height: Math.max(8, Math.min(100, bar.pct)) + '%' }"
                />
              </button>
            </div>
            <div class="mt-1.5 text-xs text-gray-500">
              Gráfico: últimas {{ chartBars.length }} semanas · frequência na célula (relatório %)
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
  </Teleport>

  <TransitionRoot appear :show="showRedeModal" as="template">
    <Dialog as="div" class="relative z-[70]" @close="fecharModalRede">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/30" aria-hidden="true" />
      </TransitionChild>
      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-end sm:items-center justify-center p-4">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 translate-y-4 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:scale-95"
          >
            <DialogPanel class="modal-dialog-panel max-w-sm p-5">
              <DialogTitle class="flex items-center gap-2 text-base font-semibold text-gray-900">
                <AppIcon name="heart" size="sm" class="text-rose-500" />
                <span>Cuidador</span>
              </DialogTitle>
              <p v-if="modalMembroNome" class="mt-2 text-sm text-gray-600 truncate">{{ modalMembroNome }}</p>
              <div class="mt-4 space-y-2">
                <label class="sr-only" for="modal-cuidador-select">Cuidador</label>
                <select
                  id="modal-cuidador-select"
                  v-model="modalCuidadorSelecionado"
                  class="w-full rounded-xl border border-gray-300 text-sm px-3 py-2.5 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">—</option>
                  <option v-for="opt in opcoesCuidadores" :key="opt.key" :value="opt.key">{{ opt.label }}</option>
                </select>
                <p v-if="modalError" class="text-xs text-red-600">{{ modalError }}</p>
                <div class="flex gap-2 pt-2">
                  <button
                    type="button"
                    class="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
                    @click="fecharModalRede"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    class="flex-1 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                    :disabled="salvandoRede"
                    @click="confirmarAtribuicaoRede"
                  >
                    {{ salvandoRede ? '…' : 'OK' }}
                  </button>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>

  <!-- Modal de Frequência do Membro -->
  <MemberFrequencyModal
    :is-open="showFrequencyModal"
    :membro-id="selectedMembro?.id || null"
    :membro-nome="selectedMembro?.nome || ''"
    :celula-id="cellId"
    @close="showFrequencyModal = false"
  />

  <CellWeekReportsModal
    :is-open="showWeekReportsModal"
    :celula-id="cellId"
    :week-start="selectedWeekStart"
    :cell-name="cellName"
    @close="showWeekReportsModal = false"
  />
</template>


