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
  const totalMembers = total
  
  return [
    {
      title: 'Culto',
      value: worship,
      percentage: Math.round((worship / totalMembers) * 100) || 0,
      color: 'primary',
      icon: 'fire' as IconName
    },
    {
      title: 'Célula',
      value: cell,
      percentage: Math.round((cell / totalMembers) * 100) || 0,
      color: 'secondary',
      icon: 'heart' as IconName
    },
    {
      title: 'Ambos',
      value: both,
      percentage: Math.round((both / totalMembers) * 100) || 0,
      color: 'accent',
      icon: 'star' as IconName
    },
    {
      title: 'Membros',
      value: totalMembers,
      type: 'total',
      color: 'neutral',
      icon: 'users' as IconName
    }
  ]
})
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
    <div 
      v-for="stat in stats" 
      :key="stat.title" 
      class="card p-3 flex items-center"
    >
      <div class="flex items-center justify-center w-8 h-8 rounded-full mr-3"
           :class="`bg-${stat.color}-50`">
        <AppIcon :name="stat.icon" :class="`text-${stat.color}-500`" size="sm" />
      </div>
      
      <div>
        <p class="text-xs text-neutral-500">{{ stat.title }}</p>
        <div class="flex items-center">
          <p class="text-lg font-semibold text-neutral-800">{{ stat.value }}</p>
          <span 
            v-if="stat.percentage !== undefined" 
            class="text-xs ml-2 font-medium"
            :class="`text-${stat.color}-600`"
          >
            {{ stat.percentage }}%
          </span>
        </div>
      </div>
    </div>
  </div>
</template>