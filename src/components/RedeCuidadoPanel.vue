<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRedeCuidadoStore } from '../stores/redeCuidadoStore'
import AppIcon from './AppIcon.vue'
import { Dialog, DialogPanel, DialogTitle, TransitionRoot, TransitionChild } from '@headlessui/vue'
import type { Cuidador } from '../services/redeCuidadoService'

const props = defineProps<{
  celulaId: number | null
}>()

const redeCuidadoStore = useRedeCuidadoStore()

const showModal = ref(false)
const modalMembroId = ref<number | null>(null)
const modalMembroNome = ref('')
const modalCuidadorSelecionado = ref<string>('')
const modalError = ref('')

function abrirAtribuicaoModal(membroId: number, membroNome: string, cuidadorAtualKey?: string) {
  modalMembroId.value = membroId
  modalMembroNome.value = membroNome
  modalCuidadorSelecionado.value = cuidadorAtualKey ?? ''
  modalError.value = ''
  showModal.value = true
}

function fecharModal() {
  showModal.value = false
  modalMembroId.value = null
  modalMembroNome.value = ''
  modalCuidadorSelecionado.value = ''
  modalError.value = ''
}

async function confirmarAtribuicao() {
  if (!modalMembroId.value) {
    modalError.value = 'Selecione um membro'
    return
  }
  if (!modalCuidadorSelecionado.value) {
    modalError.value = 'Selecione um cuidador'
    return
  }

  modalError.value = ''

  try {
    const isLider = modalCuidadorSelecionado.value === 'lider'
    await redeCuidadoStore.atribuir({
      membroId: modalMembroId.value,
      consolidadorId: isLider ? null : Number(modalCuidadorSelecionado.value),
      liderId: isLider ? redeCuidadoStore.rede!.lider.id : null,
    })
    fecharModal()
  } catch (err: any) {
    modalError.value = err?.message ?? 'Erro ao salvar'
  }
}

async function removerAtribuicao(membroId: number, membroNome: string) {
  if (!confirm(`Remover "${membroNome}" da rede de cuidado?`)) return
  try {
    await redeCuidadoStore.remover(membroId)
  } catch {
    // store
  }
}

const opcoesCuidadores = computed(() => {
  if (!redeCuidadoStore.rede) return []
  const opts: { key: string; nome: string; tipo: string }[] = []

  opts.push({
    key: 'lider',
    nome: `${redeCuidadoStore.rede.lider.nome} (líder)`,
    tipo: 'lider',
  })

  for (const c of redeCuidadoStore.rede.cuidadores) {
    if (c.tipo === 'consolidador') {
      opts.push({
        key: String(c.cuidadorId),
        nome: c.nome,
        tipo: 'consolidador',
      })
    }
  }

  return opts
})

function cuidadorKeyDe(cuidador: Cuidador): string {
  return cuidador.tipo === 'lider' ? 'lider' : String(cuidador.cuidadorId)
}

function roleBadge(m: { ehConsolidador: boolean; ehCoLider: boolean; ehAnfitriao: boolean }) {
  if (m.ehConsolidador) return { label: 'Consolid.', cls: 'bg-primary-100 text-primary-700' }
  if (m.ehCoLider) return { label: 'Co-líder', cls: 'bg-vibrant-100 text-vibrant-700' }
  if (m.ehAnfitriao) return { label: 'Anfitrião', cls: 'bg-fun-100 text-fun-700' }
  return null
}

function retryLoad() {
  if (props.celulaId != null) {
    void redeCuidadoStore.carregarRede(props.celulaId)
  }
}

watch(
  () => props.celulaId,
  async (id) => {
    if (id != null) {
      await redeCuidadoStore.carregarRede(id)
    } else {
      redeCuidadoStore.limpar()
    }
  },
  { immediate: true }
)
</script>

