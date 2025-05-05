<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Member } from '../stores/memberStore'
import type { AttendanceStatus } from '../stores/attendanceStore'
import { useAttendanceStore } from '../stores/attendanceStore'

const props = defineProps<{
  member: Member
  status?: AttendanceStatus
  observation?: string
  disabled?: boolean
}>()

const attendanceStore = useAttendanceStore()

const currentStatus = computed({
  get: () => props.status || 'none',
  set: (value) => {
    attendanceStore.setAttendanceStatus(props.member.id, value)
  }
})

const observation = ref(props.observation || '')

function updateObservation() {
  attendanceStore.setObservation(props.member.id, observation.value)
}

const statusOptions = [
  { value: 'none', label: 'Não compareceu', color: 'neutral' },
  { value: 'worship', label: 'Culto', color: 'primary' },
  { value: 'cell', label: 'Célula', color: 'secondary' },
  { value: 'both', label: 'Culto e Célula', color: 'accent' }
]

const badgeClasses = computed(() => {
  switch (currentStatus.value) {
    case 'worship':
      return 'badge badge-primary'
    case 'cell':
      return 'badge badge-secondary'
    case 'both':
      return 'badge badge-accent'
    default:
      return 'badge badge-neutral'
  }
})

const showObservationInput = ref(false)

function toggleObservationInput() {
  showObservationInput.value = !showObservationInput.value
}
</script>

<template>
  <div class="card mb-4 animate-fade-in">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex-1">
        <h3 class="text-lg font-medium text-neutral-800">{{ member.name }}</h3>
        <div class="flex flex-wrap gap-2 mt-2">
          <span 
            v-if="member.isConsolidator" 
            class="badge badge-primary"
          >
            Consolidador
          </span>
          <span 
            v-if="member.isCoLeader" 
            class="badge badge-secondary"
          >
            Co-Líder
          </span>
        </div>
      </div>
      
      <div class="flex items-center space-x-3">
        <span :class="badgeClasses">
          {{ statusOptions.find(opt => opt.value === currentStatus)?.label }}
        </span>
        
        <button 
          @click="toggleObservationInput"
          class="btn-icon"
          :title="observation ? 'Ver observação' : 'Adicionar observação'"
          :disabled="props.disabled"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    </div>
    
    <div class="mt-5">
      <div class="flex flex-wrap gap-2">
        <template v-for="option in statusOptions" :key="option.value">
          <button
            @click="currentStatus = option.value as AttendanceStatus"
            class="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ease-in-out"
            :class="[
              currentStatus === option.value
                ? `bg-${option.color}-500 text-white`
                : `bg-${option.color}-50 text-${option.color}-700 hover:bg-${option.color}-100`
            ]"
            :disabled="props.disabled"
          >
            <span v-if="currentStatus === option.value" class="mr-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            {{ option.label }}
          </button>
        </template>
      </div>
    </div>
    
    <!-- Observation input -->
    <div v-if="showObservationInput" class="mt-5 animate-slide-in">
      <label for="observation" class="form-label">Observação</label>
      <div class="flex">
        <input
          v-model="observation"
          type="text"
          id="observation"
          class="form-input flex-grow"
          placeholder="Adicione uma observação opcional"
          :disabled="props.disabled"
        />
        <button
          @click="updateObservation"
          class="ml-2 btn btn-primary"
          :disabled="props.disabled"
        >
          Salvar
        </button>
      </div>
      <p v-if="observation" class="mt-2 text-sm text-neutral-600">
        {{ observation }}
      </p>
    </div>
  </div>
</template>