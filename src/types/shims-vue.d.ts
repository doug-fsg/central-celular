// Declarações de tipo para o Vue e outros módulos

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'vue' {
  export * from '@vue/runtime-dom'
}

declare module 'vue-router' {
  export * from 'vue-router/dist/vue-router'
  
  // Adicionar explicitamente a declaração do useRouter
  import { RouteLocationNormalizedLoaded, Router } from 'vue-router/dist/vue-router'
  import { Ref } from 'vue'
  
  export function useRouter(): Router
  export function useRoute(): RouteLocationNormalizedLoaded
}

declare module 'confetti-js' {
  export interface ConfettiSettings {
    target?: string;
    max?: number;
    size?: number;
    animate?: boolean;
    respawn?: boolean;
    width?: number;
    height?: number;
    clock?: number;
    start_from_edge?: boolean;
    [key: string]: any;
  }

  export default class ConfettiGenerator {
    constructor(settings: ConfettiSettings);
    render(): void;
    clear(): void;
  }
} 