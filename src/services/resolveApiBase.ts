export type ResolveApiBaseInput = {
  apiUrl?: string
  isCapacitor?: boolean
  windowOrigin?: string
  hostname?: string
}

function inferSameOriginApi(origin: string): string {
  return `${origin}/api`
}

/**
 * Resolve a URL base da API conforme ambiente (web, PWA, Capacitor).
 * Função pura — parâmetros opcionais para testes; omitidos usa import.meta.env + window.
 */
export function resolveApiBase(input: ResolveApiBaseInput = {}): string {
  const fromEnv =
    'apiUrl' in input
      ? input.apiUrl
      : (import.meta.env.VITE_API_URL as string | undefined)
  const isCapacitor =
    input.isCapacitor ?? import.meta.env.VITE_CAPACITOR === 'true'

  if (isCapacitor && fromEnv) {
    return fromEnv.endsWith('/api')
      ? fromEnv
      : `${fromEnv.replace(/\/$/, '')}/api`
  }

  const hasWindow = typeof window !== 'undefined'
  const origin = input.windowOrigin ?? (hasWindow ? window.location.origin : undefined)
  const hostname = input.hostname ?? (hasWindow ? window.location.hostname : undefined)

  if (fromEnv && /localhost|127\.0\.0\.1/i.test(fromEnv) && hostname) {
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && origin) {
      return inferSameOriginApi(origin)
    }
  }

  if (fromEnv) {
    return fromEnv.endsWith('/api')
      ? fromEnv
      : `${fromEnv.replace(/\/$/, '')}/api`
  }

  if (origin) {
    return inferSameOriginApi(origin)
  }

  return 'http://localhost:3000/api'
}
