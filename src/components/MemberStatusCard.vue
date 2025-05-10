<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Member } from '../stores/memberStore'
import type { AttendanceStatus } from '../stores/attendanceStore'
import { useAttendanceStore } from '../stores/attendanceStore'
import PresenceButton from './PresenceButton.vue'

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

const isCultoActive = computed(() => {
  return currentStatus.value === 'worship' || currentStatus.value === 'both'
})

const isCelulaActive = computed(() => {
  return currentStatus.value === 'cell' || currentStatus.value === 'both'
})

const statusText = computed(() => {
  if (currentStatus.value === 'both') return 'Presente em ambos'
  if (currentStatus.value === 'worship') return 'Presente no Culto'
  if (currentStatus.value === 'cell') return 'Presente na Célula'
  return ''
})

const statusClass = computed(() => {
  const baseClasses = 'px-2.5 py-1 rounded-md text-sm font-medium'
  if (currentStatus.value === 'both') return `${baseClasses} bg-green-50 text-green-700`
  if (currentStatus.value === 'worship') return `${baseClasses} bg-blue-50 text-blue-700`
  if (currentStatus.value === 'cell') return `${baseClasses} bg-purple-50 text-purple-700`
  return ''
})

function toggleCulto() {
  if (props.disabled) return
  
  if (isCultoActive.value) {
    if (isCelulaActive.value) {
      currentStatus.value = 'cell'
    } else {
      currentStatus.value = 'none'
    }
  } else {
    if (isCelulaActive.value) {
      currentStatus.value = 'both'
    } else {
      currentStatus.value = 'worship'
    }
  }
}

function toggleCelula() {
  if (props.disabled) return
  
  if (isCelulaActive.value) {
    if (isCultoActive.value) {
      currentStatus.value = 'worship'
    } else {
      currentStatus.value = 'none'
    }
  } else {
    if (isCultoActive.value) {
      currentStatus.value = 'both'
    } else {
      currentStatus.value = 'cell'
    }
  }
}

const showObservationInput = ref(false)

function toggleObservationInput() {
  showObservationInput.value = !showObservationInput.value
}
</script>

<template>
  <div class="bg-white p-4 rounded-lg shadow-sm">
    <div class="flex flex-col gap-3">
      <!-- Nome, status e ações -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <h3 class="text-base font-medium text-gray-900">
            {{ member.name }}
          </h3>
          <div v-if="member.isConsolidator" class="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
            Consolidador
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <!-- Status indicator -->
          <div v-if="statusText" :class="statusClass">
            {{ statusText }}
          </div>
          
          <!-- Observation button -->
          <button
            type="button"
            @click="toggleObservationInput"
            class="text-gray-400 hover:text-gray-600"
            :class="{ 'text-blue-500 hover:text-blue-600': observation }"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Botões de presença -->
      <div class="flex gap-2">
        <PresenceButton
          type="culto"
          :active="isCultoActive"
          :disabled="disabled"
          @click="toggleCulto"
        />
        <PresenceButton
          type="celula"
          :active="isCelulaActive"
          :disabled="disabled"
          @click="toggleCelula"
        />
      </div>

      <!-- Observações -->
      <div v-if="showObservationInput" class="mt-1">
        <textarea
          v-model="observation"
          @blur="updateObservation"
          rows="2"
          class="w-full rounded-md border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          :placeholder="'Adicione observações sobre ' + member.name"
          :disabled="disabled"
        ></textarea>
      </div>
    </div>
  </div>
</template>