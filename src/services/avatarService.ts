import api from './api'
import { resolveApiBase } from './resolveApiBase'

export interface AvatarResponse {
  id: number
  avatarUrl: string | null
}

/**
 * Retorna a URL absoluta do avatar. Se o backend devolveu um caminho relativo (ex.: `/uploads/avatars/x.jpg`),
 * prefixa com a origem da API (sem o `/api` final) para o navegador conseguir buscar o arquivo estático.
 */
export function resolveAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url
  const apiBase = resolveApiBase()
  const origin = apiBase.replace(/\/api\/?$/, '')
  const normalized = url.startsWith('/') ? url : `/${url}`
  return `${origin}${normalized}`
}

const avatarService = {
  async upload(payload: { imageData: string; mimeType?: string }): Promise<AvatarResponse> {
    return api.post('/usuarios/me/avatar', payload) as Promise<AvatarResponse>
  },

  async remover(): Promise<{ success: boolean; avatarUrl: null }> {
    return api.delete('/usuarios/me/avatar') as Promise<{ success: boolean; avatarUrl: null }>
  },
}

export default avatarService
