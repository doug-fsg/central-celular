import { describe, expect, it } from 'vitest'
import {
  isMoreNavActive,
  splitBottomNavItems,
  type BottomNavItem,
} from '../../src/composables/useBottomNav'

const sample: BottomNavItem[] = [
  { name: 'a', label: 'A', icon: 'home' },
  { name: 'b', label: 'B', icon: 'users' },
  { name: 'c', label: 'C', icon: 'grid' },
  { name: 'd', label: 'D', icon: 'heart' },
  { name: 'e', label: 'E', icon: 'settings' },
]

describe('splitBottomNavItems', () => {
  it('keeps all items when overflow mode is off', () => {
    const { primary, more } = splitBottomNavItems(sample, { overflowMode: false })
    expect(primary).toHaveLength(5)
    expect(more).toHaveLength(0)
  })

  it('splits admin nav into 3 primary + rest in Mais', () => {
    const { primary, more } = splitBottomNavItems(sample, { overflowMode: true })
    expect(primary.map((i) => i.name)).toEqual(['a', 'b', 'c'])
    expect(more.map((i) => i.name)).toEqual(['d', 'e'])
  })

  it('does not split when items fit in primary limit', () => {
    const short = sample.slice(0, 3)
    const { primary, more } = splitBottomNavItems(short, { overflowMode: true })
    expect(primary).toHaveLength(3)
    expect(more).toHaveLength(0)
  })
})

describe('isMoreNavActive', () => {
  it('returns true when current route is in more items', () => {
    const more = [{ name: 'admin-members', label: 'Membros', icon: 'users' as const }]
    expect(isMoreNavActive(more, 'admin-members')).toBe(true)
    expect(isMoreNavActive(more, 'admin-dashboard')).toBe(false)
  })
})
