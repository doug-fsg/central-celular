<template>
  <!-- No changes to template section -->
</template>

<script setup>
import { useMemberStore } from '../stores/member'
import { computed } from 'vue'

const memberStore = useMemberStore()

// Usar apenas membros ativos
const activeMembers = computed(() => memberStore.getActiveMembers)
</script>

<style>
  /* No changes to style section */
</style> 