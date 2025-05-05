import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface LeaderAchievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt: Date
}

export interface LeaderStats {
  reportsSubmitted: number
  onTimeSubmissions: number
  consecutiveOnTimeReports: number
  memberGrowth: number
  consolidationRate: number
  lastMonthRank: number
  achievements: LeaderAchievement[]
}

export type BadgeType = 'none' | 'bronze' | 'silver' | 'gold'

export const useLeaderStore = defineStore('leader', () => {
  const stats = ref<LeaderStats>({
    reportsSubmitted: 12,
    onTimeSubmissions: 11,
    consecutiveOnTimeReports: 4,
    memberGrowth: 5,
    consolidationRate: 85,
    lastMonthRank: 2,
    achievements: [
      {
        id: '1',
        title: '🏆 Líder Destaque',
        description: 'Maior crescimento em Abril 2024',
        icon: '🌟',
        unlockedAt: new Date(2024, 3, 30)
      }
    ]
  })

  const currentMonthRank = ref(1)

  const formattedLastAchievementDate = computed(() => {
    const lastAchievement = stats.value.achievements[stats.value.achievements.length - 1]
    if (lastAchievement) {
      return format(lastAchievement.unlockedAt, "MMMM 'de' yyyy", { locale: ptBR })
    }
    return ''
  })

  const isStarLeader = computed(() => stats.value.onTimeSubmissions >= 11)
  
  const leaderBadge = computed((): BadgeType => {
    const consecutiveReports = stats.value.consecutiveOnTimeReports
    
    if (consecutiveReports >= 6) return 'gold'
    if (consecutiveReports >= 4) return 'silver'
    if (consecutiveReports >= 2) return 'bronze'
    return 'none'
  })

  function addAchievement(achievement: Omit<LeaderAchievement, 'id' | 'unlockedAt'>) {
    const newAchievement: LeaderAchievement = {
      ...achievement,
      id: Date.now().toString(),
      unlockedAt: new Date()
    }
    stats.value.achievements.push(newAchievement)
  }
  
  function reportSubmitted(onTime: boolean) {
    stats.value.reportsSubmitted++
    
    if (onTime) {
      stats.value.onTimeSubmissions++
      stats.value.consecutiveOnTimeReports++
    } else {
      // Se atrasou, reinicia a contagem de relatórios consecutivos no prazo
      stats.value.consecutiveOnTimeReports = 0
    }
  }

  return {
    stats,
    currentMonthRank,
    formattedLastAchievementDate,
    isStarLeader,
    leaderBadge,
    addAchievement,
    reportSubmitted
  }
})