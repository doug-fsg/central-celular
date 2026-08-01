<script setup lang="ts">
import { computed } from 'vue'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from '@headlessui/vue'
import AppIcon, { type IconName } from './AppIcon.vue'
import ProfileAvatar from './ProfileAvatar.vue'
import { useUserStore } from '../stores/userStore'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  navigate: [routeName: string]
  toggleView: []
  logout: []
}>()

const userStore = useUserStore()

const cargoLabel = computed(() => {
  const cargo = userStore.user?.cargo?.toUpperCase()
  switch (cargo) {
    case 'ADMINISTRADOR':
      return 'Administrador'
    case 'PASTOR':
      return 'Pastor'
    case 'SUPERVISOR':
      return 'Supervisor'
    case 'LIDER':
      return 'Líder'
    case 'LIDER_EM_TREINAMENTO':
      return 'Líder em treinamento'
    default:
      return cargo ?? ''
  }
})

type MenuItem = {
  id: string
  label: string
  icon: IconName
  tone?: 'default' | 'primary' | 'violet' | 'danger'
  onClick: () => void
  visible?: boolean
}

const items = computed<MenuItem[]>(() => [
  {
    id: 'toggle-view',
    label:
      userStore.currentView === 'admin'
        ? 'Ir para visão de célula'
        : 'Ir para visão admin',
    icon: 'grid',
    tone: 'primary',
    onClick: () => emit('toggleView'),
    visible: userStore.canToggleView,
  },
  {
    id: 'super-admin',
    label: 'Super Admin',
    icon: 'star',
    tone: 'violet',
    onClick: () => emit('navigate', 'super-admin'),
    visible: userStore.isPlatformOwner,
  },
  {
    id: 'profile',
    label: 'Meu Perfil',
    icon: 'user',
    onClick: () => emit('navigate', 'profile'),
    visible: true,
  },
  {
    id: 'settings',
    label: 'Configurações',
    icon: 'settings',
    onClick: () => emit('navigate', 'configuracoes'),
    visible: true,
  },
  {
    id: 'logout',
    label: 'Sair',
    icon: 'logout',
    tone: 'danger',
    onClick: () => emit('logout'),
    visible: true,
  },
])

const visibleItems = computed(() => items.value.filter((i) => i.visible))

function toneClass(tone?: MenuItem['tone']) {
  switch (tone) {
    case 'primary':
      return 'text-primary-700'
    case 'violet':
      return 'text-violet-700'
    case 'danger':
      return 'text-red-600'
    default:
      return 'text-neutral-800'
  }
}
</script>

<template>
  <TransitionRoot appear :show="props.open" as="template">
    <Dialog as="div" class="relative z-[55]" @close="emit('close')">
      <TransitionChild
        as="template"
        enter="duration-200 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-150 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/40 backdrop-blur-[2px]" aria-hidden="true" />
      </TransitionChild>

      <div class="fixed inset-0 flex items-end justify-center">
        <TransitionChild
          as="template"
          enter="duration-250 ease-out"
          enter-from="opacity-0 translate-y-8"
          enter-to="opacity-100 translate-y-0"
          leave="duration-200 ease-in"
          leave-from="opacity-100 translate-y-0"
          leave-to="opacity-0 translate-y-8"
        >
          <DialogPanel class="bottom-sheet-panel w-full max-w-lg">
            <div class="bottom-sheet-handle" aria-hidden="true" />

            <DialogTitle as="div" class="mb-4 flex items-center gap-3 px-1">
              <ProfileAvatar
                :name="userStore.user?.nome"
                :avatar-url="userStore.user?.avatarUrl"
                size="lg"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-base font-semibold text-neutral-900">
                  {{ userStore.user?.nome ?? '—' }}
                </p>
                <p v-if="cargoLabel" class="mt-0.5 text-xs text-neutral-500">
                  {{ cargoLabel }}
                </p>
              </div>
            </DialogTitle>

            <ul class="space-y-1">
              <li v-for="item in visibleItems" :key="item.id">
                <button
                  type="button"
                  class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
                  style="min-height: 48px; touch-action: manipulation;"
                  :class="toneClass(item.tone)"
                  @click="item.onClick"
                >
                  <AppIcon :name="item.icon" size="md" />
                  <span class="font-medium">{{ item.label }}</span>
                </button>
              </li>
            </ul>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>