<template>
  <div>
    <!-- Loading -->
    <div v-if="redeCuidadoStore.loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500 mx-auto"></div>
      <p class="mt-4 text-sm text-neutral-600">Carregando rede de cuidado...</p>
    </div>

    <template v-else-if="redeCuidadoStore.rede">
      <!-- Stats -->
      <div class="grid grid-cols-3 gap-3 mb-5">
        <div class="card p-3 flex flex-col items-center justify-center">
          <span class="text-xl font-bold text-neutral-800">{{ redeCuidadoStore.rede.stats.totalMembros }}</span>
          <span class="text-xs text-neutral-500 mt-0.5 text-center">Total membros</span>
        </div>
        <div class="card p-3 flex flex-col items-center justify-center bg-green-50">
          <span class="text-xl font-bold text-green-700">{{ redeCuidadoStore.rede.stats.totalComCuidador }}</span>
          <span class="text-xs text-green-600 mt-0.5 text-center">Com cuidador</span>
        </div>
        <div
          class="card p-3 flex flex-col items-center justify-center"
          :class="redeCuidadoStore.rede.stats.totalSemCuidador > 0 ? 'bg-amber-50' : ''"
        >
          <span
            class="text-xl font-bold"
            :class="redeCuidadoStore.rede.stats.totalSemCuidador > 0 ? 'text-amber-700' : 'text-neutral-800'"
          >
            {{ redeCuidadoStore.rede.stats.totalSemCuidador }}
          </span>
          <span
            class="text-xs mt-0.5 text-center"
            :class="redeCuidadoStore.rede.stats.totalSemCuidador > 0 ? 'text-amber-600' : 'text-neutral-500'"
          >
            Sem cuidador
          </span>
        </div>
      </div>

      <div class="space-y-4">
        <div
          v-for="cuidador in redeCuidadoStore.rede.cuidadores"
          :key="cuidadorKeyDe(cuidador)"
          class="card overflow-hidden"
        >
          <div
            class="flex items-center justify-between px-4 py-3 border-b border-neutral-100"
            :class="cuidador.tipo === 'lider' ? 'bg-primary-50' : 'bg-neutral-50'"
          >
            <div class="flex items-center gap-2">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                :class="
                  cuidador.tipo === 'lider' ? 'bg-primary-200 text-primary-800' : 'bg-neutral-200 text-neutral-700'
                "
              >
                {{ cuidador.nome.charAt(0).toUpperCase() }}
              </div>
              <div>
                <p class="text-sm font-semibold text-neutral-800">{{ cuidador.nome }}</p>
                <p class="text-xs" :class="cuidador.tipo === 'lider' ? 'text-primary-600' : 'text-neutral-500'">
                  {{ cuidador.tipo === 'lider' ? 'Líder da célula' : 'Consolidador' }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-neutral-500 font-medium">
                {{ cuidador.cuidados.length }} cuidado{{ cuidador.cuidados.length !== 1 ? 's' : '' }}
              </span>
              <button
                type="button"
                @click="abrirAtribuicaoModal(0, '', cuidadorKeyDe(cuidador))"
                class="p-1.5 rounded-full bg-white border border-neutral-200 hover:bg-neutral-50 transition-colors"
                title="Atribuir membro a este cuidador"
                v-if="redeCuidadoStore.rede!.semCuidador.length > 0"
              >
                <AppIcon name="add" size="xs" class="text-neutral-600" />
              </button>
            </div>
          </div>

          <div v-if="cuidador.cuidados.length > 0" class="divide-y divide-neutral-100">
            <div
              v-for="membro in cuidador.cuidados"
              :key="membro.membroId"
              class="flex items-center justify-between px-4 py-2.5"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-neutral-800 truncate">{{ membro.nome }}</p>
                <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span v-if="membro.telefone" class="text-xs text-neutral-400 inline-flex items-center gap-0.5">
                    <AppIcon name="phone" size="xs" />{{ membro.telefone }}
                  </span>
                  <span
                    v-if="roleBadge(membro)"
                    class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium"
                    :class="roleBadge(membro)!.cls"
                  >
                    {{ roleBadge(membro)!.label }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-1 ml-2">
                <button
                  type="button"
                  @click="abrirAtribuicaoModal(membro.membroId, membro.nome, cuidadorKeyDe(cuidador))"
                  class="p-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
                  title="Trocar cuidador"
                >
                  <AppIcon name="edit" size="xs" class="text-neutral-600" />
                </button>
                <button
                  type="button"
                  @click="removerAtribuicao(membro.membroId, membro.nome)"
                  class="p-1.5 rounded-full bg-red-50 hover:bg-red-100 transition-colors"
                  title="Remover da rede"
                  :disabled="redeCuidadoStore.salvando"
                >
                  <AppIcon name="close" size="xs" class="text-red-500" />
                </button>
              </div>
            </div>
          </div>

          <div v-else class="px-4 py-3 text-xs text-neutral-400 italic">Nenhum membro atribuído ainda</div>
        </div>

        <div v-if="redeCuidadoStore.rede.semCuidador.length > 0" class="card overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-amber-50">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4 text-amber-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-neutral-800">Sem cuidador</p>
                <p class="text-xs text-amber-600">
                  {{ redeCuidadoStore.rede.semCuidador.length }} membro{{
                    redeCuidadoStore.rede.semCuidador.length !== 1 ? 's' : ''
                  }}
                  aguardando
                </p>
              </div>
            </div>
          </div>

          <div class="divide-y divide-neutral-100">
            <div
              v-for="membro in redeCuidadoStore.rede.semCuidador"
              :key="membro.id"
              class="flex items-center justify-between px-4 py-2.5"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-neutral-800 truncate">{{ membro.nome }}</p>
                <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span v-if="membro.telefone" class="text-xs text-neutral-400 inline-flex items-center gap-0.5">
                    <AppIcon name="phone" size="xs" />{{ membro.telefone }}
                  </span>
                  <span
                    v-if="roleBadge(membro)"
                    class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium"
                    :class="roleBadge(membro)!.cls"
                  >
                    {{ roleBadge(membro)!.label }}
                  </span>
                </div>
              </div>
              <button
                type="button"
                @click="abrirAtribuicaoModal(membro.id, membro.nome)"
                class="ml-2 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium transition-colors flex items-center gap-1"
              >
                <AppIcon name="add" size="xs" />
                Atribuir
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="redeCuidadoStore.rede.stats.totalSemCuidador === 0 && redeCuidadoStore.rede.stats.totalMembros > 0"
          class="text-center py-6 bg-green-50 rounded-lg border border-green-100"
        >
          <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <AppIcon name="check" class="text-green-600 h-6 w-6" size="md" />
          </div>
          <p class="text-sm font-semibold text-green-800">Rede completa!</p>
          <p class="text-xs text-green-600 mt-1">Todos os membros têm um cuidador atribuído.</p>
        </div>
      </div>
    </template>

    <div v-else-if="redeCuidadoStore.error && celulaId != null" class="bg-red-50 border border-red-100 p-4 rounded-lg mb-4">
      <p class="text-sm text-red-700">{{ redeCuidadoStore.error }}</p>
      <button type="button" @click="retryLoad()" class="mt-2 text-xs text-red-600 underline">Tentar novamente</button>
    </div>

    <TransitionRoot appear :show="showModal" as="template">
      <Dialog as="div" @close="fecharModal" class="relative z-10">
        <TransitionChild
          as="template"
          enter="duration-300 ease-out"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="duration-200 ease-in"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-black bg-opacity-30" />
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
              <DialogPanel class="modal-dialog-panel max-w-sm p-6">
                <DialogTitle as="h3" class="text-lg font-semibold text-neutral-900 mb-1">
                  {{ modalMembroId ? 'Atribuir cuidador' : 'Atribuir membro' }}
                </DialogTitle>
                <p v-if="modalMembroNome" class="text-sm text-neutral-500 mb-4">
                  Membro: <span class="font-medium text-neutral-700">{{ modalMembroNome }}</span>
                </p>

                <div v-if="!modalMembroId && redeCuidadoStore.rede" class="mb-4">
                  <label class="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
                    Membro sem cuidador
                  </label>
                  <select
                    v-model="modalMembroId"
                    class="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option :value="null">Selecione um membro...</option>
                    <option v-for="m in redeCuidadoStore.rede.semCuidador" :key="m.id" :value="m.id">
                      {{ m.nome }}
                    </option>
                  </select>
                </div>

                <div class="mb-4">
                  <label class="block text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1"> Cuidador </label>
                  <select
                    v-model="modalCuidadorSelecionado"
                    class="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Selecione um cuidador...</option>
                    <option v-for="opt in opcoesCuidadores" :key="opt.key" :value="opt.key">
                      {{ opt.nome }}
                    </option>
                  </select>
                </div>

                <p v-if="modalError" class="text-xs text-red-600 mb-3">{{ modalError }}</p>
                <p v-if="redeCuidadoStore.error" class="text-xs text-red-600 mb-3">{{ redeCuidadoStore.error }}</p>

                <div class="flex gap-3 pt-2">
                  <button
                    type="button"
                    @click="fecharModal"
                    class="flex-1 px-4 py-2 text-sm font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    @click="confirmarAtribuicao"
                    :disabled="redeCuidadoStore.salvando"
                    class="flex-1 px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition-colors"
                  >
                    <span v-if="redeCuidadoStore.salvando">Salvando...</span>
                    <span v-else>Salvar</span>
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>
