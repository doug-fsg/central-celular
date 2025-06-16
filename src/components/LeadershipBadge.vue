<script setup lang="ts">
import { useLeaderStore } from '../stores/leaderStore'
import ConfettiGenerator from 'confetti-js'
import { onMounted, computed, ref } from 'vue'
import AppIcon from './AppIcon.vue'

const leaderStore = useLeaderStore()
const showBadge = ref(true)
const showDetails = ref(false)

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

function toggleDetails() {
  showDetails.value = !showDetails.value
}
</script>

<template>
  <div v-if="showBadge" class="relative">
    <canvas id="leader-badge-confetti" class="absolute top-0 left-0 w-full h-full pointer-events-none"></canvas>
    
    <!-- Versão compacta -->
    <div v-if="!showDetails" @click="toggleDetails" class="cursor-pointer bg-amber-50 rounded-full p-1.5 border border-amber-100 shadow-sm flex items-center">
      <div class="text-base mr-1">
        {{ leaderStore.isStarLeader ? '🌟' : badgeInfo?.icon || '👋' }}
      </div>
      <div v-if="badgeInfo?.name" class="text-xs font-medium text-amber-800 mr-1">
        {{ badgeInfo.name }}
      </div>
      <AppIcon name="chevron-down" size="xs" class="text-amber-400" />
    </div>
    
    <!-- Versão expandida com detalhes -->
    <div v-else class="bg-amber-50 rounded-lg p-2 border border-amber-100 shadow-sm">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <div class="mr-2 text-base">
            {{ leaderStore.isStarLeader ? '🌟' : '👋' }}
          </div>
          <div>
            <h3 class="text-xs font-medium text-amber-800">
              {{ leaderStore.isStarLeader ? 'Líder Destaque' : 'Olá, Líder!' }}
            </h3>
            <p v-if="badgeInfo?.nextLevel" class="text-xs text-amber-600/60">
              {{ badgeInfo.nextLevel }}
            </p>
          </div>
        </div>
        
        <div class="flex items-center">
          <div v-if="badgeInfo?.icon" class="flex items-center mr-2">
            <span class="text-base">{{ badgeInfo.icon }}</span>
          </div>
          
          <div v-else-if="leaderStore.currentMonthRank <= 3" class="text-base mr-2">
            {{ leaderStore.currentMonthRank === 1 ? '🥇' : leaderStore.currentMonthRank === 2 ? '🥈' : '🥉' }}
          </div>
          
          <button @click="toggleDetails" class="text-amber-400 hover:text-amber-500 p-1">
            <AppIcon name="chevron-up" size="xs" />
          </button>
          
          <button @click="closeBadge" class="text-amber-400 hover:text-amber-500 p-1">
            <AppIcon name="close" size="xs" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>