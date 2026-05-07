<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Teleport } from 'vue'
import { format, parseISO, endOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import relatorioService, { STATUS_RELATORIO, TIPO_EVENTO } from '../services/relatorioService'

interface RelResumo {
  id: number
  evento: number
  status: number
  dataInicio: string | Date
  dataFim: string | Date
  observacoes?: string | null
  presentesCelula?: number
  totalCelula?: number
  presentesCulto?: number
  totalCulto?: number
}

const props = defineProps<{
  isOpen: boolean
  celulaId: number | null
  weekStart: string | null
  cellName?: string
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const loading = ref(false)
const relatorios = ref<RelResumo[]>([])
const errorMsg = ref('')

const tituloSemana = computed(() => {
  if (!props.weekStart) return ''
  try {
    const start = parseISO(props.weekStart)
    const end = endOfWeek(start, { weekStartsOn: 1 })
    return `${format(start, "d MMM", { locale: ptBR })} – ${format(end, "d MMM yyyy", { locale: ptBR })}`
  } catch {
    return ''
  }
})

function labelEvento(evento: number): string {
  return evento === TIPO_EVENTO.CELULA ? 'Célula' : 'Culto'
}

function pct(p: number | undefined, t: number | undefined): string {
  const pp = Number(p)
  const tt = Number(t)
  if (!tt || Number.isNaN(tt)) return '—'
  return `${Math.round((pp / tt) * 100)}%`
}

function formatPeriodo(a: string | Date, b: string | Date): string {
  return relatorioService.formatarPeriodo(a, b)
}

watch(
  () => [props.isOpen, props.celulaId, props.weekStart] as const,
  async ([open, cid, ws]) => {
    if (!open || !cid || !ws) {
      relatorios.value = []
      errorMsg.value = ''
      return
    }
    loading.value = true
    errorMsg.value = ''
    try {
      const start = parseISO(ws)
      const end = endOfWeek(start, { weekStartsOn: 1 })
      const dataInicio = format(start, 'yyyy-MM-dd')
      const dataFim = format(end, 'yyyy-MM-dd')
      const list = (await relatorioService.listarRelatorios({
        celulaId: cid,
        dataInicio,
        dataFim,
      })) as RelResumo[]
      const arr = Array.isArray(list) ? list : []
      relatorios.value = arr
        .filter((r) => r.status === STATUS_RELATORIO.ENVIADO)
        .sort((a, b) => a.evento - b.evento)
    } catch (e: unknown) {
      const m = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Erro ao carregar relatórios.'
      errorMsg.value = m
      relatorios.value = []
    } finally {
      loading.value = false
    }
  },
  { immediate: true }
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[100] sm:flex sm:items-center sm:justify-center sm:p-4 sm:bg-gray-500 sm:bg-opacity-75"
    >
      <div
        class="hidden sm:block fixed inset-0 bg-gray-500 bg-opacity-60"
        aria-hidden="true"
        @click="emit('close')"
      />
      <div
        class="bg-white w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-lg sm:rounded-xl sm:shadow-xl flex flex-col sm:relative overflow-hidden"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="'cell-week-reports-title'"
      >
        <div
          class="px-4 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between gap-3 flex-shrink-0 bg-white"
        >
          <button
            type="button"
            class="sm:hidden flex-shrink-0 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-1 text-gray-600 active:bg-gray-100 rounded-full"
            aria-label="Fechar"
            @click="emit('close')"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div class="flex-1 min-w-0">
            <h3 id="cell-week-reports-title" class="text-base sm:text-lg font-semibold text-gray-900 truncate">
              Relatórios da semana
            </h3>
            <p class="text-xs sm:text-sm text-gray-500 truncate">
              {{ tituloSemana }}<span v-if="cellName"> · {{ cellName }}</span>
            </p>
          </div>
          <button
            type="button"
            class="hidden sm:flex flex-shrink-0 w-10 h-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
            aria-label="Fechar"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>

        <div class="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          <div v-if="loading" class="text-center text-gray-500 py-10 text-sm">Carregando…</div>
          <div v-else-if="errorMsg" class="rounded-lg bg-red-50 text-red-800 text-sm p-3">{{ errorMsg }}</div>
          <div v-else-if="relatorios.length === 0" class="text-center text-gray-500 py-10 text-sm">
            Nenhum relatório enviado nesta semana.
          </div>
          <ul v-else class="space-y-3">
            <li
              v-for="rel in relatorios"
              :key="rel.id"
              class="rounded-xl border border-violet-100 bg-violet-50/40 px-4 py-3"
            >
              <div class="flex items-center justify-between gap-2 mb-2">
                <span class="text-sm font-semibold text-violet-900">{{ labelEvento(rel.evento) }}</span>
                <span class="text-xs text-gray-500">
                  {{ formatPeriodo(rel.dataInicio, rel.dataFim) }}
                </span>
              </div>
              <div class="grid grid-cols-2 gap-2 text-xs text-gray-700">
                <div class="rounded-lg bg-white/80 px-2 py-2 border border-gray-100">
                  <div class="text-gray-500 mb-0.5">Freq. célula</div>
                  <div class="font-semibold text-gray-900">
                    {{ rel.presentesCelula ?? 0 }}/{{ rel.totalCelula ?? 0 }}
                    <span class="text-violet-700 font-normal">({{ pct(rel.presentesCelula, rel.totalCelula) }})</span>
                  </div>
                </div>
                <div class="rounded-lg bg-white/80 px-2 py-2 border border-gray-100">
                  <div class="text-gray-500 mb-0.5">Freq. culto</div>
                  <div class="font-semibold text-gray-900">
                    {{ rel.presentesCulto ?? 0 }}/{{ rel.totalCulto ?? 0 }}
                    <span class="text-violet-700 font-normal">({{ pct(rel.presentesCulto, rel.totalCulto) }})</span>
                  </div>
                </div>
              </div>
              <p v-if="rel.observacoes" class="mt-2 text-xs text-gray-600 leading-snug border-t border-violet-100/80 pt-2">
                {{ rel.observacoes }}
              </p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </Teleport>
</template>
