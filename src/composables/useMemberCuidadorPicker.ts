import { computed } from 'vue'
import { useRedeCuidadoStore } from '../stores/redeCuidadoStore'

export type CuidadorOption = {
  key: string
  nome: string
  tipo: 'lider' | 'consolidador'
}

/**
 * Picker compartilhado de cuidador para um membro.
 * A `key` do select é `'lider'` para o líder da célula ou o `cuidadorId` do consolidador.
 * Chama `atribuir` / `remover` da store — sem UI própria.
 */
export function useMemberCuidadorPicker() {
  const redeCuidadoStore = useRedeCuidadoStore()

  const opcoes = computed<CuidadorOption[]>(() => {
    const rede = redeCuidadoStore.rede
    if (!rede) return []

    const list: CuidadorOption[] = [
      {
        key: 'lider',
        nome: `${rede.lider.nome} (líder)`,
        tipo: 'lider',
      },
    ]

    for (const c of rede.cuidadores) {
      if (c.tipo === 'consolidador') {
        list.push({
          key: String(c.cuidadorId),
          nome: c.nome,
          tipo: 'consolidador',
        })
      }
    }

    return list
  })

  function cuidadorAtualKey(membroId: number): string {
    const rede = redeCuidadoStore.rede
    if (!rede) return ''
    for (const c of rede.cuidadores) {
      if (c.cuidados.some((m) => m.membroId === membroId)) {
        return c.tipo === 'lider' ? 'lider' : String(c.cuidadorId)
      }
    }
    return ''
  }

  function cuidadorAtualNome(membroId: number): string | null {
    const rede = redeCuidadoStore.rede
    if (!rede) return null
    for (const c of rede.cuidadores) {
      if (c.cuidados.some((m) => m.membroId === membroId)) {
        return c.nome
      }
    }
    return null
  }

  async function atribuir(membroId: number, key: string) {
    const rede = redeCuidadoStore.rede
    if (!rede) return
    const isLider = key === 'lider'
    await redeCuidadoStore.atribuir({
      membroId,
      consolidadorId: isLider ? null : Number(key),
      liderId: isLider ? rede.lider.id : null,
    })
  }

  async function remover(membroId: number) {
    await redeCuidadoStore.remover(membroId)
  }

  return {
    opcoes,
    cuidadorAtualKey,
    cuidadorAtualNome,
    atribuir,
    remover,
    salvando: computed(() => redeCuidadoStore.salvando),
  }
}
