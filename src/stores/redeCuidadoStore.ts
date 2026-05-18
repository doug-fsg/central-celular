import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import redeCuidadoService, {
  type RedeCuidadoResponse,
  type AtribuicaoInput,
} from '../services/redeCuidadoService';

export const useRedeCuidadoStore = defineStore('redeCuidado', () => {
  const rede = ref<RedeCuidadoResponse | null>(null);
  const loading = ref(false);
  const salvando = ref(false);
  const error = ref<string | null>(null);
  const celulaId = ref<number | null>(null);

  // Mapa rápido: membroId → nome do cuidador (para badge)
  const mapaCuidadores = computed(() => {
    if (!rede.value) return new Map<number, string>();
    const mapa = new Map<number, string>();
    for (const cuidador of rede.value.cuidadores) {
      for (const cuidado of cuidador.cuidados) {
        mapa.set(cuidado.membroId, cuidador.nome);
      }
    }
    return mapa;
  });

  async function carregarRede(id: number) {
    celulaId.value = id;
    loading.value = true;
    error.value = null;
    try {
      rede.value = await redeCuidadoService.obterRede(id);
    } catch (err: any) {
      console.error('[redeCuidadoStore] Erro ao carregar rede:', err);
      error.value =
        err?.message ?? 'Erro ao carregar rede de cuidado';
    } finally {
      loading.value = false;
    }
  }

  async function atribuir(input: AtribuicaoInput) {
    if (!celulaId.value) return;
    salvando.value = true;
    error.value = null;
    try {
      await redeCuidadoService.atribuir(celulaId.value, input);
      await carregarRede(celulaId.value);
    } catch (err: any) {
      error.value = err?.message ?? 'Erro ao salvar atribuição';
      throw err;
    } finally {
      salvando.value = false;
    }
  }

  async function remover(membroId: number) {
    if (!celulaId.value) return;
    salvando.value = true;
    error.value = null;
    try {
      await redeCuidadoService.remover(celulaId.value, membroId);
      await carregarRede(celulaId.value);
    } catch (err: any) {
      error.value = err?.message ?? 'Erro ao remover atribuição';
      throw err;
    } finally {
      salvando.value = false;
    }
  }

  function limpar() {
    rede.value = null;
    celulaId.value = null;
    error.value = null;
  }

  return {
    rede,
    loading,
    salvando,
    error,
    celulaId,
    mapaCuidadores,
    carregarRede,
    atribuir,
    remover,
    limpar,
  };
});
