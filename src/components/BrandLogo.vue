<script setup lang="ts">
import logoIcon from '../assets/brand/logo-icon.png'
import logoFull from '../assets/brand/logo-full.png'

interface Props {
  variant?: 'icon' | 'full'
  alt?: string
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'icon',
  alt: 'Aprisco',
  class: 'inline-block h-8 w-auto'
})

const src = props.variant === 'full' ? logoFull : logoIcon
</script>

<template>
  <img :src="src" :alt="props.alt" :class="props.class" />
</template>

