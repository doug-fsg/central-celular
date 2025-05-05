declare module 'confetti-js' {
  export interface ConfettiSettings {
    target?: string;
    max?: number;
    size?: number;
    animate?: boolean;
    respawn?: boolean;
    props?: string[] | {type: string, color: string, size: number}[];
    colors?: string[][];
    clock?: number;
    interval?: number;
    rotate?: boolean;
    start_from_edge?: boolean;
    width?: number;
    height?: number;
    origin?: {x: number, y: number};
  }

  export default class ConfettiGenerator {
    constructor(settings: ConfettiSettings);
    render(): void;
    clear(): void;
  }
} 