<script setup lang="ts">
import { cargoLabel, platformLabel } from '../../../constants/adminPush'
import type { PushSubscriber } from '../../../services/adminService'

defineProps<{
  subscribers: PushSubscriber[]
}>()

const emit = defineEmits<{
  send: [subscriber: PushSubscriber]
}>()

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function devicesLabel(count: number): string {
  return count === 1 ? '1 dispositivo' : `${count} dispositivos`
}
</script>

<template>
  <div class="overflow-hidden bg-white shadow sm:rounded-lg">
    <div class="space-y-2.5 p-3 sm:hidden">
      <article
        v-for="subscriber in subscribers"
        :key="subscriber.userId"
        class="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm"
      >
        <div class="mb-2 flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-gray-900">{{ subscriber.nome }}</p>
            <p class="text-xs text-gray-500">{{ cargoLabel(subscriber.cargo) }}</p>
          </div>
          <span class="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
            Notificações ativas
          </span>
        </div>

        <div class="mb-3 flex flex-wrap gap-1.5">
          <span
            v-for="platform in subscriber.platforms"
            :key="platform"
            class="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700"
          >
            {{ platformLabel(platform) }}
          </span>
          <span class="text-[11px] text-gray-500">{{ devicesLabel(subscriber.deviceCount) }}</span>
        </div>

        <p class="mb-3 text-xs text-gray-500">
          Atualizado em {{ formatUpdatedAt(subscriber.updatedAt) }}
        </p>

        <button
          type="button"
          class="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-primary-600 px-3 text-sm font-semibold text-white touch-manipulation hover:bg-primary-700"
          @click="emit('send', subscriber)"
        >
          Enviar notificação
        </button>
      </article>
    </div>

    <div class="hidden overflow-x-auto sm:block">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Nome
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Cargo
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Plataformas
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Dispositivos
            </th>
            <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Atualizado
            </th>
            <th scope="col" class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Ações
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white">
          <tr v-for="subscriber in subscribers" :key="subscriber.userId">
            <td class="whitespace-nowrap px-6 py-4">
              <div class="text-sm font-medium text-gray-900">{{ subscriber.nome }}</div>
              <div class="text-xs text-emerald-700">Notificações ativas</div>
            </td>
            <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
              {{ cargoLabel(subscriber.cargo) }}
            </td>
            <td class="px-6 py-4">
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="platform in subscriber.platforms"
                  :key="platform"
                  class="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700"
                >
                  {{ platformLabel(platform) }}
                </span>
              </div>
            </td>
            <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
              {{ subscriber.deviceCount }}
            </td>
            <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
              {{ formatUpdatedAt(subscriber.updatedAt) }}
            </td>
            <td class="whitespace-nowrap px-6 py-4 text-right">
              <button
                type="button"
                class="inline-flex min-h-[40px] items-center rounded-lg bg-primary-600 px-3 text-sm font-medium text-white hover:bg-primary-700"
                @click="emit('send', subscriber)"
              >
                Enviar notificação
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
