<script setup lang="ts">
import { computed } from 'vue'
import { useAttendanceStore } from '../stores/attendanceStore'
import { useMemberStore } from '../stores/memberStore'
import AppIcon from './AppIcon.vue'
import type { IconName } from './AppIcon.vue'

const attendanceStore = useAttendanceStore()
const memberStore = useMemberStore()

const stats = computed(() => {
  const { worship, cell, both, total } = attendanceStore.currentMonthStats
  const totalMembers = memberStore.getAllMembers.length
  
  return [
    {
      title: 'Presença no Culto',
      value: worship,
      percentage: Math.round((worship / totalMembers) * 100) || 0,
      color: 'primary',
      icon: 'fire' as IconName
    },
    {
      title: 'Presença na Célula',
      value: cell,
      percentage: Math.round((cell / totalMembers) * 100) || 0,
      color: 'secondary',
      icon: 'heart' as IconName
    },
    {
      title: 'Ambos (Culto e Célula)',
      value: both,
      percentage: Math.round((both / totalMembers) * 100) || 0,
      color: 'accent',
      icon: 'star' as IconName
    },
    {
      title: 'Membros Registrados',
      value: totalMembers,
      type: 'total',
      color: 'neutral',
      icon: 'users' as IconName
    }
  ]
})
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <div 
      v-for="stat in stats" 
      :key="stat.title" 
      class="card p-5"
      :class="{ 'border-l-4': true, [`border-${stat.color}-500`]: true }"
    >
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-lg font-medium text-neutral-900">{{ stat.title }}</h3>
        <AppIcon :name="stat.icon" :class="`text-${stat.color}-500`" size="md" />
      </div>
      
      <div class="mt-2 flex justify-between items-end">
        <p class="text-3xl font-bold text-neutral-900">{{ stat.value }}</p>
        <p 
          v-if="stat.percentage !== undefined" 
          class="text-sm font-medium rounded-full px-2.5 py-0.5"
          :class="`bg-${stat.color}-100 text-${stat.color}-800`"
        >
          {{ stat.percentage }}%
        </p>
      </div>
      
      <div v-if="stat.percentage !== undefined" class="mt-4 w-full bg-neutral-200 rounded-full h-2">
        <div 
          class="h-2 rounded-full"
          :style="{ width: `${stat.percentage}%` }"
          :class="`bg-${stat.color}-500`"
        ></div>
      </div>
    </div>
  </div>
</template>