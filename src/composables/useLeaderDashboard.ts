import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { DashboardCuidadoResponse, DashboardSemanaResponse } from '../services/adminService'
import { useMemberStore } from '../stores/memberStore'
import { useRedeCuidadoStore } from '../stores/redeCuidadoStore'
import { useDashboardWeek } from './useDashboardWeek'
import relatorioService from '../services/relatorioService'

export function useLeaderDashboard() {
  const memberStore = useMemberStore()
  const redeCuidadoStore = useRedeCuidadoStore()

  const loading = ref(true)
  const cuidadoLoading = ref(false)
  const participacaoLoading = ref(false)
  const cuidadoError = ref<string | null>(null)
  const participacaoError = ref<string | null>(null)

  const participacaoWeekOffset = ref(0)
  const relatoriosWeekOffset = ref(0)
  const participacaoWeek = useDashboardWeek(participacaoWeekOffset)
  const relatoriosWeek = useDashboardWeek(relatoriosWeekOffset)

  const participacaoData = ref<DashboardSemanaResponse | null>(null)
  const relatoriosData = ref<DashboardSemanaResponse | null>(null)

  let participacaoAbort: AbortController | null = null

  const celulaId = computed(() => memberStore.celulaId)
  const celulaNome = computed(() => redeCuidadoStore.rede?.celula.nome ?? 'Minha célula')

  const resumo = computed((): DashboardCuidadoResponse['resumo'] | null => {
    const stats = redeCuidadoStore.rede?.stats
    if (!stats) return null
    const pct =
      stats.totalMembros > 0
        ? Math.round((stats.totalComCuidador / stats.totalMembros) * 100)
        : 0
    const consolidadores = memberStore.getConsolidators.length
    return {
      totalCelulas: 1,
      totalMembros: stats.totalMembros,
      comCuidador: stats.totalComCuidador,
      semCuidador: stats.totalSemCuidador,
      percentualCobertura: pct,
      statusSemafaro: pct >= 80 ? 'ok' : pct >= 50 ? 'atencao' : 'critico',
      consolidadoresSobrecarregados: 0,
      consolidadoresAtivos: consolidadores,
    }
  })

  const totaisAlertas = computed(() => {
    const stats = redeCuidadoStore.rede?.stats
    if (!stats) return null
    return {
      membrosSemCuidador: stats.totalSemCuidador,
      celulasBaixaCobertura: stats.totalSemCuidador > 0 ? 1 : 0,
      consolidadoresSobrecarregados: 0,
    }
  })

  const listas = computed((): DashboardCuidadoResponse['listas'] | null => {
    const rede = redeCuidadoStore.rede
    if (!rede) return null
    const celula = rede.celula
    const membrosSemCuidador = rede.semCuidador.map((m) => ({
      membroId: m.id,
      nome: m.nome,
      celulaId: celula.id,
      celulaNome: celula.nome,
    }))
    const membrosComCuidador: Array<{
      membroId: number
      nome: string
      celulaId: number
      celulaNome: string
      cuidadorNome?: string | null
    }> = []
    for (const c of rede.cuidadores) {
      for (const m of c.cuidados) {
        membrosComCuidador.push({
          membroId: m.membroId,
          nome: m.nome,
          celulaId: celula.id,
          celulaNome: celula.nome,
          cuidadorNome: c.nome,
        })
      }
    }
    const todosMembros = memberStore.getActiveMembers.map((m) => ({
      membroId: Number(m.id),
      nome: m.name,
      celulaId: celula.id,
      celulaNome: celula.nome,
      cuidadorNome: redeCuidadoStore.mapaCuidadores.get(Number(m.id)) ?? null,
    }))
    return {
      membrosSemCuidador,
      celulasBaixaCobertura:
        rede.stats.totalSemCuidador > 0
          ? [
              {
                celulaId: celula.id,
                nome: celula.nome,
                percentualCobertura: resumo.value?.percentualCobertura ?? 0,
                semCuidador: rede.stats.totalSemCuidador,
              },
            ]
          : [],
      membrosComCuidador,
      todosMembros,
    }
  })

  const consolidadoresCount = computed(() => memberStore.getConsolidators.length)

  async function loadBase() {
    loading.value = true
    cuidadoError.value = null
    try {
      await memberStore.carregarMembros()
      if (memberStore.celulaId) {
        cuidadoLoading.value = true
        await redeCuidadoStore.carregarRede(memberStore.celulaId)
      }
    } catch (e: unknown) {
      cuidadoError.value =
        e instanceof Error ? e.message : 'Erro ao carregar dados da célula'
    } finally {
      cuidadoLoading.value = false
      loading.value = false
    }
  }

  async function computeWeekStats(
    dataInicio: string,
    dataFim: string,
    signal?: AbortSignal,
  ): Promise<DashboardSemanaResponse> {
    const cid = memberStore.celulaId
    if (!cid) {
      throw new Error('Célula não encontrada')
    }

    const relatorios = await relatorioService.listarRelatorios({
      celulaId: cid,
      dataInicio: new Date(dataInicio),
      dataFim: new Date(dataFim),
    })

    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    const enviados = relatorios.filter((r) => r.status === 1)
    const totalMembros = memberStore.getActiveMembers.length

    let presentesCulto = 0
    let totalCulto = 0
    let presentesCelula = 0
    let totalCelula = 0

    for (const rel of enviados) {
      const detalhes = await relatorioService.obterRelatorio(rel.id)
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

      const presencas = detalhes.presencas ?? []
      const culto = presencas.filter((p) => p.tipo === 1)
      const celula = presencas.filter((p) => p.tipo === 0)

      if (culto.length) {
        totalCulto += totalMembros
        presentesCulto += culto.filter((p) => p.status === 1).length
      }
      if (celula.length) {
        totalCelula += totalMembros
        presentesCelula += celula.filter((p) => p.status === 1).length
      }
    }

    const relatorioEnviado = enviados.length > 0

    return {
      periodo: { inicio: dataInicio, fim: dataFim },
      participacao: {
        totalMembros,
        culto: {
          presentes: presentesCulto,
          total: totalCulto,
          percentual: totalCulto > 0 ? Math.round((presentesCulto / totalCulto) * 100) : 0,
        },
        celula: {
          presentes: presentesCelula,
          total: totalCelula,
          percentual: totalCelula > 0 ? Math.round((presentesCelula / totalCelula) * 100) : 0,
        },
      },
      relatorios: {
        lideresTotal: 1,
        lideresPreencheram: relatorioEnviado ? 1 : 0,
        pendentes: relatorioEnviado ? 0 : 1,
        percentualAdesao: relatorioEnviado ? 100 : 0,
      },
      filtros: { liderId: null },
    }
  }

  async function refreshParticipacao() {
    if (!memberStore.celulaId) return
    participacaoAbort?.abort()
    participacaoAbort = new AbortController()
    participacaoLoading.value = true
    participacaoError.value = null
    try {
      participacaoData.value = await computeWeekStats(
        participacaoWeek.dataInicio.value,
        participacaoWeek.dataFim.value,
        participacaoAbort.signal,
      )
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      participacaoError.value =
        e instanceof Error ? e.message : 'Erro ao carregar participação'
    } finally {
      participacaoLoading.value = false
    }
  }

  async function refreshRelatorios() {
    if (!memberStore.celulaId) return
    try {
      relatoriosData.value = await computeWeekStats(
        relatoriosWeek.dataInicio.value,
        relatoriosWeek.dataFim.value,
      )
    } catch {
      relatoriosData.value = null
    }
  }

  async function refreshAll() {
    await loadBase()
    await Promise.all([refreshParticipacao(), refreshRelatorios()])
  }

  onMounted(refreshAll)

  watch(celulaId, () => {
    void refreshAll()
  })

  watch(
    [participacaoWeekOffset, () => participacaoWeek.dataInicio.value],
    () => {
      void refreshParticipacao()
    },
  )

  watch(
    [relatoriosWeekOffset, () => relatoriosWeek.dataInicio.value],
    () => {
      void refreshRelatorios()
    },
  )

  onUnmounted(() => {
    participacaoAbort?.abort()
  })

  return {
    loading,
    cuidadoLoading,
    participacaoLoading,
    cuidadoError,
    participacaoError,
    resumo,
    totaisAlertas,
    listas,
    limiares: computed(() => null),
    consolidadoresCount,
    celulaNome,
    participacaoData,
    relatoriosData,
    participacaoWeek,
    relatoriosWeek,
    refreshCuidado: loadBase,
    refreshParticipacao,
    refreshRelatorios,
    refreshAll,
  }
}
