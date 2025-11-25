<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useMemberStore } from '../stores/memberStore'
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import relatorioService from '../services/relatorioService'
import FrequencyChart from '../components/FrequencyChart.vue'
import AppIcon from '../components/AppIcon.vue'

const memberStore = useMemberStore()

// Estados
const loading = ref(false)
const error = ref<string | null>(null)
const periodoSelecionado = ref<'mes' | '3meses' | '6meses' | 'ano'>('mes')

// Estatísticas por período
const estatisticas = ref({
  mes: { culto: { presentes: 0, total: 0, percentual: 0, eventos: 0 }, celula: { presentes: 0, total: 0, percentual: 0, eventos: 0 } },
  '3meses': { culto: { presentes: 0, total: 0, percentual: 0, eventos: 0 }, celula: { presentes: 0, total: 0, percentual: 0, eventos: 0 } },
  '6meses': { culto: { presentes: 0, total: 0, percentual: 0, eventos: 0 }, celula: { presentes: 0, total: 0, percentual: 0, eventos: 0 } },
  ano: { culto: { presentes: 0, total: 0, percentual: 0, eventos: 0 }, celula: { presentes: 0, total: 0, percentual: 0, eventos: 0 } }
})

// Estatísticas por membro para o período selecionado
interface EstatisticaMembro {
  id: string
  nome: string
  culto: { presentes: number; total: number; percentual: number }
  celula: { presentes: number; total: number; percentual: number }
}

const estatisticasMembros = ref<EstatisticaMembro[]>([])

// Calcular range de datas baseado no período
const getPeriodRange = (periodo: string) => {
  const hoje = new Date()
  let inicio: Date
  let fim = endOfMonth(hoje)

  switch (periodo) {
    case '3meses':
      inicio = startOfMonth(subMonths(hoje, 2))
      break
    case '6meses':
      inicio = startOfMonth(subMonths(hoje, 5))
      break
    case 'ano':
      inicio = startOfYear(hoje)
      break
    default: // mes
      inicio = startOfMonth(hoje)
  }

  return { inicio, fim }
}

// Carregar estatísticas
async function carregarEstatisticas() {
  if (!memberStore.celulaId) {
    await memberStore.carregarMembros()
    if (!memberStore.celulaId) return
  }

  loading.value = true
  error.value = null
  
  try {
    const periodos: Array<'mes' | '3meses' | '6meses' | 'ano'> = ['mes', '3meses', '6meses', 'ano']
    
    for (const periodo of periodos) {
      const { inicio, fim } = getPeriodRange(periodo)
      
      const relatorios = await relatorioService.listarRelatorios({
        celulaId: memberStore.celulaId!,
        dataInicio: inicio,
        dataFim: fim
      })

      // Filtrar apenas relatórios enviados
      const relatoriosEnviados = relatorios.filter(r => r.status === 1)

      const totalMembros = memberStore.getActiveMembers.length

      // Calcular estatísticas de culto - buscar presenças de culto (tipo === 1) em todos os relatórios
      let presentesCulto = 0
      let eventosCulto = 0
      
      // Contar quantos relatórios têm presenças de culto
      const relatoriosComCulto = new Set<number>()

      for (const rel of relatoriosEnviados) {
        // Usar dados já disponíveis no relatório ou buscar detalhes se necessário
        const presentes = (rel as any).presentesCulto
        
        if (presentes === undefined) {
          // Se não tiver dados agregados, buscar detalhes
          const detalhes = await relatorioService.obterRelatorio(rel.id)
          const presentesDetalhes = detalhes.presencas?.filter(p => p.status === 1 && p.tipo === 1).length || 0
          if (presentesDetalhes > 0) {
            relatoriosComCulto.add(rel.id)
            presentesCulto += presentesDetalhes
          }
        } else {
          if (presentes > 0) {
            relatoriosComCulto.add(rel.id)
            presentesCulto += presentes
          }
        }
      }
      
      eventosCulto = relatoriosComCulto.size

      // Calcular estatísticas de célula - buscar presenças de célula (tipo === 0) em todos os relatórios
      let presentesCelula = 0
      let eventosCelula = 0
      
      // Contar quantos relatórios têm presenças de célula
      const relatoriosComCelula = new Set<number>()

      for (const rel of relatoriosEnviados) {
        // Usar dados já disponíveis no relatório ou buscar detalhes se necessário
        const presentes = (rel as any).presentesCelula
        
        if (presentes === undefined) {
          // Se não tiver dados agregados, buscar detalhes
          const detalhes = await relatorioService.obterRelatorio(rel.id)
          const presentesDetalhes = detalhes.presencas?.filter(p => p.status === 1 && p.tipo === 0).length || 0
          if (presentesDetalhes > 0) {
            relatoriosComCelula.add(rel.id)
            presentesCelula += presentesDetalhes
          }
        } else {
          if (presentes > 0) {
            relatoriosComCelula.add(rel.id)
            presentesCelula += presentes
          }
        }
      }
      
      eventosCelula = relatoriosComCelula.size

      // Total = número de eventos × número de membros
      const totalCulto = eventosCulto * totalMembros
      const totalCelula = eventosCelula * totalMembros

      estatisticas.value[periodo] = {
        culto: {
          presentes: presentesCulto,
          total: totalCulto,
          percentual: totalCulto > 0 ? Math.round((presentesCulto / totalCulto) * 100) : 0,
          eventos: eventosCulto
        },
        celula: {
          presentes: presentesCelula,
          total: totalCelula,
          percentual: totalCelula > 0 ? Math.round((presentesCelula / totalCelula) * 100) : 0,
          eventos: eventosCelula
        }
      }
    }

    // Carregar estatísticas por membro para o período selecionado
    await carregarEstatisticasMembros()
  } catch (e: any) {
    console.error('Erro ao carregar estatísticas:', e)
    error.value = e.message || 'Erro ao carregar dados'
  } finally {
    loading.value = false
  }
}

