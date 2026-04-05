<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { Teleport } from 'vue'
import { adminService } from '../services/adminService'
import MemberFrequencyModal from './MemberFrequencyModal.vue'

interface Membro {
  id: number
  nome: string
  telefone?: string
  ativo: boolean
  dataCadastro?: string
  ehConsolidador?: boolean
  ehCoLider?: boolean
  ehAnfitriao?: boolean
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
  selectedMembro.value = { id: membro.id, nome: membro.nome }
  showFrequencyModal.value = true
}

const loading = ref(false)
const membros = ref<Membro[]>([])

const totalMembros = computed(() => membros.value.length)
const ativos = computed(() => membros.value.filter(m => m.ativo).length)
const colideres = computed(() => membros.value.filter(m => m.ehCoLider).length)
const consolidadores = computed(() => membros.value.filter(m => m.ehConsolidador).length)
const anfitrioes = computed(() => membros.value.filter(m => m.ehAnfitriao).length)

// Dashboard de frequência
const frequenciaCulto = ref({ ultimaSemana: 0, penultimaSemana: 0, media: 0 })
const frequenciaCelula = ref({ ultimaSemana: 0, penultimaSemana: 0, media: 0 })
const ultimasSemanas = ref<number[]>([]) // percentuais da série (0..100)

async function loadFrequencia() {
  if (!props.cellId) return
  try {
    const data = await adminService.obterEstatisticasFrequencia(props.cellId)
    if (data.culto) frequenciaCulto.value = data.culto
    if (data.celula) frequenciaCelula.value = data.celula
    if (Array.isArray(data.series)) {
      ultimasSemanas.value = data.series.slice(-8)
    }
  } catch (error) {
    console.error('Erro ao carregar estatísticas de frequência:', error)
  }
}

