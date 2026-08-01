<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { resolveAvatarUrl } from '../services/avatarService'

type Size = 'sm' | 'md' | 'lg' | 'xl'

const props = withDefaults(
  defineProps<{
    name?: string | null
    avatarUrl?: string | null
    size?: Size
    ring?: boolean
  }>(),
  { size: 'md', ring: false }
)

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'size-8 text-xs'
    case 'lg':
      return 'size-16 text-xl'
    case 'xl':
      return 'size-20 text-2xl'
    case 'md':
    default:
      return 'size-11 text-sm'
  }
})

const initials = computed(() => {
  const name = (props.name ?? '').trim()
  if (!name) return '?'
  const parts = name.split(/\s+/).filter(Boolean)
  const first = parts[0]?.charAt(0) ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  return (first + last).toUpperCase() || first.toUpperCase()
})

const resolvedUrl = computed(() => resolveAvatarUrl(props.avatarUrl))

const failed = ref(false)
watch(resolvedUrl, () => {
  failed.value = false
})
</script>

<template>
  <div
    class="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-primary-800 font-semibold select-none"
    :class="[sizeClass, ring ? 'ring-2 ring-white shadow-sm' : '']"
  >
    <img
      v-if="resolvedUrl && !failed"
      :src="resolvedUrl"
      alt=""
      class="h-full w-full object-cover"
      loading="lazy"
      @error="failed = true"
    />
    <span v-else aria-hidden="true">{{ initials }}</span>
  </div>
</template>
