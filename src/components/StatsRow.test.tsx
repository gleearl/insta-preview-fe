import { describe, expect, it } from 'vitest'
import { formatCount } from './StatsRow'

describe('formatCount', () => {
  it('groups thousands below ten thousand', () => {
    expect(formatCount(4321)).toBe('4,321')
    expect(formatCount(0)).toBe('0')
  })

  /* Instagram abbreviates above ten thousand, and the width of the row is
     part of what is being previewed. */
  it('abbreviates from ten thousand up', () => {
    expect(formatCount(12_400)).toBe('12.4K')
    expect(formatCount(12_000)).toBe('12K')
    expect(formatCount(340_000)).toBe('340K')
    expect(formatCount(1_200_000)).toBe('1.2M')
    expect(formatCount(2_000_000)).toBe('2M')
  })

  it('shows a dash for a count nobody has supplied', () => {
    expect(formatCount(null)).toBe('—')
  })
})
