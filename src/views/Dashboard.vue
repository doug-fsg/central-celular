<script setup lang="ts">
import LeaderDashboard from '../components/leader/LeaderDashboard.vue'
import { usePlatform } from '../composables/usePlatform'

const { mobileShell } = usePlatform()
</script>

<template>
  <div
    class="min-h-screen bg-neutral-50"
    :class="{ 'mobile-page': mobileShell }"
  >
    <main
      class="container-layout"
      :class="{ 'mobile-page__content': mobileShell }"
    >
      <LeaderDashboard />
    </main>
  </div>
</template>