// Carregar estatísticas por membro
async function carregarEstatisticasMembros() {
  if (!memberStore.celulaId) return

  try {
    const { inicio, fim } = getPeriodRange(periodoSelecionado.value)
    
    const relatorios = await relatorioService.listarRelatorios({
      celulaId: memberStore.celulaId!,
      dataInicio: inicio,
      dataFim: fim
    })

    // Filtrar apenas relatórios enviados
    const relatoriosEnviados = relatorios.filter(r => r.status === 1)
    
    // Inicializar estatísticas para cada membro ativo
    const membrosStats = new Map<string, EstatisticaMembro>()
    
    memberStore.getActiveMembers.forEach(membro => {
      membrosStats.set(membro.id, {
        id: membro.id,
        nome: membro.name,
        culto: { presentes: 0, total: 0, percentual: 0 },
        celula: { presentes: 0, total: 0, percentual: 0 }
      })
    })

    // Processar cada relatório
    for (const relatorio of relatoriosEnviados) {
      const detalhes = await relatorioService.obterRelatorio(relatorio.id)
      
      const presencas = detalhes.presencas || []

      // Separar presenças por tipo (célula e culto)
      const presencasCelula = presencas.filter((p: any) => p.tipo === 0)
      const presencasCulto = presencas.filter((p: any) => p.tipo === 1)

      // Usar membros retornados pelo relatório ou fallback para membros ativos
      const membrosDoRelatorio = (detalhes.membros || memberStore.getActiveMembers).map((m: any) =>
        m.id?.toString() || String(m.id)
      )

      // Processar presenças de célula
      if (presencasCelula.length > 0) {
        const presencaPorMembroCelula = new Map<string, boolean>()
        presencasCelula.forEach((presenca: any) => {
          const membroId = presenca.membroId?.toString() || String(presenca.membroId)
          presencaPorMembroCelula.set(membroId, presenca.status === 1)
        })

        membrosDoRelatorio.forEach((membroId: string) => {
          const stats = membrosStats.get(membroId)
          if (!stats) return
          stats.celula.total += 1
          if (presencaPorMembroCelula.get(membroId)) {
            stats.celula.presentes += 1
          }
        })
      }

      // Processar presenças de culto
      if (presencasCulto.length > 0) {
        const presencaPorMembroCulto = new Map<string, boolean>()
        presencasCulto.forEach((presenca: any) => {
          const membroId = presenca.membroId?.toString() || String(presenca.membroId)
          presencaPorMembroCulto.set(membroId, presenca.status === 1)
        })

        membrosDoRelatorio.forEach((membroId: string) => {
          const stats = membrosStats.get(membroId)
          if (!stats) return
          stats.culto.total += 1
          if (presencaPorMembroCulto.get(membroId)) {
            stats.culto.presentes += 1
          }
        })
      }
    }

    // Calcular percentuais e converter para array
    estatisticasMembros.value = Array.from(membrosStats.values()).map(stats => ({
      ...stats,
      culto: {
        ...stats.culto,
        percentual: stats.culto.total > 0 ? Math.round((stats.culto.presentes / stats.culto.total) * 100) : 0
      },
      celula: {
        ...stats.celula,
        percentual: stats.celula.total > 0 ? Math.round((stats.celula.presentes / stats.celula.total) * 100) : 0
      }
    })).sort((a, b) => {
      // Ordenar por nome
      return a.nome.localeCompare(b.nome)
    })
  } catch (e: any) {
    console.error('Erro ao carregar estatísticas por membro:', e)
    estatisticasMembros.value = []
  }
}