async function loadMembers() {
  if (!props.cellId) return
  try {
    loading.value = true
    await Promise.all([
      loadMembersData(),
      loadFrequencia()
    ])
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
    <div v-if="isOpen" class="fixed inset-0 z-50 sm:bg-gray-500 sm:bg-opacity-75 sm:flex sm:items-center sm:justify-center sm:p-4">
      <!-- Overlay apenas no desktop -->
      <div v-if="isOpen" class="hidden sm:block fixed inset-0 bg-gray-500 bg-opacity-75" @click="emit('close')"></div>
      
      <!-- Modal Container -->
      <div class="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-lg sm:shadow-xl flex flex-col sm:relative">
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
        <!-- Estatísticas -->
        <div class="px-4 sm:px-6 py-3 sm:py-4 grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          <div class="rounded-lg bg-primary-50 p-2 sm:p-3 text-center">
            <div class="text-xs text-primary-700">Total</div>
            <div class="text-lg sm:text-xl font-semibold text-primary-900">{{ totalMembros }}</div>
          </div>
          <div class="rounded-lg bg-green-50 p-2 sm:p-3 text-center">
            <div class="text-xs text-green-700">Ativos</div>
            <div class="text-lg sm:text-xl font-semibold text-green-900">{{ ativos }}</div>
          </div>
          <div class="rounded-lg bg-brand-50 dark:bg-brand-950/40 p-2 sm:p-3 text-center">
            <div class="text-xs text-purple-700">Consol.</div>
            <div class="text-lg sm:text-xl font-semibold text-purple-900">{{ consolidadores }}</div>
          </div>
          <div class="rounded-lg bg-yellow-50 p-2 sm:p-3 text-center">
            <div class="text-xs text-yellow-700">Co-líderes</div>
            <div class="text-lg sm:text-xl font-semibold text-yellow-900">{{ colideres }}</div>
          </div>
          <div class="rounded-lg bg-blue-50 p-2 sm:p-3 text-center">
            <div class="text-xs text-blue-700">Anfitriões</div>
            <div class="text-lg sm:text-xl font-semibold text-blue-900">{{ anfitrioes }}</div>
          </div>
        </div>

        <!-- Dashboard de Frequência (visual) -->
        <div class="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
          <h4 class="text-sm sm:text-md font-medium text-gray-900 mb-2 sm:mb-3">Frequência (últimas semanas)</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div class="bg-gray-50 rounded-lg p-3">
              <div class="text-sm font-medium text-gray-700 mb-2">Culto</div>
              <div class="space-y-1">
                <div class="flex justify-between text-xs">
                  <span>Última semana:</span>
                  <span class="font-semibold text-green-600">{{ frequenciaCulto.ultimaSemana }}%</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span>Penúltima:</span>
                  <span class="font-semibold text-blue-600">{{ frequenciaCulto.penultimaSemana }}%</span>
                </div>
                <div class="flex justify-between text-xs border-t pt-1">
                  <span>Média:</span>
                  <span class="font-semibold text-primary-600">{{ frequenciaCulto.media }}%</span>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 rounded-lg p-3">
              <div class="text-sm font-medium text-gray-700 mb-2">Célula</div>
              <div class="space-y-1">
                <div class="flex justify-between text-xs">
                  <span>Última semana:</span>
                  <span class="font-semibold text-green-600">{{ frequenciaCelula.ultimaSemana }}%</span>
                </div>
                <div class="flex justify-between text-xs">
                  <span>Penúltima:</span>
                  <span class="font-semibold text-blue-600">{{ frequenciaCelula.penultimaSemana }}%</span>
                </div>
                <div class="flex justify-between text-xs border-t pt-1">
                  <span>Média:</span>
                  <span class="font-semibold text-primary-600">{{ frequenciaCelula.media }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Mini gráfico de barras das últimas semanas -->
          <div v-if="ultimasSemanas.length" class="mt-2">
            <div class="h-24 flex items-end gap-1">
              <div v-for="(v, i) in ultimasSemanas" :key="i" class="flex-1 bg-primary-200 rounded-sm"
                :style="{ height: Math.max(4, Math.min(100, v)) + '%' }"
                :title="`Semana ${i+1}: ${v}%`"
              ></div>
            </div>
            <div class="mt-1 text-xs text-gray-500">Últimas {{ ultimasSemanas.length }} semanas</div>
          </div>
        </div>

        <!-- Lista de membros (área scrollável) -->
        <div class="px-4 sm:px-6 pb-6 sm:pb-8">
          <div v-if="loading" class="text-center text-gray-500 py-6">Carregando...</div>
          
          <template v-else>
            <!-- Versão Mobile: Cards (App-like) -->
            <div class="sm:hidden space-y-1">
              <div
                v-for="m in membros"
                :key="m.id"
                @click="handleMembroClick(m)"
                class="bg-white border-b border-gray-100 py-2.5 active:bg-gray-50 transition-colors cursor-pointer"
              >
                <div class="flex items-center gap-2 text-xs sm:text-sm">
                  <span class="font-semibold text-gray-900 min-w-[80px] flex-shrink-0">{{ m.nome }}</span>
                  <span class="text-gray-500 min-w-[100px] flex-shrink-0">{{ m.telefone || '-' }}</span>
                  <div class="flex flex-wrap gap-1 flex-1">
                    <span v-if="m.ehConsolidador" class="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                      Consol.
                    </span>
                    <span v-if="m.ehCoLider" class="px-1.5 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                      Co-líder
                    </span>
                    <span v-if="m.ehAnfitriao" class="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      Anfit.
                    </span>
                    <span v-if="!m.ehConsolidador && !m.ehCoLider && !m.ehAnfitriao" class="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                      Membro
                    </span>
                  </div>
                </div>
              </div>
              <div v-if="membros.length === 0" class="text-center text-gray-500 py-8">
                <p class="text-sm">Nenhum membro encontrado</p>
              </div>
            </div>

            <!-- Versão Desktop: Tabela -->
            <div class="hidden sm:block">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargos</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr 
                  v-for="m in membros" 
                  :key="m.id"
                  @click="handleMembroClick(m)"
                  class="cursor-pointer hover:bg-blue-50 hover:shadow-sm transition-all duration-200 border-l-4 border-l-transparent hover:border-l-primary-500 group"
                >
                  <td class="px-4 py-2 text-sm font-medium text-gray-900 group-hover:text-primary-700 transition-colors">{{ m.nome }}</td>
                  <td class="px-4 py-2 text-sm text-gray-500 group-hover:text-gray-700 transition-colors">{{ m.telefone || '-' }}</td>
                  <td class="px-4 py-2 text-sm">
                    <div class="flex flex-wrap gap-1">
                      <span v-if="m.ehConsolidador" class="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                        Consolidador
                      </span>
                      <span v-if="m.ehCoLider" class="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        Co-líder
                      </span>
                      <span v-if="m.ehAnfitriao" class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        Anfitrião
                      </span>
                      <span v-if="!m.ehConsolidador && !m.ehCoLider && !m.ehAnfitriao" class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                        Membro
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="membros.length === 0" class="text-center text-gray-500 py-6">
              Nenhum membro encontrado
            </div>
          </div>
          </template>
        </div>
      </div>
    </div>
  </div>
  </Teleport>

  <!-- Modal de Frequência do Membro -->
  <MemberFrequencyModal
    :is-open="showFrequencyModal"
    :membro-id="selectedMembro?.id || null"
    :membro-nome="selectedMembro?.nome || ''"
    :celula-id="cellId"
    @close="showFrequencyModal = false"
  />
</template>


