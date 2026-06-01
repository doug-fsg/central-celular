<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  platformService,
  type PlatformAccount,
  type PlatformAccountUser,
} from '../../services/platformService'

const contas = ref<PlatformAccount[]>([])
const loading = ref(false)
const error = ref('')
const novaIgreja = ref('')
const criando = ref(false)
const contaSelecionada = ref<number | null>(null)
const usuariosConta = ref<PlatformAccountUser[]>([])
const usuariosLoading = ref(false)

async function carregarContas() {
  loading.value = true
  error.value = ''
  try {
    contas.value = await platformService.listarContas()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erro ao carregar contas'
  } finally {
    loading.value = false
  }
}

async function criarIgreja() {
  const nome = novaIgreja.value.trim()
  if (!nome) return
  criando.value = true
  try {
    await platformService.criarConta(nome)
    novaIgreja.value = ''
    await carregarContas()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erro ao criar igreja'
  } finally {
    criando.value = false
  }
}

async function toggleAtiva(conta: PlatformAccount) {
  try {
    await platformService.alternarContaAtiva(conta.id, !conta.ativo)
    await carregarContas()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erro ao atualizar conta'
  }
}

async function verUsuarios(contaId: number) {
  if (contaSelecionada.value === contaId) {
    contaSelecionada.value = null
    usuariosConta.value = []
    return
  }
  contaSelecionada.value = contaId
  usuariosLoading.value = true
  try {
    const res = await platformService.listarUsuariosDaConta(contaId)
    usuariosConta.value = res.usuarios
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Erro ao carregar usuários'
  } finally {
    usuariosLoading.value = false
  }
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

onMounted(() => {
  void carregarContas()
})
</script>

<template>
  <main class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
    <header class="mb-6">
      <h1 class="text-xl sm:text-2xl font-bold text-neutral-800">Super Admin</h1>
      <p class="mt-1 text-sm text-neutral-500">
        Dono da plataforma — todas as igrejas (contas) e usuários cadastrados.
      </p>
    </header>

    <div
      v-if="error"
      class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800"
    >
      {{ error }}
    </div>

    <section class="mb-8 rounded-xl border border-neutral-200 bg-white p-4 sm:p-6 shadow-sm">
      <h2 class="text-lg font-semibold text-neutral-800 mb-3">Nova igreja / empresa</h2>
      <div class="flex flex-col sm:flex-row gap-3">
        <input
          v-model="novaIgreja"
          type="text"
          placeholder="Nome da igreja ou organização"
          class="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          :disabled="criando || !novaIgreja.trim()"
          class="px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
          @click="criarIgreja"
        >
          {{ criando ? 'Criando...' : 'Cadastrar conta' }}
        </button>
      </div>
    </section>

    <section class="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
      <div class="px-4 py-3 border-b border-neutral-100 flex justify-between items-center">
        <h2 class="text-lg font-semibold text-neutral-800">Contas (SaaS)</h2>
        <button
          type="button"
          class="text-sm text-primary-600 hover:text-primary-800"
          @click="carregarContas"
        >
          Atualizar
        </button>
      </div>

      <p v-if="loading" class="p-6 text-sm text-neutral-500">Carregando...</p>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-neutral-200 text-sm">
          <thead class="bg-neutral-50">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-neutral-600">ID</th>
              <th class="px-4 py-3 text-left font-medium text-neutral-600">Nome</th>
              <th class="px-4 py-3 text-left font-medium text-neutral-600">Usuários</th>
              <th class="px-4 py-3 text-left font-medium text-neutral-600">Células</th>
              <th class="px-4 py-3 text-left font-medium text-neutral-600">Status</th>
              <th class="px-4 py-3 text-left font-medium text-neutral-600">Desde</th>
              <th class="px-4 py-3 text-right font-medium text-neutral-600">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <template v-for="conta in contas" :key="conta.id">
              <tr class="hover:bg-neutral-50">
                <td class="px-4 py-3 tabular-nums">{{ conta.id }}</td>
                <td class="px-4 py-3 font-medium text-neutral-900">{{ conta.nome }}</td>
                <td class="px-4 py-3">{{ conta._count.usuarios }}</td>
                <td class="px-4 py-3">{{ conta._count.celulas }}</td>
                <td class="px-4 py-3">
                  <span
                    :class="
                      conta.ativo
                        ? 'text-green-700 bg-green-50'
                        : 'text-red-700 bg-red-50'
                    "
                    class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium"
                  >
                    {{ conta.ativo ? 'Ativa' : 'Inativa' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-neutral-500">{{ formatarData(conta.createdAt) }}</td>
                <td class="px-4 py-3 text-right space-x-2">
                  <button
                    type="button"
                    class="text-primary-600 hover:underline"
                    @click="verUsuarios(conta.id)"
                  >
                    {{ contaSelecionada === conta.id ? 'Ocultar' : 'Usuários' }}
                  </button>
                  <button
                    type="button"
                    class="text-neutral-600 hover:underline"
                    @click="toggleAtiva(conta)"
                  >
                    {{ conta.ativo ? 'Desativar' : 'Ativar' }}
                  </button>
                </td>
              </tr>
              <tr v-if="contaSelecionada === conta.id">
                <td colspan="7" class="px-4 py-4 bg-neutral-50">
                  <p v-if="usuariosLoading" class="text-sm text-neutral-500">Carregando usuários...</p>
                  <ul v-else class="space-y-2">
                    <li
                      v-for="u in usuariosConta"
                      :key="u.id"
                      class="flex flex-wrap gap-2 text-sm text-neutral-700"
                    >
                      <span class="font-medium">{{ u.nome }}</span>
                      <span class="text-neutral-400">·</span>
                      <span>{{ u.cargo }}</span>
                      <span v-if="u.isSuperAdmin" class="text-amber-700 text-xs font-semibold"
                        >Super Admin</span
                      >
                      <span class="text-neutral-400">·</span>
                      <span>{{ u.ativo ? 'Ativo' : 'Inativo' }}</span>
                    </li>
                    <li v-if="usuariosConta.length === 0" class="text-neutral-500">
                      Nenhum usuário nesta conta.
                    </li>
                  </ul>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
        <p v-if="!loading && contas.length === 0" class="p-6 text-sm text-neutral-500">
          Nenhuma conta cadastrada.
        </p>
      </div>
    </section>
  </main>
</template>