// Estatísticas do período selecionado
const statsAtuais = computed(() => {
  const stats = estatisticas.value[periodoSelecionado.value]
  return stats || {
    culto: { presentes: 0, total: 0, percentual: 0, eventos: 0 },
    celula: { presentes: 0, total: 0, percentual: 0, eventos: 0 }
  }
})

// Formatar período para exibição
const periodoFormatado = computed(() => {
  const { inicio, fim } = getPeriodRange(periodoSelecionado.value)
  const capitalize = (str: string) => str.replace(/^\w/, c => c.toUpperCase())
  const formatMesAno = (date: Date, pattern = 'MMM yyyy') =>
    capitalize(format(date, pattern, { locale: ptBR }))

  if (periodoSelecionado.value === 'mes') {
    return formatMesAno(fim, 'MMMM yyyy')
  }

  return `${formatMesAno(inicio)} - ${formatMesAno(fim)}`
})

onMounted(async () => {
  await carregarEstatisticas()
})

watch(() => memberStore.celulaId, () => {
  if (memberStore.celulaId) {
    carregarEstatisticas()
  }
})

watch(() => periodoSelecionado.value, () => {
  carregarEstatisticasMembros()
})
</script>

<template>
  <div class="min-h-screen bg-neutral-50">
    <main class="container-layout">
      <!-- Cabeçalho -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-neutral-800">Relatórios de Presença</h1>
        <p class="mt-1 text-sm text-neutral-500">Acompanhe a frequência no culto e na célula</p>
      </div>
      
      <!-- Seletor de Período -->
      <div class="card p-4 mb-6">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="periodo in [
              { key: 'mes', label: 'Este Mês' },
              { key: '3meses', label: '3 Meses' },
              { key: '6meses', label: '6 Meses' },
              { key: 'ano', label: 'Este Ano' }
            ]"
            :key="periodo.key"
            @click="periodoSelecionado = periodo.key as any"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            :class="periodoSelecionado === periodo.key
              ? 'bg-primary-500 text-white shadow-md'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'"
          >
            {{ periodo.label }}
          </button>
        </div>
      </div>
      
      <!-- Loading -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
      
      <!-- Error -->
      <div v-else-if="error" class="card p-6 bg-red-50 border-red-200">
        <div class="flex items-center">
          <AppIcon name="warning" class="text-red-500 mr-3" size="md" />
          <div>
            <p class="text-red-800 font-medium">{{ error }}</p>
            <button @click="carregarEstatisticas" class="text-sm text-red-600 underline mt-1">
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
      
      <!-- Conteúdo -->
      <div v-else>
        <!-- Cards de Estatísticas -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <!-- Card Culto -->
          <div class="card p-6 bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
            <div class="mb-4">
              <h3 class="text-sm font-medium text-primary-700 mb-1">Culto</h3>
              <p class="text-xs text-primary-600">{{ periodoFormatado }}</p>
            </div>
            <div class="space-y-2">
              <div class="flex items-baseline">
                <span class="text-3xl font-bold text-primary-900">{{ statsAtuais.culto.presentes }}</span>
                <span class="text-sm text-primary-600 ml-2">presentes</span>
              </div>
              <div class="flex items-center">
                <div class="flex-1 bg-primary-200 rounded-full h-2 mr-2">
                  <div
                    class="bg-primary-500 h-2 rounded-full transition-all duration-500"
                    :style="{ width: `${statsAtuais.culto.percentual}%` }"
                  ></div>
                </div>
                <span class="text-sm font-semibold text-primary-700">{{ statsAtuais.culto.percentual }}%</span>
              </div>
              <p class="text-xs text-primary-600 mt-2">
                {{ statsAtuais.culto.eventos }} cultos nesse período
              </p>
        </div>
          </div>
          
          <!-- Card Célula -->
          <div class="card p-6 bg-gradient-to-br from-secondary-50 to-secondary-100 border-secondary-200">
            <div class="mb-4">
              <h3 class="text-sm font-medium text-secondary-700 mb-1">Célula</h3>
              <p class="text-xs text-secondary-600">{{ periodoFormatado }}</p>
            </div>
            <div class="space-y-2">
              <div class="flex items-baseline">
                <span class="text-3xl font-bold text-secondary-900">{{ statsAtuais.celula.presentes }}</span>
                <span class="text-sm text-secondary-600 ml-2">presentes</span>
              </div>
              <div class="flex items-center">
                <div class="flex-1 bg-secondary-200 rounded-full h-2 mr-2">
                  <div
                    class="bg-secondary-500 h-2 rounded-full transition-all duration-500"
                    :style="{ width: `${statsAtuais.celula.percentual}%` }"
                  ></div>
                </div>
                <span class="text-sm font-semibold text-secondary-700">{{ statsAtuais.celula.percentual }}%</span>
                    </div>
              <p class="text-xs text-secondary-600 mt-2">
                {{ statsAtuais.celula.eventos }} células nesse período
              </p>
                    </div>
          </div>
        </div>
        
        <!-- Comparativo -->
        <div class="card p-6 mb-6">
          <h3 class="text-lg font-semibold text-neutral-800 mb-4">Comparativo Culto vs Célula</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-neutral-700">Culto</span>
                <span class="text-sm font-bold text-primary-600">{{ statsAtuais.culto.percentual }}%</span>
              </div>
              <div class="w-full bg-neutral-200 rounded-full h-3">
                <div
                  class="bg-primary-500 h-3 rounded-full transition-all duration-500"
                  :style="{ width: `${statsAtuais.culto.percentual}%` }"
                ></div>
              </div>
            </div>
            <div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-neutral-700">Célula</span>
                <span class="text-sm font-bold text-secondary-600">{{ statsAtuais.celula.percentual }}%</span>
              </div>
              <div class="w-full bg-neutral-200 rounded-full h-3">
                <div
                  class="bg-secondary-500 h-3 rounded-full transition-all duration-500"
                  :style="{ width: `${statsAtuais.celula.percentual}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Gráfico de Frequência -->
        <div class="mb-6">
          <FrequencyChart :periodo="periodoSelecionado" :celulaId="memberStore.celulaId || undefined" />
        </div>

        <!-- Lista de Membros com Estatísticas -->
        <div class="card p-6">
          <h3 class="text-lg font-semibold text-neutral-800 mb-4">Presença por Membro - {{ periodoFormatado }}</h3>
          
          <div v-if="estatisticasMembros.length === 0" class="text-center py-8 text-neutral-500">
            <AppIcon name="users" class="mx-auto text-neutral-300 mb-2" size="lg" />
            <p class="text-sm">Nenhum dado disponível para este período</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-neutral-200">
                  <th class="text-left py-3 px-4 text-sm font-semibold text-neutral-700">Membro</th>
                  <th class="text-center py-3 px-4 text-sm font-semibold text-neutral-700">Culto</th>
                  <th class="text-center py-3 px-4 text-sm font-semibold text-neutral-700">Célula</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="membro in estatisticasMembros"
                  :key="membro.id"
                  class="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                >
                  <td class="py-3 px-4">
                    <div class="flex items-center">
                      <div class="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-semibold text-xs mr-2 flex-shrink-0">
                        {{ membro.nome.charAt(0).toUpperCase() }}
                      </div>
                      <span class="text-sm font-medium text-neutral-800">{{ membro.nome }}</span>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <div class="inline-flex items-baseline gap-2">
                      <span class="text-sm font-semibold text-green-600">{{ membro.culto.percentual }}%</span>
                      <span class="text-xs text-neutral-500">
                        ({{ membro.culto.presentes }} / {{ membro.culto.total }})
                      </span>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <div class="inline-flex items-baseline gap-2">
                      <span class="text-sm font-semibold text-green-600">{{ membro.celula.percentual }}%</span>
                      <span class="text-xs text-neutral-500">
                        ({{ membro.celula.presentes }} / {{ membro.celula.total }})
                    </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.card {
  @apply bg-white rounded-lg shadow-sm border border-neutral-200;
}
</style>
