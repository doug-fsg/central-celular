<script setup lang="ts">
import { useLeaderStore } from '../stores/leaderStore'
import ConfettiGenerator from 'confetti-js'
import { onMounted, computed, ref } from 'vue'
import AppIcon from './AppIcon.vue'

const leaderStore = useLeaderStore()
const showBadge = ref(true)

const badgeInfo = computed(() => {
  const consecutiveReports = leaderStore.stats.consecutiveOnTimeReports
  
  switch (leaderStore.leaderBadge) {
    case 'bronze':
      return {
        icon: '🥉',
        name: 'Bronze',
        nextLevel: `Faltam 2 meses para 🥈 Prata`
      }
    case 'silver':
      return {
        icon: '🥈',
        name: 'Prata',
        nextLevel: `Faltam 2 meses para 🥇 Ouro`
      }
    case 'gold':
      return {
        icon: '🥇',
        name: 'Ouro'
      }
    default:
      if (consecutiveReports > 0) {
        const monthsLeft = 2 - consecutiveReports
        return {
          nextLevel: `${monthsLeft > 1 ? 'Faltam' : 'Falta'} ${monthsLeft} ${monthsLeft > 1 ? 'meses' : 'mês'} para 🥉 Bronze`
        }
      }
      return null
  }
})

onMounted(() => {
  if (leaderStore.isStarLeader) {
    const confettiSettings = { target: 'leader-badge-confetti', max: 80, size: 1.5, animate: true }
    const confettiAnimation = new ConfettiGenerator(confettiSettings)
    confettiAnimation.render()
  }
})

function closeBadge() {
  showBadge.value = false
}
</script>

<template>
  <div v-if="showBadge" class="relative">
    <canvas id="leader-badge-confetti" class="absolute top-0 left-0 w-full h-full pointer-events-none"></canvas>
    
    <div class="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg p-3 border border-yellow-100 relative overflow-hidden shadow-sm z-10">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <div class="mr-2 text-base">
            {{ leaderStore.isStarLeader ? '🌟' : '👋' }}
          </div>
          <div>
            <h3 class="text-sm font-medium text-yellow-800">
              {{ leaderStore.isStarLeader ? 'Líder Destaque' : 'Olá, Líder!' }}
            </h3>
            <p v-if="badgeInfo?.nextLevel" class="text-xs text-yellow-600/60">
              {{ badgeInfo.nextLevel }}
            </p>
          </div>
        </div>
        
        <div class="flex items-center">
          <div v-if="badgeInfo?.icon" class="flex items-center mr-3">
            <span class="text-lg">{{ badgeInfo.icon }}</span>
            <span class="ml-1 text-xs font-medium text-yellow-700">
              {{ badgeInfo.name }}
            </span>
          </div>
          
          <div v-else-if="leaderStore.currentMonthRank <= 3" class="text-lg mr-3">
            {{ leaderStore.currentMonthRank === 1 ? '🥇' : leaderStore.currentMonthRank === 2 ? '🥈' : '🥉' }}
          </div>
          
          <button @click="closeBadge" class="text-amber-400 hover:text-amber-500 p-1 ml-1">
            <AppIcon name="close" size="sm" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>