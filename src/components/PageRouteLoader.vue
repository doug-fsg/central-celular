<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useNavigationLoadingStore } from '../stores/navigationLoadingStore'
import BrandLogo from './BrandLogo.vue'

const store = useNavigationLoadingStore()
const { isLoading } = storeToRefs(store)

const reduceMotion = computed(
  () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
)
</script>

<template>
  <Teleport to="body">
    <Transition name="page-route-loader">
      <div
        v-if="isLoading"
        class="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-10 bg-gradient-to-b from-white via-vibrant-50/90 to-fun-50/80 px-6"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div class="flex flex-col items-center">
          <BrandLogo variant="full" class="h-11 w-auto hidden sm:block" />
          <BrandLogo variant="icon" class="h-10 w-auto sm:hidden" />
        </div>
        <div class="w-full max-w-[200px]">
          <div class="h-1 rounded-full bg-vibrant-100 overflow-hidden">
            <div
              class="page-route-loader-bar h-full rounded-full bg-gradient-to-r from-vibrant-500 via-accent-500 to-vibrant-600"
              :class="{ 'page-route-loader-bar--static': reduceMotion }"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.page-route-loader-bar {
  width: 35%;
  animation: page-route-loader-slide 1.15s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}

.page-route-loader-bar--static {
  animation: none;
  width: 100%;
  opacity: 0.55;
}

@keyframes page-route-loader-slide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(380%);
  }
}

.page-route-loader-enter-active {
  transition: opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.page-route-loader-enter-from {
  opacity: 0;
}

.page-route-loader-leave-active {
  transition: opacity 0.4s ease, transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}
.page-route-loader-leave-to {
  opacity: 0;
  transform: scale(1.02);
}
</style>
