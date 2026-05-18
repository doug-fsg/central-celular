import { ref, watch, onMounted, onUnmounted, computed, type Ref } from 'vue';
import { adminService, type DashboardCuidadoResponse } from '../services/adminService';

export function useDashboardCuidado(leaderFilterId: Ref<string>) {
  const data = ref<DashboardCuidadoResponse | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  let abortCtl: AbortController | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let seq = 0;

  const semCuidadorCount = computed(() => data.value?.resumo?.semCuidador ?? 0);

  async function refresh() {
    abortCtl?.abort();
    abortCtl = new AbortController();
    const signal = abortCtl.signal;
    const mySeq = ++seq;
    loading.value = true;
    error.value = null;
    try {
      const lid = leaderFilterId.value ? Number(leaderFilterId.value) : undefined;
      const res = await adminService.obterDashboardCuidado(lid, { signal });
      if (mySeq !== seq) return;
      data.value = res;
    } catch (e: unknown) {
      if (
        typeof DOMException !== 'undefined' &&
        e instanceof DOMException &&
        e.name === 'AbortError'
      ) {
        return;
      }
      const name = typeof e === 'object' && e && 'name' in e ? String((e as Error).name) : '';
      if (name === 'AbortError') return;
      if (mySeq !== seq) return;
      error.value =
        typeof e === 'object' && e && 'message' in e
          ? String((e as { message: string }).message)
          : 'Erro ao carregar painel de cuidado';
    } finally {
      if (mySeq === seq) loading.value = false;
    }
  }

  function scheduleRefresh() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void refresh();
    }, 300);
  }

  onMounted(() => {
    void refresh();
  });

  watch(leaderFilterId, () => {
    scheduleRefresh();
  });

  onUnmounted(() => {
    abortCtl?.abort();
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  return { data, loading, error, refresh, semCuidadorCount };
}
