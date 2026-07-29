import { ref, watch, onMounted, onUnmounted, computed, type Ref, type ComputedRef } from 'vue';
import {
  adminService,
  type DashboardCuidadoResponse,
  type DashboardSemanaResponse,
} from '../services/adminService';
import { useDashboardWeek } from './useDashboardWeek';

export function useDashboardUnified(leaderFilterId: Ref<string> | ComputedRef<string>) {
  const cuidadoData = ref<DashboardCuidadoResponse | null>(null);
  const participacaoData = ref<DashboardSemanaResponse | null>(null);
  const relatoriosData = ref<DashboardSemanaResponse | null>(null);

  const cuidadoLoading = ref(false);
  const participacaoLoading = ref(false);
  const relatoriosLoading = ref(false);
  const cuidadoError = ref<string | null>(null);
  const participacaoError = ref<string | null>(null);
  const relatoriosError = ref<string | null>(null);

  const participacaoWeekOffset = ref(0);
  const relatoriosWeekOffset = ref(0);

  const participacaoWeek = useDashboardWeek(participacaoWeekOffset);
  const relatoriosWeek = useDashboardWeek(relatoriosWeekOffset);

  let cuidadoAbort: AbortController | null = null;
  let participacaoAbort: AbortController | null = null;
  let relatoriosAbort: AbortController | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const liderIdNum = computed(() => {
    const n = Number(leaderFilterId.value);
    return leaderFilterId.value && !Number.isNaN(n) ? n : undefined;
  });

  const limiares = computed(() => cuidadoData.value?.limiares ?? null);
  const celulas = computed(() => cuidadoData.value?.celulas ?? []);
  const resumo = computed(() => cuidadoData.value?.resumo ?? null);
  const totaisAlertas = computed(() => {
    if (cuidadoData.value?.totaisAlertas) return cuidadoData.value.totaisAlertas;
    const r = cuidadoData.value?.resumo;
    const a = cuidadoData.value?.alertas;
    if (!r || !a) return null;
    return {
      membrosSemCuidador: r.semCuidador,
      celulasBaixaCobertura: a.celulasBaixaCobertura.length,
      consolidadoresSobrecarregados: a.consolidadoresSobrecarregados.length,
    };
  });

  const listas = computed(() => {
    const d = cuidadoData.value;
    if (!d) return null;
    if (d.listas) return d.listas;
    return {
      membrosSemCuidador: d.alertas.membrosSemCuidador,
      celulasBaixaCobertura: d.alertas.celulasBaixaCobertura,
      membrosComCuidador: [],
      todosMembros: [],
    };
  });

  const anyLoading = computed(
    () => cuidadoLoading.value || participacaoLoading.value || relatoriosLoading.value,
  );

  async function refreshCuidado() {
    cuidadoAbort?.abort();
    cuidadoAbort = new AbortController();
    cuidadoLoading.value = true;
    cuidadoError.value = null;
    try {
      cuidadoData.value = await adminService.obterDashboardCuidado(liderIdNum.value, {
        signal: cuidadoAbort.signal,
      });
    } catch (e: unknown) {
      if (isAbort(e)) return;
      cuidadoError.value = extractError(e, 'Erro ao carregar dados de cuidado');
    } finally {
      cuidadoLoading.value = false;
    }
  }

  async function refreshParticipacao() {
    participacaoAbort?.abort();
    participacaoAbort = new AbortController();
    participacaoLoading.value = true;
    participacaoError.value = null;
    try {
      participacaoData.value = await adminService.obterDashboardSemana(
        participacaoWeek.dataInicio.value,
        participacaoWeek.dataFim.value,
        liderIdNum.value,
        { signal: participacaoAbort.signal },
      );
    } catch (e: unknown) {
      if (isAbort(e)) return;
      participacaoError.value = extractError(e, 'Erro ao carregar participação');
    } finally {
      participacaoLoading.value = false;
    }
  }

  async function refreshRelatorios() {
    relatoriosAbort?.abort();
    relatoriosAbort = new AbortController();
    relatoriosLoading.value = true;
    relatoriosError.value = null;
    try {
      relatoriosData.value = await adminService.obterDashboardSemana(
        relatoriosWeek.dataInicio.value,
        relatoriosWeek.dataFim.value,
        liderIdNum.value,
        { signal: relatoriosAbort.signal },
      );
    } catch (e: unknown) {
      if (isAbort(e)) return;
      relatoriosError.value = extractError(e, 'Erro ao carregar relatórios');
    } finally {
      relatoriosLoading.value = false;
    }
  }

  function refreshAll() {
    void refreshCuidado();
    void refreshParticipacao();
    void refreshRelatorios();
  }

  function scheduleRefreshAll() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      refreshAll();
    }, 300);
  }

  onMounted(refreshAll);

  watch(leaderFilterId, scheduleRefreshAll);

  watch(
    [participacaoWeekOffset, () => participacaoWeek.dataInicio.value],
    () => {
      void refreshParticipacao();
    },
  );

  watch(
    [relatoriosWeekOffset, () => relatoriosWeek.dataInicio.value],
    () => {
      void refreshRelatorios();
    },
  );

  onUnmounted(() => {
    cuidadoAbort?.abort();
    participacaoAbort?.abort();
    relatoriosAbort?.abort();
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  return {
    cuidadoData,
    participacaoData,
    relatoriosData,
    cuidadoLoading,
    participacaoLoading,
    relatoriosLoading,
    cuidadoError,
    participacaoError,
    relatoriosError,
    anyLoading,
    limiares,
    celulas,
    resumo,
    totaisAlertas,
    listas,
    participacaoWeek,
    relatoriosWeek,
    participacaoWeekOffset,
    relatoriosWeekOffset,
    refreshCuidado,
    refreshParticipacao,
    refreshRelatorios,
    refreshAll,
    leaderFilterId,
  };
}

function isAbort(e: unknown): boolean {
  if (typeof DOMException !== 'undefined' && e instanceof DOMException && e.name === 'AbortError') {
    return true;
  }
  return typeof e === 'object' && e !== null && 'name' in e && (e as Error).name === 'AbortError';
}

function extractError(e: unknown, fallback: string): string {
  return typeof e === 'object' && e && 'message' in e
    ? String((e as { message: string }).message)
    : fallback;
}
