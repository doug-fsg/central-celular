<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <header class="mobile-page-header">
    <div class="mobile-page-header__content">
      <h1 class="mobile-page-header__title">{{ title }}</h1>
      <p v-if="subtitle" class="mobile-page-header__subtitle">{{ subtitle }}</p>
    </div>
  </header>
</template>
