<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { adminService } from '../services/adminService'

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

const loading = ref(false)
const membros = ref<Membro[]>([])
const search = ref('')

const filtered = computed(() => {
  const term = search.value.toLowerCase().trim()
  return membros.value.filter(m =>
    !term || m.nome.toLowerCase().includes(term) || (m.telefone || '').includes(term)
  )
})

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
  const data = await adminService.listarMembrosCelula(props.cellId)
  membros.value = Array.isArray(data) ? data : (data?.membros || [])
}

watch(() => props.isOpen, (open) => { if (open) loadMembers() })
watch(() => props.cellId, () => { if (props.isOpen) loadMembers() })
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl sm:max-w-3xl w-full mx-4">
      <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 class="text-lg font-medium text-gray-900">
          Membros da Célula <span v-if="cellName">- {{ cellName }}</span>
        </h3>
        <button @click="emit('close')" class="text-gray-500 hover:text-gray-700">✕</button>
      </div>

      <div class="px-6 py-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div class="rounded-lg bg-primary-50 p-3 text-center">
          <div class="text-xs text-primary-700">Total</div>
          <div class="text-xl font-semibold text-primary-900">{{ totalMembros }}</div>
        </div>
        <div class="rounded-lg bg-green-50 p-3 text-center">
          <div class="text-xs text-green-700">Ativos</div>
          <div class="text-xl font-semibold text-green-900">{{ ativos }}</div>
        </div>
        <div class="rounded-lg bg-purple-50 p-3 text-center">
          <div class="text-xs text-purple-700">Consol.</div>
          <div class="text-xl font-semibold text-purple-900">{{ consolidadores }}</div>
        </div>
        <div class="rounded-lg bg-yellow-50 p-3 text-center">
          <div class="text-xs text-yellow-700">Co-líderes</div>
          <div class="text-xl font-semibold text-yellow-900">{{ colideres }}</div>
        </div>
        <div class="rounded-lg bg-blue-50 p-3 text-center">
          <div class="text-xs text-blue-700">Anfitriões</div>
          <div class="text-xl font-semibold text-blue-900">{{ anfitrioes }}</div>
        </div>
      </div>

      <!-- Dashboard de Frequência (visual) -->
      <div class="px-6 py-4 border-t border-gray-200">
        <h4 class="text-md font-medium text-gray-900 mb-3">Frequência (últimas semanas)</h4>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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

      <div class="px-6 pb-4">
        <input
          v-model="search"
          type="text"
          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          placeholder="Buscar membro por nome ou telefone"
        />
      </div>

       <div class="px-6 pb-6 max-h-80 overflow-auto">
        <div v-if="loading" class="text-center text-gray-500 py-6">Carregando...</div>
        <table v-else class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefone</th>
               <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargos</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="m in filtered" :key="m.id">
              <td class="px-4 py-2 text-sm text-gray-800">{{ m.nome }}</td>
              <td class="px-4 py-2 text-sm text-gray-500">{{ m.telefone || '-' }}</td>
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
      </div>
    </div>
  </div>
</template>


